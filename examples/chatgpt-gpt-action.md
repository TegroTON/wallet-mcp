# Add Tegro TON/GRAM to a custom GPT (ChatGPT Actions)

1. Self-host the HTTP surface: `node dist/cli.js http 8787` (or Docker), exposed over HTTPS.
2. In ChatGPT → **Create a GPT → Configure → Actions → Create new action**.
3. **Import from URL**: `https://<your-host>/openapi.json`.
4. Each tool (`ton_get_account`, `ton_get_rate`, …) becomes a callable operation.
5. Auth: none required (read-only). Add an API key / bearer at your proxy if you host privately.

Example prompt: *"What's the GRAM price and the balance of foundation.ton?"*
