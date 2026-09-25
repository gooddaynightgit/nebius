import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { normalizeEmail } from "./identity";
import { authTableName, dynamoDocument } from "./dynamo";

/** Code lives for 10 minutes. DynamoDB TTL on expiresAt is cleanup, not the check. */
export const CODE_TTL_SECONDS = 600;
/** At most this many codes in the rolling window. */
export const ISSUE_WINDOW_SECONDS = 300;
export const MAX_ISSUES = 3;
export const MAX_VERIFY_ATTEMPTS = 5;

export const REQUEST_SENT = "If that address can receive mail, a code is on the way.";
export const REQUEST_WAIT = "Try again in a few minutes.";
export const REQUEST_UNAVAILABLE = "We couldn’t send a code right now.";
export const VERIFY_FAIL = "That code didn’t work. Request a new one.";

export type OtpRecord = {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
  issues: number[];
};

export interface OtpTable {
  get(email: string): Promise<OtpRecord | null>;
  /** Write only when the previous issues list matches. null means the row must be absent. */
  putIfIssues(record: OtpRecord, expectedIssues: number[] | null): Promise<boolean>;
  /** Increment attempts only while the code is still live. Returns the row after the burn. */
  burnAttempt(email: string, now: number): Promise<OtpRecord | null>;
  markUsed(email: string, codeHash: string, now: number): Promise<boolean>;
}

export function unixNow(date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

/** SHA-256 of the normalized email and the code. The table never stores the code. */
export function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${normalizeEmail(email)}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "rate" | "unavailable" };

export async function issueOtp(
  email: string,
  table: OtpTable,
  options?: { now?: number; code?: string },
): Promise<IssueResult> {
  const normalized = normalizeEmail(email);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const once = await issueOnce(normalized, table, options);
    if (once.ok || once.reason === "rate") return once;
  }
  return { ok: false, reason: "unavailable" };
}

async function issueOnce(
  email: string,
  table: OtpTable,
  options?: { now?: number; code?: string },
): Promise<IssueResult | { ok: false; reason: "conflict" }> {
  const now = options?.now ?? unixNow();
  const current = await table.get(email);
  const recent = (current?.issues ?? []).filter((issuedAt) => now - issuedAt < ISSUE_WINDOW_SECONDS);
  if (recent.length >= MAX_ISSUES) return { ok: false, reason: "rate" };
  const code = options?.code ?? generateCode();
  const record: OtpRecord = {
    email,
    codeHash: hashCode(email, code),
    expiresAt: now + CODE_TTL_SECONDS,
    attempts: 0,
    used: false,
    issues: [...recent, now],
  };
  const wrote = await table.putIfIssues(record, current ? [...(current.issues ?? [])] : null);
  if (!wrote) return { ok: false, reason: "conflict" };
  return { ok: true, code };
}

/** Burn one attempt, compare the hash in constant time, then mark the code used. */
export async function verifyOtp(
  email: string,
  code: string,
  table: OtpTable,
  now = unixNow(),
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const burned = await table.burnAttempt(normalized, now);
  if (!burned) return false;
  const expected = hashCode(normalized, code);
  if (!safeEqualHex(burned.codeHash, expected)) return false;
  return table.markUsed(normalized, expected, now);
}

export class MemoryOtpTable implements OtpTable {
  readonly rows = new Map<string, OtpRecord>();

  async get(email: string): Promise<OtpRecord | null> {
    const row = this.rows.get(email);
    return row ? copyRecord(row) : null;
  }

  async putIfIssues(record: OtpRecord, expectedIssues: number[] | null): Promise<boolean> {
    const current = this.rows.get(record.email);
    if (expectedIssues === null) {
      if (current) return false;
    } else if (!current || !sameIssues(current.issues, expectedIssues)) {
      return false;
    }
    this.rows.set(record.email, copyRecord(record));
    return true;
  }

  async burnAttempt(email: string, now: number): Promise<OtpRecord | null> {
    const row = this.rows.get(email);
    if (!row) return null;
    if (row.used || row.attempts >= MAX_VERIFY_ATTEMPTS || row.expiresAt <= now) return null;
    row.attempts += 1;
    return copyRecord(row);
  }

  async markUsed(email: string, codeHash: string, now: number): Promise<boolean> {
    const row = this.rows.get(email);
    if (!row || row.used || row.expiresAt <= now || !safeEqualHex(row.codeHash, codeHash)) return false;
    row.used = true;
    return true;
  }
}

export class DynamoOtpTable implements OtpTable {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async get(email: string): Promise<OtpRecord | null> {
    const out = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email },
        ConsistentRead: true,
      }),
    );
    if (!out.Item) return null;
    return normalizeRecord(out.Item);
  }

  async putIfIssues(record: OtpRecord, expectedIssues: number[] | null): Promise<boolean> {
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
          ConditionExpression:
            expectedIssues === null ? "attribute_not_exists(email)" : "issues = :prev",
          ...(expectedIssues === null
            ? {}
            : { ExpressionAttributeValues: { ":prev": expectedIssues } }),
        }),
      );
      return true;
    } catch (error) {
      if (isConditional(error)) return false;
      throw error;
    }
  }

  async burnAttempt(email: string, now: number): Promise<OtpRecord | null> {
    try {
      const out = await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { email },
          UpdateExpression: "ADD attempts :one",
          ConditionExpression:
            "attribute_exists(email) AND used = :false AND attempts < :max AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":one": 1,
            ":false": false,
            ":max": MAX_VERIFY_ATTEMPTS,
            ":now": now,
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      if (!out.Attributes) return null;
      return normalizeRecord(out.Attributes);
    } catch (error) {
      if (isConditional(error)) return null;
      throw error;
    }
  }

  async markUsed(email: string, codeHash: string, now: number): Promise<boolean> {
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { email },
          UpdateExpression: "SET used = :true",
          ConditionExpression: "codeHash = :hash AND used = :false AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":true": true,
            ":hash": codeHash,
            ":false": false,
            ":now": now,
          },
        }),
      );
      return true;
    } catch (error) {
      if (isConditional(error)) return false;
      throw error;
    }
  }
}

export function dynamoOtpTable(): OtpTable {
  return new DynamoOtpTable(dynamoDocument(), authTableName());
}

let devMemory: MemoryOtpTable | null = null;

/**
 * Local screenshot and dev servers can set OTP_STORE=memory.
 * Production always uses DynamoDB, even if that variable is set.
 */
export function otpTable(): OtpTable {
  if (process.env.OTP_STORE === "memory" && process.env.NODE_ENV !== "production") {
    devMemory ??= new MemoryOtpTable();
    return devMemory;
  }
  return dynamoOtpTable();
}

export function devOtpEchoAllowed(): boolean {
  return process.env.OTP_STORE === "memory" && process.env.NODE_ENV !== "production";
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const from = process.env.SES_NOREPLY?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!from || !region) throw new Error("SES is not configured");
  const ses = new SESClient({ region });
  const text = [
    `Your GoodDayNight code is ${code}.`,
    "",
    "It expires in 10 minutes. Enter it to keep your moments yours.",
    "",
    "If you didn’t ask for this, you can ignore this email.",
  ].join("\n");
  await ses.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [normalizeEmail(email)] },
      Message: {
        Subject: { Data: "Your GoodDayNight code", Charset: "UTF-8" },
        Body: { Text: { Data: text, Charset: "UTF-8" } },
      },
    }),
  );
}

function copyRecord(record: OtpRecord): OtpRecord {
  return { ...record, issues: [...record.issues] };
}

function sameIssues(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function normalizeRecord(item: Record<string, unknown>): OtpRecord {
  const issues = Array.isArray(item.issues) ? item.issues.map((value) => Number(value)) : [];
  return {
    email: String(item.email ?? ""),
    codeHash: String(item.codeHash ?? ""),
    expiresAt: Number(item.expiresAt ?? 0),
    attempts: Number(item.attempts ?? 0),
    used: item.used === true,
    issues,
  };
}

function isConditional(error: unknown): boolean {
  return (
    error instanceof ConditionalCheckFailedException ||
    (error instanceof Error && error.name === "ConditionalCheckFailedException")
  );
}
