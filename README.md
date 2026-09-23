# Gooddaynight

Personal AI for the [Nebius × NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/) — **Personal AI** track.

Gooddaynight turns what Amy texted, photographed, or voice-noted during the day into a calming bedtime story read back to her. The vault is private: anonymous until she chooses email, then keyed by hashed email. Captures are never sent anywhere except Nebius Token Factory for ingest and weave.

Apache 2.0 — see [LICENSE](LICENSE).

## Funnel

1. Landing: **You scrolled past a hundred good moments today. None of them were yours.** Lavender card: **Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you. Gooddaynight does →** — that arrow and the step next arrow open `/app/joy` (the quiet-joy accordion), not the photo page. Closer: **Something good is about to happen!** No email form. Landing photos/whispers still save through the same `/api/captures` vault as the app.
2. `/app/joy` is the accordion — **What kind of quiet joy was it?** *(pick one)* — with six expandable joys (title, tagline, body, Capture it, story playback). Newer joy ids stay in data for mismatch suggestions and are not listed. Choosing a joy stays on the accordion. A photo and arrow then open `/app`; the previous arrow returns to the landing. `/app` is **photo only**: heading **Today. One good moment. Go get it.** Helper copy: *A sky. A gift. A hello on the screen. A screenshot of 3 things you're grateful for — handwritten ones especially welcome ...* The ten photo-save rules below are not shown on `/app`. They stay in this README and in `PHOTO_SAVE_RULES`, and they are still enforced on save. Once that still and the stored joy both exist, `/api/joy-match` runs: MATCH opens the optional one-line caption (≤80 characters); MISMATCH offers **Switch it** / **Keep mine**. Horrific/essay lines are dropped and the photo still saves. **Save today's moment**, then **YOURS** appears — the only door to tonight's story (`/app/yours`). The photo page’s previous arrow returns to the joy; its next arrow continues to YOURS once that door is open. Photo weaves run two steps: vision excavates sensory ingredients, then **Kimi** writes a short **Nightly Reflection** (1–2 sentences, ~35 words) from the **photo** (Kimi-K2.6 / K3 are image2text — the still is attached, JPEG-shrunk to ~1440px / ~1MB for Token Factory), the photo description, chosen joy, and optional caption. Caption is their whisper; joy is a light tint (never printed as a label). If Kimi cannot finish, Qwen instruct then Super write from the text brief — that text chain is never empty even if Vercel model envs are blank. Vision when a Token Factory key is present; an honest caption+joy stand-in when it is not, or if every live closer fails. Mock-fallback JSON may include a short non-secret `closerHint` (last model / problems / truncated error) for debug; the YOURS chip stays soft. If the model returns `BLOCK` (horrific image), YOURS shows a gentle refusal and does not lock the photo. After a real story opens, the caption is deleted. Saving again the same day replaces that one still (no archive) so YOURS can weave a fresh reflection. **Keep** saves the photo and story as one picture. At midnight the night expires. Closing: **Something good is about to happen!** / **Gooddaynight.com**.
3. Private vault only — not shared, posted, or used to train public models. Email remains available on the landing path; `/app` does not ask for it to open YOURS.

## Photo-save rules

Internal product rules — not shown on `/app`. Source of truth: `PHOTO_SAVE_RULES` in `src/lib/photo.ts`, enforced on the capture page and for `source=app` (`appPhotoRejection` on `POST /api/captures`). A missing or unverified camera date stays silent and still saves as today. A confirmed camera date older than today is blocked with: *This photo looks older than today. Tonight only holds today's moment.*

1. Only one photo per calendar day (midnight–23:59, phone’s local time).
2. The photo is required. No photo, no save, no good moment.
3. When from today — camera roll today, message: Wonderful, your photo was taken today.
4. Screenshots count: a hello, a gift message, a tracker, a watch face.
5. A video is not saved. One still frame from it may be saved instead.
6. One joy pick is required (sunlight, hello, slow task, movement, clear corner, or just this).
7. Ugly, blurry, messy, and ordinary photos are allowed.
8. Sad or hard photos are allowed. The story stays honest and gentle.
9. Horrific photos are not saved and get no story (violence, gore, abuse, porn, hate, self-harm).
10. Not allowed: memes, someone else’s moment passed off as yours.

## Architecture

| Layer | What |
| --- | --- |
| Frontend | Next.js App Router on Vercel. Landing + `/app` capture UI + story player with replay-last-night. |
| API | `/api/captures` ingest (`source=app` enforces photo-day rules), `/api/yours` open tonight's story (a same-day Save replaces the one still and weaves again — no archive), `/api/email` gate (landing path), `/api/weave` story, `/api/story` + `/api/story/audio` playback. |
| Ingest | Nemotron Nano via Token Factory extracts “the good.” Photos try Nano-Omni, then Nano. |
| Weave | `/app` YOURS: vision excavates the photo, then image2text Kimi writes a short Nightly Reflection from the still + excavation (Qwen instruct, then Super, if Kimi cannot finish). Landing path: Super + optional Ultra continuity. |
| Voice | NVIDIA Sonic via Token Factory when a model id is listable; otherwise stub TTS and play the story in a calm browser voice. |
| Storage | **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set; else Nebius AI Cloud object storage (S3 API); filesystem only for local dev. On Vercel without Blob/S3, health reports `ephemeral`. |
| Nightly | `POST /api/weave` with `WEAVE_CRON_SECRET`, wrapped by `jobs/weave-nightly.sh` as a Nebius Serverless Job at 21:00. UI also has **Weave now**. |

### Token Factory models

OpenAI-compatible base: `https://api.tokenfactory.nebius.com/v1/` with `NEBIUS_API_KEY`.

Checked against the public catalog (`/api/public/models_info`) on 2026-09-21:

| Role | Default model id | Status |
| --- | --- | --- |
| Ingest / extract the good | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | In catalog |
| Photo / multimodal ingest | `nvidia/nemotron-3-nano-omni` | Cookbook id; not in that catalog snapshot — tried then Nano fallback |
| YOURS visual excavation | `openbmb/MiniCPM-V-4_5` (`NEBIUS_VISION_MODEL`) | image2text, in catalog (eu-north1). Fallback: Nano-Omni, then text-only from caption/notes with Qwen instruct (`NEBIUS_EXCAVATE_TEXT_MODEL`). **No Qwen VL id in this snapshot**; Token Factory vision docs still mention `Qwen/Qwen2-VL-72B-Instruct` — set `NEBIUS_VISION_MODEL` to that if it is available on your key |
| YOURS Nightly Reflection | `moonshotai/Kimi-K2.6` (`NEBIUS_STORY_MODEL`) | **image2text**, in catalog (us-central1). YOURS attaches a JPEG-shrunk copy of the photo with the excavation, joy, and optional caption (Keep/download still uses the original blob). `moonshotai/Kimi-K3` is also image2text; `Kimi-K2.7-Code` is text2text (coding). A text-only `NEBIUS_STORY_MODEL` stays text-only. Fallback: Qwen instruct (`NEBIUS_STORY_TEXT_MODEL`), then Super — both hard-defaulted if env is blank. Mock only if every live path fails |
| Text-only excavation / reflection fallback | `Qwen/Qwen3-235B-A22B-Instruct-2507` (`NEBIUS_STORY_TEXT_MODEL` / `NEBIUS_EXCAVATE_TEXT_MODEL`) | In catalog (eu-north1). Nightly Reflection if image2text Kimi cannot finish; also text-only excavation if vision fails |
| Story weave (landing / Super fallback) | `nvidia/nemotron-3-super-120b-a12b` | In catalog |
| Private vault continuity | `nvidia/Nemotron-3-Ultra-550b-a55b`, then `nvidia/Llama-3_1-Nemotron-Ultra-253B-v1` | Ultra-3 is in catalog; Llama Ultra is a fallback. Off unless `NEBIUS_USE_ULTRA=1` |
| Calming voice | `NEBIUS_SONIC_MODEL` | **Not listable.** No Sonic / Magpie / `/v1/audio/speech` in Token Factory docs or catalog. Stubbed with a TODO in `src/lib/tts.ts`. Story text still returns. |

If the key is missing, ingest and weave return a graceful mock story so the UI still demos.

Private memory: last night’s story stays in the vault. Continuity is a short Ultra (or Super) pass over *that vault only* — no third-party stores, no training opt-in, no email in prompts.

## Run locally

```bash
cp .env.example .env.local
# optional: paste NEBIUS_API_KEY and storage credentials
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Landing CTA goes to `/app/joy`. Without `NEBIUS_API_KEY`, captures still persist under `.data/` and **Weave now** writes a demo story you can hear through the browser voice.

### With Token Factory

Set `NEBIUS_API_KEY` in `.env.local`. `/app` YOURS excavates with `NEBIUS_VISION_MODEL` (then Omni), then writes the Nightly Reflection with `NEBIUS_STORY_MODEL` (multimodal Kimi when the photo is present; text-only if you override to an instruct id), then `NEBIUS_STORY_TEXT_MODEL` (Qwen), then Super. Landing weave calls Super. Ingest calls Nano (and Omni for photos when available).

### With Nebius object storage

Set `NEBIUS_S3_ENDPOINT`, `NEBIUS_S3_REGION`, `NEBIUS_S3_BUCKET`, `NEBIUS_S3_ACCESS_KEY_ID`, `NEBIUS_S3_SECRET_ACCESS_KEY`. Endpoint pattern: `https://storage.<region>.nebius.cloud`.

## Vercel

1. Import this repository.
2. Framework preset: **Next.js**.
3. Environment variables from `.env.example` — at least `NEBIUS_API_KEY` for a live weave.
   **Delete blank `NEBIUS_*_MODEL` rows in Vercel** (especially `NEBIUS_SUPER_MODEL`, `NEBIUS_NANO_MODEL`, `NEBIUS_NANO_OMNI_MODEL`, `NEBIUS_STORY_TEXT_MODEL`). Empty string ≠ unset: a blank value used to wipe catalog defaults (`??` does not treat `""` as missing). The app now treats blank/whitespace as unset, but deleting the empty rows is still the right dashboard hygiene. `GET /api/health` should show non-empty `models.super`, `models.storyText`, `models.excavateText`, and `closerChain`.
4. **Enable Vercel Blob (required for durable captures/media on serverless):**
   1. Vercel dashboard → project → **Storage** → **Create Database** → **Blob**.
   2. Prefer **Private** access. Connect the store to this project.
   3. Redeploy. Vercel injects `BLOB_READ_WRITE_TOKEN` (and `BLOB_STORE_ID` for OIDC).
   4. If the store is public, set `BLOB_ACCESS=public`.
   5. Confirm `GET /api/health` shows `"storage": "vercel-blob"`. Optional: `GET /api/health?probe=storage` should return `"blobProbe": { "ok": true }` (tiny write/read; no secrets).
5. Optional: set `NEBIUS_S3_*` instead of (or in addition to) Blob. Blob wins when the token is present.
6. Attach `gooddaynight.com` in the Vercel domain settings.

Private Blob stores are supported. Vault JSON and media are read with the URL returned by `put` (and a Blob API fallback). A failed private `get` is logged and is not treated as “vault missing” unless the object is truly absent.

**Without Blob or S3, Vercel’s filesystem is ephemeral** (`/tmp`, not shared across functions). Unlock still works because the client resends today’s captures to `POST /api/email`. Voice/photo files themselves will not survive across instances until Blob (or S3) is enabled.

Health `storage` values: `vercel-blob` | `nebius-s3` | `filesystem` (local) | `ephemeral` (Vercel with neither store).

## Nightly weave as a Nebius Serverless Job (21:00)

`POST /api/weave` is the job handler. From the UI it uses the session cookie. From a job it uses `Authorization: Bearer $WEAVE_CRON_SECRET` and weaves every email-unlocked vault that has captures today.

1. Deploy the app and set `WEAVE_CRON_SECRET` and `APP_URL`.
2. Build a tiny container (or use a curl image) whose command is `jobs/weave-nightly.sh`.
3. Create the job, for example:

```bash
nebius ai job create \
  --name gooddaynight-weave \
  --image <image-with-curl> \
  --container-command "bash /app/jobs/weave-nightly.sh" \
  --env APP_URL=https://gooddaynight.com \
  --env-secret WEAVE_CRON_SECRET=<secret-selector>
```

4. Schedule it for **21:00** in Amy’s timezone. Serverless Jobs are one-shot; wrap the create call with cron, a Cloud scheduler, or a tiny always-on trigger that fires at 21:00.
5. For the demo video, skip the clock — tap **Weave now**.

## Demo script (≤3 minutes)

1. **0:00** Landing. Point at the mint and lavender cards and the **Gooddaynight does →** arrow into `/app/joy`. Open **One good moment today**, drop a photo, pick a quiet-joy radio, and show the pale lavender Story playback. There is no signup field. Click through.
2. **0:20** Landing arrow opens the joy accordion. Pick one quiet joy — the accordion stays open, and the photo arrow opens `/app`. Heading is **Today. One good moment. Go get it.** Upload one photo (screenshots count; a video can yield one still). Caption **What’s the good in this one?** (≤80) opens after the joy witness. **Save today's moment** — then **YOURS** appears. Tap it to open `/app/yours`.
3. **0:50** Pale lavender Story playback reads the **woven** story (not the canned joy template). Replay last night.
4. **1:20** Header shows Token Factory vs demo mode. Mention: vision excavates the photo (MiniCPM-V or your `NEBIUS_VISION_MODEL`), Kimi writes the Nightly Reflection from the still, vault is private, Sonic is stubbed until Token Factory lists it.
5. **1:50** After YOURS, **Keep** saves the photo with the story. Save again the same day to replace that one moment and open YOURS once more. After midnight the link expires.

## API sketch

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Models (including `storyText` / `excavateText`), `closerChain`, storage backend, Token Factory flag |
| GET | `/api/session` | Anonymous cookie vault |
| GET/POST | `/api/captures` | List / store a moment and Nano-ingest. `source=app` enforces the ten photo-save rules, and blocks a confirmed camera date older than today |
| POST | `/api/joy-match` | Witness whether the photo fits the joy just tapped (`joy_type` + file). `MATCH`, `MISMATCH`, `NEED_PHOTO` (no file), or `UNAVAILABLE` (no Token Factory key). Model errors fail open as `MATCH` |
| GET | `/api/media/:id` | Private media for this vault |
| GET/POST | `/api/yours` | Open tonight's woven story, lock the photo; 404 after midnight or if nothing was saved |
| POST | `/api/email` | Gate after ≥1 capture on the landing path; accepts client `captures` if the server vault is empty; migrate anon → email vault |
| POST | `/api/weave` | Super weave (session or cron) |
| GET | `/api/story` | Last story |
| GET | `/api/story/audio` | Sonic audio when present |

## License

Apache License 2.0.
