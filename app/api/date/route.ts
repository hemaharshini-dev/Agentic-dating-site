import { NextResponse } from "next/server";
import { groqErrorMessage } from "@/lib/groq-error";

type ApprovedProfile = { id: string; name: string; summary?: string; interests?: string[]; hobbies?: string[]; needs?: string[] };

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  if (!apiKey) return NextResponse.json({ error: "Add GROQ_API_KEY to the server environment to run AI agent dates." }, { status: 503 });
  try {
    const body = await request.json() as { a: ApprovedProfile; b: ApprovedProfile };
    if (!body.a?.id || !body.b?.id || body.a.id === body.b.id) return NextResponse.json({ error: "Choose two different approved profiles." }, { status: 400 });
    const compact = (person: ApprovedProfile) => ({ name: person.name, summary: person.summary || "Not provided", interests: person.interests || [], hobbies: person.hobbies || [], explicitlyStatedNeeds: person.needs || [] });
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, temperature: 0.7, max_completion_tokens: 1100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Write a short, playful fictional conversation between two AI representatives on a first date, one representing each person. It is a simulation; never claim the real people met or said this. Use only the approved profile fields in the input. Do not invent personal facts or infer sensitive traits. Let each agent ask one thoughtful question and respond to the other's answer with curiosity. End with an honest compatibility note that names shared ground and unknowns. Return a JSON object with keys transcript (array of strings, alternating speakers and prefixed with the agent name), reason (string), and score (integer 0-100, based only on evidence-backed common ground). If information is sparse, explicitly say confidence is low." },
          { role: "user", content: JSON.stringify({ agentA: compact(body.a), agentB: compact(body.b) }) },
        ],
      }),
      cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return NextResponse.json({ error: await groqErrorMessage(response, model) }, { status: response.status });
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Groq returned no date transcript.");
    const result = JSON.parse(content) as { transcript?: unknown; reason?: unknown; score?: unknown };
    if (!Array.isArray(result.transcript) || result.transcript.length < 3) throw new Error("Groq returned an incomplete date transcript. Try again.");
    return NextResponse.json({ a: body.a.id, b: body.b.id, transcript: result.transcript.map(String), reason: String(result.reason || "The agents shared a short introduction."), score: Math.max(0, Math.min(100, Number(result.score) || 0)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run this agent date.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
