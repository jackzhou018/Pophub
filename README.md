Entertainment hub.

## Account and OAuth setup

Copy `.env.example` to `.env.local` and fill in the credentials you want to use.

Set `APP_URL` to the exact origin you want OAuth callbacks to use in development. For local OAuth, keep it aligned with the host you actually open in the browser, for example `http://localhost:3000`.

Set `POPHUB_DB_PATH` if you want the SQLite database somewhere other than `.data/pophub.sqlite`.

PopHub now has two layers of auth:

- app users sign up or log in with email + password
- provider accounts are then connected through OAuth and stored server-side per user in SQLite

Account management features included now:

- request a password reset link
- complete password reset on `/reset-password`
- disconnect a previously connected provider account

In development, the reset request flow shows a direct reset link in the UI instead of sending email. In production, you would replace that with your real mail delivery step.

Supported providers with real server-verified auth:

- Spotify
- YouTube
- Twitch

Redirect URIs to register:

- `http://localhost:3000/api/auth/spotify/callback`
- `http://localhost:3000/api/auth/youtube/callback`
- `http://localhost:3000/api/auth/twitch/callback`

The UI only shows `Connected` after the server successfully exchanges the OAuth code, stores encrypted tokens in the database, and verifies them by fetching the provider API.
