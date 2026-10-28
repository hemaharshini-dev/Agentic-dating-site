# the test · agentic dating

A small web app for adding one LinkedIn + public Instagram pair at a time, viewing the profile analysis, watching a visible agent-date simulation, and comparing ranked matches.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`.
3. Add an Apify token and the Actor IDs you intend to use to `.env.local`.
4. Install dependencies and start the app:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

The two configured Apify Actors have different input formats. The Instagram adapter accepts the full profile URL, extracts and validates its username, and sends `{ "usernames": [username], "includeAboutSection": false }`. The LinkedIn posts Actor receives `{ "targetUrls": [linkedinUrl], "maxPosts": 3 }`. That requests one Instagram profile and at most three LinkedIn posts, then uses returned profile/post text for the analysis. Keep the token server-side. The app uses only the two supplied source profiles and their returned text; it does not add search or third-party enrichment sources.

The LinkedIn Actor you selected collects posts, not profile details. LinkedIn's User Agreement prohibits automated scraping unless LinkedIn authorizes it; use that Actor only if your access method is authorized. Apify does not grant that authorization.

## Share a hosted version

1. Push this repository to a public GitHub repository.
2. Import the repository into Vercel and deploy the Next.js project.
3. In Vercel project settings, add `APIFY_API_TOKEN`, `APIFY_INSTAGRAM_ACTOR_ID`, and `APIFY_LINKEDIN_ACTOR_ID` as server environment variables, then redeploy.
4. Share the generated `*.vercel.app` URL.

People and their analysis are saved in the visitor's browser local storage. That keeps the first version small and avoids a paid database; each browser builds its own pool. The deployed application code and Apify credentials are shared, so add a simple access gate or keep the URL unlisted while testing with real people's profile links. A later hosted shared-demo version can move the pool to a database.

## Cost and data notes

The integration is designed to stop on errors and does not contain any paid model API. Apify Actor runs may consume free credits or have per-result charges; inspect each Actor's current pricing and set limits in Apify before running it. This app cannot guarantee $0 if an Actor is configured to bill. Use only retrieval methods you are authorized to use, and do not configure login cookies, proxies, or access-control bypasses. Delete a profile from the app to remove it from that browser's pool.

## Current scope

Profiles are summarized with lightweight keyword matching over returned profile text. Agent conversations are deterministic, visible simulations based on those profiles; no person is contacted. The current ranking is an explainable shared-interest sort, not a trained compatibility model.
