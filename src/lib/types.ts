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
  yoursOpened: boolean;
  canReplacePhoto: boolean;
};
