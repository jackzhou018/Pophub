Entertainment hub.

## OAuth setup

Copy `.env.example` to `.env.local` and fill in the credentials you want to use.

Set `APP_URL` to the exact origin you want OAuth callbacks to use in development.

Supported providers with real server-verified auth:

- Spotify
- YouTube
- Twitch

Redirect URIs to register:

- `http://localhost:3000/api/auth/spotify/callback`
- `http://localhost:3000/api/auth/youtube/callback`
- `http://localhost:3000/api/auth/twitch/callback`

The UI only shows `Connected` after the server successfully exchanges the OAuth code, stores the token session, and verifies it by fetching the provider API.
