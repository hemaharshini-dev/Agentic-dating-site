# Agentic Dating Site — First Implementation Plan

## Goal

Build a working, simple website where each person is represented by an AI agent. The agent analyzes that person's LinkedIn and public Instagram, creates a profile, dates other agents in visible conversations, and ranks matches for its person.

## The user flow

1. **Add people:** paste one LinkedIn URL and one public Instagram URL for one person, then add that person. Repeat this flow to grow the pool; no bulk entry is needed.
2. **Analyze:** use Apify to retrieve the available public profile information from those two URLs. Keep the two URLs attached to the person record and use no other information sources. Show progress and clear errors when a profile cannot be read.
3. **Review profile:** create a profile page with interests, hobbies, relationship needs/preferences where supported by the sources, personality signals, and a short explanation with links back to the evidence. Mark uncertain or unavailable details clearly; do not invent facts.
4. **Date:** run each person's agent through short, visible conversation rounds with other agents. Show the actual transcript, each agent's questions and answers, compatibility signals, and a brief post-date reflection. Agents act for their represented people; they do not contact the people.
5. **Rank:** show a best-to-least-fit list for every person, with a concise reason for each placement and links to both profile pages. Let the user open any profile or date transcript.

## Main screens

- **Home / Add person:** two URL fields for one person, validation, an “Add profile” action, and a visible count of people in the pool. Show a “Run dating simulation” action once there are enough profiles to match.
- **Run progress:** collection, profile creation, dates, and ranking status; show useful per-person errors and allow retry.
- **People / Profiles:** browse the 25 people and open each analyzed profile with its two source links.
- **Dates:** browse agent-to-agent transcripts and see what each agent learned or decided.
- **Rankings:** choose a person and see that person's ordered matches and explanations.
- **Demo:** a pre-run 25-person example that opens directly to profiles, dates, and rankings without requiring a new run.

## Straightforward implementation

- **Frontend and backend:** Next.js with TypeScript, keeping the first version in one application.
- **Data:** browser local storage for the first version: people, their two URLs, extracted profile facts, date transcripts, and ranking inputs stay in each visitor's browser. This avoids database setup and cost. A shared 25-person demo across browsers can be added later with a hosted database.
- **Apify:** call Apify from the server only. Start with one Instagram public-profile Actor and one LinkedIn public-profile Actor; normalize their outputs into the same small profile format. Put the Apify token in an environment variable, never in browser code. Set small result limits and a strict spend ceiling; stop with a clear message if the free allowance is exhausted. Check each Actor's current pricing before running it.
- **Agent dates and analysis:** use an LLM provider through one small server-side adapter. Keep prompts grounded in the extracted fields and the two URLs, and save the generated result so pages do not need to regenerate it on every visit. Make provider configuration replaceable so a free/local model can be used if available.
- **Matching:** score shared interests, compatible stated preferences, and potential deal-breakers; show the factors behind every ranking. Do not use protected traits or pretend the ranking is certain.
- **Hosting and sharing:** deploy the Next.js app from the public GitHub repository to Vercel Hobby. Share the generated `*.vercel.app` URL; a custom domain is optional and costs money. Add the Apify token and Actor IDs as server-side deployment environment variables. Never put secrets in GitHub or browser code. The first version keeps each visitor's pool in their own browser; a shared pre-run demo across browsers needs a hosted database in a later pass.

## Three-hour first build

This is a time-boxed first pass, not a promise that sourcing 25 people, resolving blocked profiles, recording, and publishing are all possible inside three hours.

1. **0:00–0:20 — Skeleton:** create the Next.js app, basic navigation, Supabase schema, environment template, and sample person record.
2. **0:20–0:55 — Add and ingest:** build the single-person URL entry and validation; connect Apify server-side; normalize returned data and show run progress/errors. Make adding the next person a repeatable action.
3. **0:55–1:25 — Profiles:** create the source-grounded analysis prompt and profile page; display evidence links and uncertainty.
4. **1:25–2:05 — Dates:** implement the short multi-round agent conversation and transcript pages, then save the results.
5. **2:05–2:30 — Rankings:** implement per-person ranking, reasons, and navigation to profiles and date transcripts.
6. **2:30–3:00 — Demo and handoff:** prepare the demo pool, deploy from GitHub, check the shared URL and main flow, prepare the public repo, and draft the video walkthrough.

## Demo dataset and video

Prepare at least 25 real adults, adding them one at a time. Each person needs their own LinkedIn public-profile URL and public Instagram URL. Use the same two links as the only source inputs for that person. Confirm the URLs correspond to the same person; keep a source-status field for unavailable, private, or mismatched profiles rather than filling gaps from elsewhere. For public presentation, use people who have agreed to take part and to appear in the demo/video. The user-facing site should support a useful one-person-at-a-time workflow; the pre-run example is accumulated by repeating that flow until the pool has 25 people.

The three-minute video should show the finished run in this order:

- **0:00–0:25:** paste a person's two URLs and add the profile; show that the same step can be repeated to build the pool.
- **0:25–1:05:** show an agent reading its two sources and its resulting profile page (needs/preferences, hobbies, interests, evidence).
- **1:05–2:10:** show actual agent-date transcripts, including questions, responses, and how the agents reach a decision.
- **2:10–2:45:** show the 25-person demo and open a person's final ranking with explanations.
- **2:45–3:00:** show the live add-URLs flow and briefly explain the stack.

## Deliverables and completion checklist

- [ ] Working site accepts one LinkedIn + public Instagram URL pair per addition, can repeat additions, and reports ingestion failures.
- [ ] Each person has an inspectable source-grounded profile before rankings are shown.
- [ ] Agents have visible dates and saved transcripts.
- [ ] Every person has a ranked match list with explanations.
- [ ] A pre-run example contains at least 25 real people with both links and can be opened without entering data.
- [ ] Public GitHub repository and shareable Vercel deployment URL; adding profiles works from the live site and persists in that browser.
- [ ] YouTube walkthrough is at most three minutes and shows profiles, real agent dating, and rankings.
- [ ] Overall explanation (under 200 characters): **“Agents analyze two public profiles, date on each person's behalf, and rank matches with source-linked explanations.”**
- [ ] Technical section names the stack and the exact Apify Actors used, plus how their outputs become profiles.

## Cost guardrail

Use Apify's free allowance only, set conservative Actor limits, and stop before paid usage. Use no paid model API, proxies, or services. Vercel currently offers a free Hobby plan for personal, non-commercial projects. Confirm eligibility and limits before launch, and use the generated Vercel subdomain rather than buying a domain. “$0” means no usage beyond genuinely free allowances; if an Actor's free allowance is exhausted, pause the run instead of incurring a charge.
