# 棒球查經 / Bible Baseball

React + TypeScript + Node.js 24 + SQLite + WebSocket. Application and data live on `172.16.0.103`; Cloudflare Workers VPC routes the public Worker to the existing private Tunnel. No public origin hostname is necessary with the VPC binding.

## Production

- Host console: https://bible-baseball.llai.workers.dev/admin
- Watch: create/open a game in the console and share its QR code or `/watch/:gameId` link.
- Server checkout: `/home/llai/bible-baseball`
- Data: `/home/llai/bible-baseball/data/baseball.sqlite` on local XFS.
- Accounts: hosts sign in with a verified Email and individual password. `ADMIN_PASSWORD` is retained only for one-time legacy-data claiming; it no longer signs in. Never publish the private project `.env`. The existing OpenAI key is retained there; do not put it in the frontend or Worker.
- Primary generation: Ollama `gemma4:31b` over the private `ollama-secure` Docker network. Each batch has a 180-second wall-clock timeout including queueing, loading and response reading. A timeout, unreachable service, or invalid JSON response triggers OpenAI for that batch only. OpenAI has no automatic retries. The next batch tries Ollama again. Job progress records the active provider/model and fallback reason.
- Fallback OpenAI configuration: `OPENAI_MODEL=gpt-4.1-mini`, Responses API, `store:false`. A minimal synthetic request verified the key and model. Real Scripture generation remains gated below.

## Run locally

Use Node.js 24 or later. Copy `.env.example` to `.env` only for a fresh installation; never overwrite an existing `.env`. Set the legacy administrator password, origin secret and SMTP settings, then run:

```powershell
npm ci
npm run build
npm start
```

The origin secret protects direct HTTP access. For local browser development, omit `ORIGIN_SECRET` in a separate local-only environment; do not remove it from production. Build output is served by the Node backend, not Vite. `npm run dev` is for frontend development only; configure a local proxy if using it against the backend.

## Host workflow

1. Register with Email and a 12–128-character password, verify the six-digit emailed code, then sign in. Choose Chinese or English in the top-right menu. Each account manages its own question banks and games.
2. Create a bank with a passage range. Fetch CUV/NIV and add verified cross-reference passages for triples.
3. Set innings and question targets. Defaults are `[12,9,6,3] × innings`; manually edited targets survive inning changes. Restore defaults resets all four. Existing questions are never deleted by changing these settings.
4. Generate in batches of up to four. Progress and failed quantities are persisted. Retry the generation button to fill the same targets; existing drafts and approved questions count toward them.
5. Review both languages, exact quotations, option letters, explanation and references. Edit, approve or disable each question. Inadequate passages are allowed to return fewer questions instead of fabricating content.
6. Enter first-batting and second-batting team names, select timers, and create the game. Share the watch URL or QR code, not the host screen.
7. Draw a difficulty, preview the answer, then start. Home runs display the selected translation for exactly five preparation seconds, then hide it for the 45-second recitation countdown. Changing interface language does not change the chosen recitation translation.
8. Stop the timer when the oral answer is complete. Rule correct/incorrect, then reveal. Discuss before moving to the next question. Three outs switch sides only after reveal and next.
9. Use undo to correct the last ruling before advancing. At the end of a tied game add an extra inning or leave the result as a tie. End early requires confirmation.

Each device remembers its own UI language. Viewer answers are withheld server-side until reveal. Browser autoplay requires clicking Enable sound. Encouragement tones are synthesized locally using Web Audio and contain no third-party music.

## Scripture and AI permission gate

The default `SCRIPTURE_LICENSE_CONFIRMED=false` disables Bible Gateway fetching and Bible-based AI generation. Production was enabled on 2026-11-24 after the operator explicitly confirmed permissions; Romans 6:12-23 was fetched successfully in both translations. The deployed site offers an explicitly labelled synthetic baseball-rules demo, not an approved Bible study bank. Do not claim this test bank contains Bible quotations or theological review.

After the operator has confirmed an allowed automated source access method and the required Biblica permissions for the intended NIV/AI use, set `SCRIPTURE_LICENSE_CONFIRMED=true` on the server and recreate the app container. The flag records the operator's configuration; it does not grant a license. Keep the evidence outside the public web directory.

- https://www.biblegateway.com/legal/terms/
- https://www.biblica.com/permissions/

## Operations

```sh
cd /home/llai/bible-baseball
docker compose ps
docker compose logs --tail=100 app
docker compose exec -T app node scripts/backup.mjs
```

Daily backup uses SQLite `VACUUM INTO`, retaining the seven newest backups in `data/backups`. Backups contain session records and are private.

Before an update, make a backup and tag the current image `bible-baseball-app:previous`. Then run `docker compose up -d --build`. Deploy the Worker separately using `npx wrangler@4 deploy --config worker/wrangler.jsonc`; its `ORIGIN_SECRET` must match the origin `.env` and is set through standard-input secret provisioning. Only the origin secret goes to Cloudflare, never the OpenAI key or admin password.

For rollback, tag the previous image back to `bible-baseball-app:latest` and run `docker compose up -d --no-build`; use `wrangler rollback` for the Worker if necessary. Restore a database backup only while the app is stopped, preserve a copy of the current database first, and do not leave mismatched WAL/SHM files alongside a restored database. Backup and restore files must retain UID/GID 1000 permissions for the container user. Restart and check `/api/health` plus a private host session.

## Verification

```powershell
npm test
npm run build
node scripts/smoke.mjs
npx playwright test tests/browser.spec.ts --reporter=line
```

The smoke script creates a disposable functional acceptance game and completes three innings. Set `TEST_URL` to run it against production. Playwright tests host/viewer isolation, bilingual UI, target-count behavior, answer reveal and mobile overflow, and saves screenshots. Automated testing does not substitute for human Scripture review or a physical room/projector/audio acceptance check.

## 題庫管理

「題庫審核」可匯出完整題庫為 JSON，或匯入匯出檔建立獨立題庫，保留審核狀態。上限 2 MB、2000 題；驗證失敗不儲存部分資料。

按「手動增加題目」可選四種題型，填寫雙語題目、答案、解說、評分重點、經文及 Bible Gateway 來源網址。選擇題須四個雙語選項，三壘題須交叉經文。預設為待審核。

## Accounts and Email delivery

Registration is enabled only when `SMTP_HOST` and `SMTP_FROM` are configured. Set `SMTP_PORT=587` and `SMTP_SECURE=false` for required STARTTLS, or port 465 and `SMTP_SECURE=true` for implicit TLS. Set `SMTP_USER` and `SMTP_PASSWORD` when the server requires authentication. Certificate verification remains enabled. Store credentials only in the private server environment; never commit them. SMTP credentials have not been supplied or tested by this implementation.

Registration and password recovery send six-digit codes valid for ten minutes, with at most five incorrect attempts. Resends require 60 seconds and replace the previous code. Password recovery first verifies the code, then grants five minutes to set a new password. The reset grant is single-use and only kept in the browser's memory. Passwords support Chinese and spaces and must contain 12–128 Unicode characters. Changing or resetting a password signs out every device and closes host WebSockets. Sessions otherwise expire after twelve hours. Account settings provide password changes and legacy-data claiming. Viewers still use public watch links without signing in.

All bank/question editing, exports, game actions and host HTTP/WebSocket access require ownership. Importing creates a bank belonging to the importing account. Public watch and finished-game review links deliberately expose the existing viewer content; they do not grant management access.

### Deployment and legacy data

1. Before starting the new version, run the existing SQLite backup command and preserve the previous image. Do not replace `.env` or the existing `ADMIN_PASSWORD`.
2. Add the SMTP environment settings, then build and recreate the app container. The migration adds account tables and clears old shared-password sessions. Existing banks, jobs and games remain intact and await claiming. The old password cannot sign in, including before claiming.
3. Complete a real registration and check actual receipt of its code. Sign in with the verified Email and new personal password. In Account settings choose Claim existing data and provide the original `ADMIN_PASSWORD`. The first successful claim atomically receives all legacy banks, jobs and games; later claims are rejected. Newly registered accounts do not see unclaimed data. Account verification and personal password setup must be complete before claiming.
4. Confirm the owner can open the old banks and games, and a second account cannot manage them. Use Forgot password and verify actual delivery of the recovery code, then complete code verification and password reset. Verify the old password and prior sessions fail, while a public watch link still works.
5. Only advertise registration after those real delivery checks. Missing SMTP or delivery failure produces an explicit retry/configuration error; no code is printed to logs or exposed by an API.

The private `data/auth-secret` file protects verification-code/reset-grant digests and is created once, then reused across restarts. Back up the whole private data directory as well as SQLite, preserving file ownership. Losing this secret invalidates outstanding codes and reset grants. The database contains password hashes and session tokens and must remain private. For rollback restore the pre-migration database with the app stopped using the existing restore procedure; rolling back only the image would remove account isolation.

### Account verification commands

`npm run build` builds the frontend/backend and checks types. `npm test` runs account, ownership, gameplay and generation tests, including a browser registration/recovery flow with an injected test mail sender. `node scripts/test-isolated.mjs` starts a disposable SQLite-backed server, runs the bilingual/mobile browser checks and gameplay smoke acceptance, then removes its temporary data. It never uses the production database or sends mail.

For manual checks against a configured deployment, create a dedicated verified test account and set private `TEST_EMAIL` and `TEST_PASSWORD` (environment variables or `.env`), then run the existing smoke/browser commands with `TEST_URL`. Do not use `ADMIN_PASSWORD` for these checks. The recovery script restarts the production app and must only be run intentionally as an operational check. Mocked/test mail delivery does not establish real SMTP receipt.
