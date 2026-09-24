import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, describe, expect, it } from "vitest";
import { creditMoments, consumeMoment, getEntitlement, restoreMoment } from "./entitlement";
import { emailVaultId } from "./identity";
import {
  DynamoFansTable,
  MemoryFansTable,
  fansTableName,
  useFansTable,
  type FanCredit,
} from "./fans";

const savedFans = process.env.FANS_TABLE;

afterEach(() => {
  useFansTable(null);
  if (savedFans == null) delete process.env.FANS_TABLE;
  else process.env.FANS_TABLE = savedFans;
});

describe("goodfans moment balance", () => {
  it("defaults the table name to goodfans and refuses sleepcoachfans", () => {
    delete process.env.FANS_TABLE;
    expect(fansTableName()).toBe("goodfans");
    process.env.FANS_TABLE = "  ";
    expect(fansTableName()).toBe("goodfans");
    process.env.FANS_TABLE = "goodfans";
    expect(fansTableName()).toBe("goodfans");
    process.env.FANS_TABLE = "SleepCoachFans";
    expect(() => fansTableName()).toThrow(/sleepcoachfans/);
  });

  it("adds 40 on the buyer email, stacks a second pack, and ignores a duplicate payment id", async () => {
    const table = new MemoryFansTable();
    useFansTable(table);
    const first = await creditMoments({
      email: "Amy@Example.com",
      pfPaymentId: "1089250",
      amountGross: "5.00",
      moments: 40,
    });
    expect(first).toEqual({ remaining: 40, duplicate: false });
    const row = table.rows.get("amy@example.com");
    expect(row?.game).toBe(40);
    expect(row?.order).toBe("amy@example.com");
    expect(row?.source).toBe("payfast");
    expect(row?.emailVaultId).toBe(emailVaultId("amy@example.com"));
    expect(row?.paymentIds).toEqual(["1089250"]);
    expect(row?.issued).toBeTruthy();
    expect(row?.created).toBe(row?.issued);

    const again = await creditMoments({
      email: "amy@example.com",
      pfPaymentId: "1089250",
      amountGross: "5.00",
      moments: 40,
    });
    expect(again).toEqual({ remaining: 40, duplicate: true });
    expect(table.rows.get("amy@example.com")?.game).toBe(40);

    const second = await creditMoments({
      email: "amy@example.com",
      pfPaymentId: "1089251",
      amountGross: "5.00",
      moments: 40,
    });
    expect(second).toEqual({ remaining: 80, duplicate: false });
    expect((await getEntitlement("amy@example.com"))?.paymentIds).toEqual(["1089250", "1089251"]);
  });

  it("decrements game by 1 and blocks at 0, then restores after a failed save", async () => {
    const table = new MemoryFansTable();
    useFansTable(table);
    await creditMoments({
      email: "amy@example.com",
      pfPaymentId: "1",
      amountGross: "5.00",
      moments: 1,
    });
    expect(await consumeMoment("Amy@Example.com")).toBe(0);
    expect(await consumeMoment("amy@example.com")).toBeNull();
    expect(table.rows.get("amy@example.com")?.game).toBe(0);
    await restoreMoment("amy@example.com");
    expect(table.rows.get("amy@example.com")?.game).toBe(1);
    expect(await consumeMoment("nobody@example.com")).toBeNull();
  });
});

describe("DynamoDB goodfans updates", () => {
  const credit: FanCredit = {
    order: "amy@example.com",
    pfPaymentId: "1089250",
    amountGross: "5.00",
    moments: 40,
    emailVaultId: "em_test",
    source: "payfast",
    now: "2026-09-24T00:00:00.000Z",
  };

  it("credits with one conditional add of game and the payment id", async () => {
    const doc = new ScriptedDoc();
    doc.steps.push({
      Attributes: {
        order: credit.order,
        game: 40,
        paymentIds: new Set([credit.pfPaymentId]),
      },
    });
    const table = new DynamoFansTable(doc, "goodfans");
    const result = await table.credit(credit);
    expect(result).toEqual({ game: 40, duplicate: false });
    expect(doc.commands).toHaveLength(1);
    const update = updateInput(doc.commands[0]);
    expect(update.TableName).toBe("goodfans");
    expect(update.Key).toEqual({ order: "amy@example.com" });
    expect(update.UpdateExpression).toContain("ADD game :moments, paymentIds :pid");
    expect(update.ConditionExpression).toBe(
      "attribute_not_exists(paymentIds) OR NOT contains(paymentIds, :payment)",
    );
    expect(update.ExpressionAttributeValues?.[":moments"]).toBe(40);
    expect(update.ExpressionAttributeValues?.[":pid"]).toEqual(new Set(["1089250"]));
    expect(update.ExpressionAttributeValues?.[":source"]).toBe("payfast");
  });

  it("treats a conditional failure that already has the payment id as a duplicate", async () => {
    const doc = new ScriptedDoc();
    doc.steps.push("conditional");
    doc.steps.push({
      Item: {
        order: credit.order,
        game: 40,
        paymentIds: new Set(["1089250"]),
        emailVaultId: "em_test",
        source: "payfast",
        updatedAt: credit.now,
      },
    });
    const table = new DynamoFansTable(doc, "goodfans");
    await expect(table.credit(credit)).resolves.toEqual({ game: 40, duplicate: true });
    expect(doc.commands[1]).toBeInstanceOf(GetCommand);
    expect(doc.commands[1].input).toMatchObject({
      TableName: "goodfans",
      Key: { order: "amy@example.com" },
      ConsistentRead: true,
    });
  });

  it("decrements with game > 0 and returns null when the condition fails", async () => {
    const doc = new ScriptedDoc();
    doc.steps.push({ Attributes: { game: 39 } });
    const table = new DynamoFansTable(doc, "goodfans");
    await expect(table.consume("amy@example.com", credit.now)).resolves.toBe(39);
    const update = updateInput(doc.commands[0]);
    expect(update.UpdateExpression).toBe("ADD game :neg SET updatedAt = :now");
    expect(update.ConditionExpression).toBe("game > :zero");
    expect(update.ExpressionAttributeValues).toMatchObject({ ":neg": -1, ":zero": 0 });

    doc.steps.push("conditional");
    await expect(table.consume("amy@example.com", credit.now)).resolves.toBeNull();
  });

  it("restores one moment only when the email row exists", async () => {
    const doc = new ScriptedDoc();
    doc.steps.push({});
    const table = new DynamoFansTable(doc, "goodfans");
    await table.restore("amy@example.com", credit.now);
    const update = updateInput(doc.commands[0]);
    expect(update.ConditionExpression).toBe("attribute_exists(#order)");
    expect(update.ExpressionAttributeNames).toEqual({ "#order": "order" });
    expect(update.ExpressionAttributeValues).toMatchObject({ ":one": 1 });

    doc.steps.push("conditional");
    await expect(table.restore("missing@example.com", credit.now)).resolves.toBeUndefined();
  });
});

function updateInput(command: GetCommand | UpdateCommand | undefined) {
  expect(command).toBeInstanceOf(UpdateCommand);
  return (command as UpdateCommand).input;
}

class ScriptedDoc {
  readonly commands: Array<GetCommand | UpdateCommand> = [];
  steps: Array<"conditional" | { Item?: Record<string, unknown>; Attributes?: Record<string, unknown> }> =
    [];

  async send(command: GetCommand | UpdateCommand) {
    this.commands.push(command);
    const step = this.steps.shift();
    if (step == null || step === "conditional") {
      throw new ConditionalCheckFailedException({
        message: "The conditional request failed",
        $metadata: {},
      });
    }
    return step;
  }
}
