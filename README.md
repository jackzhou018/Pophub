Entertainment hub.

## Account and OAuth setup

Copy `.env.example` to `.env.local` and fill in the credentials you want to use.

Set `APP_URL` to the exact origin registered with each OAuth provider. For local OAuth, use one host consistently, for example `http://localhost:3000` or `http://127.0.0.1:3000`.

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

API-key sources prepared:

- Ticketmaster Discovery API for concerts, ticketed sports, and local events
- TMDb for movie releases and trailers
- TheSportsDB for sports schedules and results metadata

Connected-account content is personalized:

- Spotify shows the signed-in user's top artists
- YouTube shows channels the signed-in user subscribes to and recent uploads from those channels
- Twitch shows live streams from channels the signed-in user follows

Redirect URIs to register:

- `http://localhost:3000/api/auth/spotify/callback`
- `http://localhost:3000/api/auth/youtube/callback`
- `http://localhost:3000/api/auth/twitch/callback`

If `APP_URL` is `http://127.0.0.1:3000`, register the matching `http://127.0.0.1:3000/api/auth/.../callback` URLs instead. Spotify, Google, and Twitch require the redirect URI to match exactly.

For YouTube / Google OAuth, also make sure:

- `YouTube Data API v3` is enabled in the same Google Cloud project as the OAuth client
- the OAuth consent screen is configured
- your Google account is added under `Test users` while the app is still in testing
- the callback host matches the host you actually use in the browser and in `APP_URL`

For Twitch OAuth, approve `user:read:follows` so PopHub can load followed streams. Existing Twitch connections made before that scope was added should be reconnected.

For Spotify OAuth, approve `user-read-email`, `user-read-private`, `user-top-read`, `user-library-read`, and `user-follow-read`. Existing Spotify connections made before the podcast/new-album scopes were added should be reconnected.

For API-key sources:

- set `TICKETMASTER_API_KEY` for concerts, ticketed sports, and local events
- set `TMDB_API_KEY` for movie releases and trailers
- set `THESPORTSDB_API_KEY` for sports schedules/results

Netflix and Hulu do not have normal public user OAuth APIs for this type of consumer app. Model them through manual saves/imports or catalog availability metadata; do not ask users for their streaming credentials.

The UI only shows `Connected` after the server successfully exchanges the OAuth code, stores encrypted tokens in the database, and verifies them by fetching the provider API.
