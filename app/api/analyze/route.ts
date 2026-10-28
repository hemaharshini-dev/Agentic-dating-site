import { NextResponse } from "next/server";

type ProfileInput = { instagramUrl: string; linkedinUrl: string };

function validUrl(value: string, host: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function instagramUsername(profileUrl: string) {
  const url = new URL(profileUrl);
  const username = url.pathname.split("/").filter(Boolean)[0] || "";
  const reservedRoutes = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "direct", "about"]);
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username) || /^[._]+$/.test(username) || reservedRoutes.has(username.toLowerCase())) {
    throw new Error("Use an Instagram profile URL, for example https://www.instagram.com/username/.");
  }
  return username;
}

async function runActor(actorId: string, actorInput: Record<string, unknown>) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("Apify is not configured yet. Add APIFY_API_TOKEN and both Actor IDs to the server environment.");
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=60&memory=256`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(actorInput),
    cache: "no-store",
    signal: AbortSignal.timeout(65_000),
  });
  if (!response.ok) throw new Error(`Apify Actor ${actorId} returned ${response.status}. Check its ID, input schema, and free usage.`);
  const result: unknown = await response.json();
  if (!Array.isArray(result) || result.length === 0) throw new Error(`Actor ${actorId} returned no profile data.`);
  return result as Record<string, unknown>[];
}

function asText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function nestedRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ProfileInput;
    if (!validUrl(body.linkedinUrl, "linkedin.com") || !validUrl(body.instagramUrl, "instagram.com")) {
      return NextResponse.json({ error: "Enter one valid https://linkedin.com profile URL and one https://instagram.com public profile URL." }, { status: 400 });
    }
    const instagramActor = process.env.APIFY_INSTAGRAM_ACTOR_ID;
    const linkedinActor = process.env.APIFY_LINKEDIN_ACTOR_ID;
    if (!instagramActor || !linkedinActor) {
      return NextResponse.json({ error: "Add APIFY_INSTAGRAM_ACTOR_ID and APIFY_LINKEDIN_ACTOR_ID to the server environment. Each Actor needs a matching input adapter." }, { status: 503 });
    }

    let username: string;
    try {
      username = instagramUsername(body.instagramUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Enter an Instagram profile URL." }, { status: 400 });
    }
    const [instagramItems, linkedinItems] = await Promise.all([
      runActor(instagramActor, { usernames: [username], includeAboutSection: false }),
      runActor(linkedinActor, { targetUrls: [body.linkedinUrl], maxPosts: 3 }),
    ]);
    const instagram = instagramItems[0];
    const linkedin = linkedinItems[0];
    if (!instagram || !linkedin) throw new Error("One of the Actors returned no profile data.");
    if (instagram.isPrivate === true || instagram.is_private === true || instagram.private === true) {
      return NextResponse.json({ error: "That Instagram profile is private. Only public profiles can be added." }, { status: 422 });
    }
    const linkedinAuthor = nestedRecord(linkedin, "author");
    const linkedinName = asText(linkedinAuthor, ["name"]) || asText(linkedin, ["name", "fullName", "full_name"]) || [asText(linkedin, ["firstName", "first_name"]), asText(linkedin, ["lastName", "last_name"])].filter(Boolean).join(" ");
    const name = linkedinName || asText(instagram, ["fullName", "full_name", "name", "username"]) || "Profile";
    const headline = asText(linkedin, ["headline", "occupation", "jobTitle", "title"]) || asText(linkedinAuthor, ["info", "headline", "occupation"]);
    const bio = asText(instagram, ["biography", "bio", "description"]);
    const linkedinPosts = linkedinItems.map((item) => asText(item, ["text", "content", "postText", "postContent", "description", "commentary"])).filter(Boolean).join("\n\n");
    const about = asText(linkedin, ["about", "summary"]);
    const sourceText = [headline, about, bio, linkedinPosts].filter(Boolean).join(" ");
    const interestWords = ["hiking", "travel", "music", "food", "reading", "art", "fitness", "photography", "cooking", "running", "film", "design", "technology", "nature", "coffee", "dancing", "yoga", "books", "volunteering"];
    const interests = interestWords.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(sourceText));

    return NextResponse.json({
      id: crypto.randomUUID(), name, linkedinUrl: body.linkedinUrl, instagramUrl: body.instagramUrl,
      headline, about, bio, linkedinPosts, interests,
      needs: [],
      note: interests.length ? "Interests are extracted from visible profile text. No relationship needs were stated clearly in the sources." : "The two source profiles did not provide enough text to infer interests or relationship needs. Review the source links and add another profile to enable dates.",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not analyze these profiles.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
