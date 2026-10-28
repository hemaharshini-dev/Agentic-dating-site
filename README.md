# the test · agentic dating

A small web app for adding one LinkedIn + public Instagram pair at a time, viewing the profile analysis, watching a visible agent-date simulation, and comparing ranked matches.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` (or add the new values to your existing `.env.local`).
3. Add the Apify token and the optional Groq key to `.env.local`. The Apify Actor IDs are prefilled.
4. For database storage, create a free Supabase project, enable Anonymous Sign-Ins under Authentication providers, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and run `supabase/schema.sql` in its SQL Editor.
5. Install dependencies and start the app:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

The two configured Apify Actors have different input formats. The Instagram adapter accepts the full profile URL, extracts and validates its username, and sends `{ "usernames": [username], "includeAboutSection": false }`. The LinkedIn posts Actor receives `{ "targetUrls": [linkedinUrl], "maxPosts": 3 }`. That requests one Instagram profile and at most three LinkedIn posts, then uses returned profile/post text for the analysis. Keep the Apify token server-side. The app uses only the two supplied source profiles and their returned text; it does not add search or third-party enrichment sources.

The LinkedIn Actor you selected collects posts, not profile details. LinkedIn's User Agreement prohibits automated scraping unless LinkedIn authorizes it; use that Actor only if your access method is authorized. Apify does not grant that authorization.

## Share a hosted version

1. Push this repository to a public GitHub repository.
2. Import the repository into Vercel and deploy the Next.js project.
3. In Vercel project settings, add the three Apify variables, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (if using AI) `GROQ_API_KEY` plus `GROQ_MODEL`, then redeploy. Run the SQL schema once in Supabase and enable Anonymous Sign-Ins there.
4. Share the generated `*.vercel.app` URL.

When Supabase is configured, profile records and AI date transcripts are stored in private tables protected by row-level security; each browser gets its own anonymous Supabase user and can only access its own rows. Without Supabase settings, the app falls back to browser local storage. Anonymous profiles cannot be recovered if the browser's Supabase session is cleared; add email sign-in before treating the site as a durable user account system.

The profile's **AI draft** button sends only the extracted LinkedIn and Instagram text to Groq and asks for a structured summary with evidence, interests, hobbies, explicitly stated needs, open questions, and confidence. You can edit the draft and save it as reviewed. Agents can only date after both profiles are reviewed; date prompts receive the approved summary and facts, not the raw source text. The Groq API key stays server-side. Groq says inference inputs and outputs are not retained by default, but may be temporarily logged for reliability or abuse monitoring for up to 30 days. See [Groq data controls](https://console.groq.com/docs/your-data).

## Cost and data notes

Supabase and Groq have free tiers subject to quotas; Supabase may pause Free projects after a week of inactivity. Apify Actor runs consume Apify usage and may be billed; keep the account on the Free plan and inspect each Actor's pricing before running it. Use only authorized retrieval methods; do not configure cookies, proxies, or access-control bypasses. Delete a profile in the app to delete its Supabase row (and associated saved dates) or its local browser record. Apify run datasets are separate and follow Apify's retention rules.

## Current scope

When Groq is configured, profile summaries and agent-date transcripts use its API. Without a Groq key, extracted profiles can still be edited, but AI drafts and generated date transcripts are unavailable. Rankings use an explainable Jaccard overlap across reviewed interests, hobbies, and explicitly stated needs; they are not a trained compatibility model. No person is contacted.
