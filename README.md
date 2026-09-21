# Gooddaynight

Personal AI for the [Nebius × NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/) — **Personal AI** track.

Gooddaynight turns what Amy texted, photographed, or voice-noted during the day into a calming bedtime story read back to her. The vault is private: anonymous until she chooses email, then keyed by hashed email. Captures are never sent anywhere except Nebius Token Factory for ingest and weave.

Apache 2.0 — see [LICENSE](LICENSE).

## Funnel

1. Landing: hero + CTA **Hear your story — free** — no email form. **One good moment today** is an accordion: drop a photo (optional 80-character whisper) and pick one of six quiet-joy radios. Collapsed rows show title + italic tagline; selecting a type opens body, **Capture it**, and a pale lavender **Story playback** box. Clicking the CTA opens `/app`. Landing photos/whispers save through the same `/api/captures` vault as the app.
2. `/app` uses the same quiet-joy accordion (shared `JoyPicker` + `landing.ts` copy). After a pick she can still drop **voice**, **photo**, or **text**. Each capture is stored (Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise Nebius object storage, otherwise local JSON/files). Woven stories play back in the same pale lavender docs-style card, not a full-bleed photo overlay.
3. Only after ≥1 moment does the app ask for email, which unlocks hearing her own good-moments story. Spell-confirm still asks before a correction is kept.

## Architecture

| Layer | What |
| --- | --- |
| Frontend | Next.js App Router on Vercel. Landing + `/app` capture UI + story player with replay-last-night. |
| API | `/api/captures` ingest, `/api/email` gate, `/api/weave` story, `/api/story` + `/api/story/audio` playback. |
| Ingest | Nemotron Nano via Token Factory extracts “the good.” Photos try Nano-Omni, then Nano. |
| Weave | Nemotron 3 Super writes the bedtime story. Optional Ultra continuity from last night. |
| Voice | NVIDIA Sonic via Token Factory when a model id is listable; otherwise stub TTS and play the story in a calm browser voice. |
| Storage | **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set; else Nebius AI Cloud object storage (S3 API); filesystem only for local dev. On Vercel without Blob/S3, health reports `ephemeral`. |
| Nightly | `POST /api/weave` with `WEAVE_CRON_SECRET`, wrapped by `jobs/weave-nightly.sh` as a Nebius Serverless Job at 21:00. UI also has **Weave now**. |

### Token Factory models

OpenAI-compatible base: `https://api.tokenfactory.nebius.com/v1/` with `NEBIUS_API_KEY`.

Checked against the public catalog (`/api/public/models_info`) on 2026-09-20:

| Role | Default model id | Status |
| --- | --- | --- |
| Ingest / extract the good | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | In catalog |
| Photo / multimodal ingest | `nvidia/nemotron-3-nano-omni` | Cookbook id; not in that catalog snapshot — tried then Nano fallback |
| Story weave | `nvidia/nemotron-3-super-120b-a12b` | In catalog |
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

Open [http://localhost:3000](http://localhost:3000). Landing CTA goes to `/app`. Without `NEBIUS_API_KEY`, captures still persist under `.data/` and **Weave now** writes a demo story you can hear through the browser voice.

### With Token Factory

Set `NEBIUS_API_KEY` in `.env.local`. Weave calls Super. Ingest calls Nano (and Omni for photos when available).

### With Nebius object storage

Set `NEBIUS_S3_ENDPOINT`, `NEBIUS_S3_REGION`, `NEBIUS_S3_BUCKET`, `NEBIUS_S3_ACCESS_KEY_ID`, `NEBIUS_S3_SECRET_ACCESS_KEY`. Endpoint pattern: `https://storage.<region>.nebius.cloud`.

## Vercel

1. Import this repository.
2. Framework preset: **Next.js**.
3. Environment variables from `.env.example` — at least `NEBIUS_API_KEY` for a live weave.
4. **Enable Vercel Blob (required for durable captures/media on serverless):**
   1. Vercel dashboard → project → **Storage** → **Create Database** → **Blob**.
   2. Prefer **Private** access. Connect the store to this project.
   3. Redeploy. Vercel injects `BLOB_READ_WRITE_TOKEN` (and `BLOB_STORE_ID` for OIDC).
   4. If the store is public, set `BLOB_ACCESS=public`.
   5. Confirm `GET /api/health` shows `"storage": "vercel-blob"`.
5. Optional: set `NEBIUS_S3_*` instead of (or in addition to) Blob. Blob wins when the token is present.
6. Attach `gooddaynight.com` in the Vercel domain settings.

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

1. **0:00** Landing. Point at the colour blocks and the lime **Hear your story — free**. Open **One good moment today**, drop a photo, pick a quiet-joy radio, and show the pale lavender Story playback. There is no signup field. Click through.
2. **0:20** `/app`. Pick a quiet-joy radio so the accordion opens (italic tagline stays on the row; body, Capture it, and a pale lavender Story playback preview appear). Then paste a text moment (“the coffee was still warm”) or drop a photo. Save.
3. **0:50** The email card appears only now. Enter an email. Unlock.
4. **1:10** Tap **Weave now**. If `NEBIUS_API_KEY` is set, Super writes the story; otherwise the mock story still plays in a pale lavender playback card. Tap **Replay last night** and let the calm voice read it.
5. **1:50** Header shows Token Factory vs demo mode. Mention: Nano extracts the good, Super weaves, vault is private, Sonic is stubbed until Token Factory lists it, nightly job at 21:00 is the same `/api/weave` path.
6. **2:20** Add one more moment and weave again — last night / this session stays in the vault for replay.

## API sketch

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Models, storage backend, Token Factory flag |
| GET | `/api/session` | Anonymous cookie vault |
| GET/POST | `/api/captures` | List / store a moment and Nano-ingest |
| GET | `/api/media/:id` | Private media for this vault |
| POST | `/api/email` | Gate after ≥1 capture; accepts client `captures` if the server vault is empty; migrate anon → email vault |
| POST | `/api/weave` | Super weave (session or cron) |
| GET | `/api/story` | Last story |
| GET | `/api/story/audio` | Sonic audio when present |

## License

Apache License 2.0.
