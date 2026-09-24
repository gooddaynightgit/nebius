import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocument } from "./dynamo";

/**
 * Moment balances live in DynamoDB table `goodfans` (partition key `order`).
 * `order` is the normalized buyer email — ITN, “Already bought?”, and photo
 * upload all know the email and not a separate fan id. `game` is remaining
 * moment saves. This table is never `sleepcoachfans`.
 *
 * Blob/S3 entitlement JSON is not read or written.
 */
export const DEFAULT_FANS_TABLE = "goodfans";
const FORBIDDEN_FANS_TABLE = "sleepcoachfans";

export type FanCredit = {
  order: string;
  pfPaymentId: string;
  amountGross: string;
  moments: number;
  emailVaultId: string;
  source: string;
  now: string;
};

export type FanRow = {
  order: string;
  game: number;
  paymentIds: string[];
  emailVaultId: string;
  source: string;
  amountGross: string;
  pfPaymentId: string;
  issued: string;
  created: string;
  updatedAt: string;
};

export interface FansTable {
  get(order: string): Promise<FanRow | null>;
  /** Add `moments` once per Payfast payment id. A repeat id does not add again. */
  credit(input: FanCredit): Promise<{ game: number; duplicate: boolean }>;
  /** Row that already lists this Payfast id, if one exists. */
  findPayment(pfPaymentId: string): Promise<FanRow | null>;
  /** Subtract 1 only while `game` > 0. Returns the new balance, or null if blocked. */
  consume(order: string, now: string): Promise<number | null>;
  /** Put one moment back when a save fails after a successful consume. */
  restore(order: string, now: string): Promise<void>;
}

type FansCommandOutput = {
  Item?: Record<string, unknown>;
  Items?: Record<string, unknown>[];
  Attributes?: Record<string, unknown>;
  LastEvaluatedKey?: Record<string, unknown>;
};

type FansDoc = {
  send: (command: GetCommand | UpdateCommand | ScanCommand) => Promise<FansCommandOutput>;
};

export function fansTableName(): string {
  const raw = process.env.FANS_TABLE?.trim();
  const name = raw || DEFAULT_FANS_TABLE;
  if (name.toLowerCase() === FORBIDDEN_FANS_TABLE) {
    throw new Error("Refusing to store GoodDayNight moments in sleepcoachfans.");
  }
  return name;
}

let override: FansTable | null = null;

/** Tests install an in-memory table. Production leaves this unset. */
export function useFansTable(table: FansTable | null): void {
  override = table;
}

export function activeFansTable(): FansTable {
  if (override) return override;
  return new DynamoFansTable(dynamoDocument(), fansTableName());
}

export class DynamoFansTable implements FansTable {
  constructor(
    private readonly doc: FansDoc,
    private readonly tableName: string,
  ) {}

  async get(order: string): Promise<FanRow | null> {
    const out = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { order },
        ConsistentRead: true,
      }),
    );
    if (!out.Item) return null;
    return normalizeFan(out.Item);
  }

  async credit(input: FanCredit): Promise<{ game: number; duplicate: boolean }> {
    const existing = await this.get(input.order);
    if (existing?.paymentIds.includes(input.pfPaymentId)) {
      return { game: existing.game, duplicate: true };
    }
    try {
      const out = await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { order: input.order },
          UpdateExpression:
            "ADD game :moments, paymentIds :pid SET #source = :source, emailVaultId = :vault, amountGross = :amount, pfPaymentId = :payment, updatedAt = :now, issued = if_not_exists(issued, :now), created = if_not_exists(created, :now)",
          ConditionExpression:
            "attribute_not_exists(paymentIds) OR NOT contains(paymentIds, :payment)",
          ExpressionAttributeNames: { "#source": "source" },
          ExpressionAttributeValues: {
            ":moments": input.moments,
            ":pid": new Set([input.pfPaymentId]),
            ":source": input.source,
            ":vault": input.emailVaultId,
            ":amount": input.amountGross,
            ":payment": input.pfPaymentId,
            ":now": input.now,
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return { game: numberAttr(out.Attributes?.game), duplicate: false };
    } catch (error) {
      if (!isConditional(error)) throw error;
      const current = await this.get(input.order);
      if (current?.paymentIds.includes(input.pfPaymentId)) {
        return { game: current.game, duplicate: true };
      }
      throw error;
    }
  }

  async findPayment(pfPaymentId: string): Promise<FanRow | null> {
    let startKey: Record<string, unknown> | undefined;
    do {
      const out = await this.doc.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "contains(paymentIds, :payment)",
          ExpressionAttributeValues: { ":payment": pfPaymentId },
          ExclusiveStartKey: startKey,
          ConsistentRead: true,
        }),
      );
      const hit = out.Items?.find((item) => paymentIdList(item.paymentIds).includes(pfPaymentId));
      if (hit) return normalizeFan(hit);
      startKey = out.LastEvaluatedKey;
    } while (startKey);
    return null;
  }

  async consume(order: string, now: string): Promise<number | null> {
    try {
      const out = await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { order },
          UpdateExpression: "ADD game :neg SET updatedAt = :now",
          ConditionExpression: "game > :zero",
          ExpressionAttributeValues: {
            ":neg": -1,
            ":zero": 0,
            ":now": now,
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return numberAttr(out.Attributes?.game);
    } catch (error) {
      if (isConditional(error)) return null;
      throw error;
    }
  }

  async restore(order: string, now: string): Promise<void> {
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { order },
          UpdateExpression: "ADD game :one SET updatedAt = :now",
          ConditionExpression: "attribute_exists(#order)",
          ExpressionAttributeNames: { "#order": "order" },
          ExpressionAttributeValues: {
            ":one": 1,
            ":now": now,
          },
        }),
      );
    } catch (error) {
      if (isConditional(error)) return;
      throw error;
    }
  }
}

type MemoryFan = FanRow & { paymentIds: string[] };

export class MemoryFansTable implements FansTable {
  readonly rows = new Map<string, MemoryFan>();

  async get(order: string): Promise<FanRow | null> {
    const row = this.rows.get(order);
    return row ? copyFan(row) : null;
  }

  async credit(input: FanCredit): Promise<{ game: number; duplicate: boolean }> {
    const current = this.rows.get(input.order);
    if (current?.paymentIds.includes(input.pfPaymentId)) {
      return { game: current.game, duplicate: true };
    }
    const paymentIds = current ? [...current.paymentIds, input.pfPaymentId] : [input.pfPaymentId];
    const next: MemoryFan = {
      order: input.order,
      game: (current?.game ?? 0) + input.moments,
      paymentIds,
      emailVaultId: input.emailVaultId,
      source: input.source,
      amountGross: input.amountGross,
      pfPaymentId: input.pfPaymentId,
      issued: current?.issued || input.now,
      created: current?.created || input.now,
      updatedAt: input.now,
    };
    this.rows.set(input.order, next);
    return { game: next.game, duplicate: false };
  }

  async findPayment(pfPaymentId: string): Promise<FanRow | null> {
    for (const row of this.rows.values()) {
      if (row.paymentIds.includes(pfPaymentId)) return copyFan(row);
    }
    return null;
  }

  async consume(order: string, now: string): Promise<number | null> {
    const row = this.rows.get(order);
    if (!row || row.game <= 0) return null;
    row.game -= 1;
    row.updatedAt = now;
    return row.game;
  }

  async restore(order: string, now: string): Promise<void> {
    const row = this.rows.get(order);
    if (!row) return;
    row.game += 1;
    row.updatedAt = now;
  }
}

function copyFan(row: MemoryFan): FanRow {
  return { ...row, paymentIds: [...row.paymentIds] };
}

function normalizeFan(item: Record<string, unknown>): FanRow {
  return {
    order: String(item.order ?? ""),
    game: numberAttr(item.game ?? 0),
    paymentIds: paymentIdList(item.paymentIds),
    emailVaultId: String(item.emailVaultId ?? ""),
    source: String(item.source ?? ""),
    amountGross: String(item.amountGross ?? ""),
    pfPaymentId: String(item.pfPaymentId ?? ""),
    issued: String(item.issued ?? ""),
    created: String(item.created ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
  };
}

function paymentIdList(value: unknown): string[] {
  if (value instanceof Set) return idsFrom(value.values());
  if (Array.isArray(value)) return idsFrom(value);
  // A hand-edited row may store one Payfast id as a plain string.
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function idsFrom(values: Iterable<unknown>): string[] {
  return [...values].map((id) => String(id).trim()).filter(Boolean).sort();
}

function numberAttr(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error("goodfans game balance is missing");
  return n;
}

function isConditional(error: unknown): boolean {
  return (
    error instanceof ConditionalCheckFailedException ||
    (error instanceof Error && error.name === "ConditionalCheckFailedException")
  );
}
