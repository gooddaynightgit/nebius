export type CaptureKind = "voice" | "photo" | "text";

export type CaptureRecord = {
  id: string;
  vaultId: string;
  kind: CaptureKind;
  createdAt: string;
  day: string;
  text?: string;
  transcript?: string;
  caption?: string;
  joyType?: string;
  source?: "app" | "landing";
  dateVerified?: boolean;
  photoTakenAt?: string;
  locked?: boolean;
  goodMoment?: string;
  reframed?: boolean;
  mediaKey?: string;
  mediaContentType?: string;
  ingestModel?: string;
  ingestStatus: "pending" | "ok" | "skipped" | "mock";
  /** Set after Yes or No on the photo spark. Yes keeps that read with this photo. No declines it. */
  photoEmphasis?: "low";
  sparkAnswer?: "yes" | "no";
  /** The first-look sentence for this photo. Never reused for a different picture. */
  spark?: string;
};

export type StoryRecord = {
  id: string;
  vaultId: string;
  day: string;
  title: string;
  body: string;
  createdAt: string;
  weaveModel: string;
  excavateModel?: string;
  continuityModel?: string;
  tts: {
    status: "sonic" | "stub" | "skipped";
    model?: string;
    audioKey?: string;
    contentType?: string;
    note: string;
  };
  captureIds: string[];
  mock: boolean;
  /** Non-secret closer debug when mock-fallback — last model/problems/truncated error. */
  closerHint?: string;
};

export type VaultRecord = {
  id: string;
  kind: "anon" | "email";
  sessionId: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  captureIds: string[];
  stories: StoryRecord[];
  captures: CaptureRecord[];
  yoursOpened?: Record<string, string>;
};

export type SessionState = {
  sessionId: string;
  vaultId: string;
  email: string | null;
  captureCount: number;
  todayCount: number;
  canHearStory: boolean;
  lastStory: StoryRecord | null;
  todayPhoto: CaptureRecord | null;
  /** Any saved app photo or story, including earlier days. */
  hasSavedMoment: boolean;
  yoursOpened: boolean;
  canReplacePhoto: boolean;
  /** True only after this browser session verified an email OTP. gdn_em alone is not enough. */
  otpVerified: boolean;
};
