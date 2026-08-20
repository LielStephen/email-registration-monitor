# Intelligent Email & Attachment Registration Number Monitor

OAuth-based Gmail and Outlook monitor that searches new email subjects, bodies, PDFs, Excel (`.xlsx`, `.xls`) and CSV attachments. Every discovery is stored with its exact location and notification delivery is deduplicated by monitor, message, and location.

## Run locally

1. Copy `apps/api/.env.example` to `apps/api/.env` and provide OAuth credentials plus a 32-byte Base64 encryption key.
2. Run `docker compose up -d` to start PostgreSQL and Redis. The migration in `db/001_initial.sql` initializes the schema on first launch.
3. Run `npm install` and then `npm run dev` in this directory. In another terminal run `npm run worker`.
4. Open `http://localhost:5173`, connect Gmail or Outlook, and create a monitor.

OAuth callbacks are `http://localhost:4100/api/auth/gmail/callback` and `http://localhost:4100/api/auth/outlook/callback`; register both with their respective providers. Gmail requires the `gmail.readonly` scope and Microsoft requires `Mail.Read` and `offline_access`.

The included dashboard uses a local development user (`local-user`). Replace the `x-user-id` development fallback with your real application authentication before deploying for more than one person.

## Processing behavior

- Tabular matches report sheet, 1-indexed row, Excel column, and the adjacent `Status` field when that column exists.
- PDFs use their embedded text layer. For scanned PDFs, set `ENABLE_OCR=true` and `OCR_ENDPOINT` to an authorized OCR service that accepts `application/pdf` and responds with `{ "text": "..." }`. This keeps OCR optional and provider-neutral.
- OAuth refresh-token handling and mailbox access should be hardened further before a public multi-user deployment (accounts, consent audit, HTTPS, secret manager, and user authentication).
