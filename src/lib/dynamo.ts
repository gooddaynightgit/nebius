import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let documentClient: DynamoDBDocumentClient | null = null;

/** Shared DynamoDB document client. Region comes from AWS_REGION (same as SES). */
export function dynamoDocument(): DynamoDBDocumentClient {
  if (documentClient) return documentClient;
  const region = process.env.AWS_REGION?.trim();
  if (!region) throw new Error("AWS_REGION is required");
  const client = new DynamoDBClient({ region });
  documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return documentClient;
}

/** OTP table (`gooddaynightauth`). Moment credits use `goodfans` via `fansTableName`. */
export function authTableName(): string {
  return process.env.AUTH_TABLE?.trim() || "gooddaynightauth";
}
