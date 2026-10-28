"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Person = {
  id: string; name: string; linkedinUrl: string; instagramUrl: string; headline: string;
  about: string; bio: string; linkedinPosts: string; interests: string[]; hobbies?: string[];
  needs: string[]; summary?: string; evidence?: string[]; reviewed?: boolean; note: string; createdAt: string;
};

type EditDraft = { summary: string; interests: string; hobbies: string; needs: string };

type DateRecord = { a: string; b: string; score: number | null; transcript: string[]; reason: string };
const storeKey = "agentic-dating-people-v1";
const dateStoreKey = "agentic-dating-dates-v1";
const pairKey = (a: string, b: string) => [a, b].sort().join(":");

function getText(person: Person) { return [person.headline, person.about, person.bio, person.linkedinPosts].filter(Boolean).join(" "); }
function signals(person: Person) {
  return [...new Set([...person.interests, ...(person.hobbies || []), ...person.needs].map((item) => item.trim().toLowerCase()).filter(Boolean))];
}
function shared(a: Person, b: Person) {
  const other = new Set(signals(b));
  return signals(a).filter((signal) => other.has(signal));
}
function dateBetween(a: Person, b: Person): DateRecord {
  const common = shared(a, b);
  const aSignals = signals(a);
  const bSignals = signals(b);
  const firstInterest = common[0] ?? aSignals[0] ?? "what they enjoy outside work";
  const secondInterest = common[1] ?? bSignals[0] ?? "their favorite way to spend a weekend";
  const aEvidence = getText(a).slice(0, 200) || "their public profile";
  const bEvidence = getText(b).slice(0, 200) || "their public profile";
  const hasEnoughSignals = a.reviewed && b.reviewed && aSignals.length > 0 && bSignals.length > 0;
  const allSignals = new Set([...aSignals, ...bSignals]);
  const score = hasEnoughSignals ? Math.round((common.length / allSignals.size) * 100) : null;
  return {
    a: a.id, b: b.id, score,
    reason: !hasEnoughSignals ? "Review both profiles and add at least one interest, hobby, or explicitly stated need to each before scoring." : common.length ? `Shared profile signals: ${common.join(", ")}. This is overlap, not a prediction of relationship success.` : "Both profiles are reviewed, but they have no matching interests, hobbies, or stated needs.",
    transcript: [
      `${a.name}'s agent: I noticed ${firstInterest} in my person's profile. What do you like about it?`,
      `${b.name}'s agent: My person's profile mentions ${secondInterest}. They would probably enjoy hearing how you got into ${firstInterest}.`,
      `${a.name}'s agent: The profiles give us a starting point around ${common.join(", ") || "their public bios"}. What would a good first date feel like for your person?`,
      `${b.name}'s agent: Based only on these two profiles, there is ${common.length ? "some promising common ground" : "not enough evidence to call this a strong fit"}. We should let the people decide for themselves.`,
      `Date summary: ${common.length ? `The agents found common ground in ${common.join(", ")}.` : "The agents could not identify a clear overlap from the available source text."} This is a profile-based simulation, not a real-world date.`,
      `Evidence considered: ${a.name} — ${aEvidence}; ${b.name} — ${bEvidence}.`,
    ],
  };
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [selectedRankPerson, setSelectedRankPerson] = useState<string | null>(null);
  const [tab, setTab] = useState<"people" | "dates" | "rankings">("people");
  const [hasRun, setHasRun] = useState(false);
  const [storageMode, setStorageMode] = useState<"browser" | "database">("browser");
  const [storageError, setStorageError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({ summary: "", interests: "", hobbies: "", needs: "" });
  const [summarizing, setSummarizing] = useState(false);
  const [sessions, setSessions] = useState<Record<string, DateRecord>>({});
  const [dateBusy, setDateBusy] = useState("");

  useEffect(() => {
    const initialize = async () => {
      const db = getSupabaseBrowserClient();
      if (!db) {
        try {
          setPeople(JSON.parse(localStorage.getItem(storeKey) || "[]") as Person[]);
          setSessions(JSON.parse(localStorage.getItem(dateStoreKey) || "{}") as Record<string, DateRecord>);
        } catch { setPeople([]); setSessions({}); }
        setStorageReady(true);
        return;
      }
      setStorageMode("database");
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!session) {
          const { error } = await db.auth.signInAnonymously();
          if (error) throw error;
        }
        const { data, error } = await db.from("people").select("profile").order("created_at", { ascending: false });
        if (error) throw error;
        setPeople((data || []).map((row) => row.profile as Person));
        const { data: savedDates, error: dateError } = await db.from("date_results").select("result");
        if (dateError) throw dateError;
        const dateMap: Record<string, DateRecord> = {};
        for (const row of savedDates || []) {
          const result = row.result as DateRecord;
          dateMap[pairKey(result.a, result.b)] = result;
        }
        setSessions(dateMap);
      } catch (cause) {
        setStorageError(cause instanceof Error ? cause.message : "Could not connect to Supabase. Check setup and Anonymous Sign-Ins.");
      } finally { setStorageReady(true); }
    };
    void initialize();
  }, []);
  useEffect(() => { if (storageReady && storageMode === "browser") localStorage.setItem(storeKey, JSON.stringify(people)); }, [people, storageReady, storageMode]);
  useEffect(() => { if (storageReady && storageMode === "browser") localStorage.setItem(dateStoreKey, JSON.stringify(sessions)); }, [sessions, storageReady, storageMode]);

  const dates = useMemo(() => {
    const result: DateRecord[] = [];
    for (let i = 0; i < people.length; i += 1) for (let j = i + 1; j < people.length; j += 1) {
      const fallback = dateBetween(people[i], people[j]);
      result.push(sessions[pairKey(fallback.a, fallback.b)] || fallback);
    }
    return result;
  }, [people, sessions]);
  const currentPerson = people.find((person) => person.id === active) ?? people[0] ?? null;
  const rankPersonId = selectedRankPerson || people[0]?.id || null;
  const ranked = useMemo(() => {
    if (!rankPersonId) return [];
    const subject = people.find((person) => person.id === rankPersonId);
    if (!subject) return [];
    return people.filter((person) => person.id !== subject.id).map((person) => ({ person, overlap: shared(subject, person), score: dateBetween(subject, person).score })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [people, rankPersonId]);

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ linkedinUrl, instagramUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add this profile.");
      const db = getSupabaseBrowserClient();
      if (db) {
        const { error: saveError } = await db.from("people").insert({ id: result.id, profile: result });
        if (saveError) throw new Error(`Profile was read but could not be saved: ${saveError.message}`);
      }
      setPeople((existing) => [result as Person, ...existing]); setActive((result as Person).id);
      setLinkedinUrl(""); setInstagramUrl(""); setTab("people");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this profile."); }
    finally { setBusy(false); }
  }

  async function savePerson(person: Person) {
    const db = getSupabaseBrowserClient();
    if (db) {
      const { error: saveError } = await db.from("people").upsert({ id: person.id, profile: person, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;
    }
    setPeople((existing) => existing.map((item) => item.id === person.id ? person : item));
  }

  async function removePerson(id: string) {
    const db = getSupabaseBrowserClient();
    if (db) {
      const { error: deleteError } = await db.from("people").delete().eq("id", id);
      if (deleteError) { setError(`Could not delete profile: ${deleteError.message}`); return; }
    }
    setPeople((existing) => existing.filter((person) => person.id !== id));
    setSessions((existing) => Object.fromEntries(Object.entries(existing).filter(([, session]) => session.a !== id && session.b !== id)));
    if (active === id) setActive(null);
  }

  async function runDate(a: Person, b: Person) {
    const key = pairKey(a.id, b.id);
    if (!a.reviewed || !b.reviewed) { setError("Review and save both profiles before their agents date."); return; }
    setDateBusy(key); setError("");
    try {
      const response = await fetch("/api/date", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a, b }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not run this date.");
      const session = result as DateRecord;
      const db = getSupabaseBrowserClient();
      if (db) {
        const { error: saveError } = await db.from("date_results").upsert({ person_a_id: a.id, person_b_id: b.id, result: session }, { onConflict: "owner_id,person_a_id,person_b_id" });
        if (saveError) throw new Error(`Date completed but could not be saved: ${saveError.message}`);
      }
      setSessions((existing) => ({ ...existing, [key]: session }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not run this date."); }
    finally { setDateBusy(""); }
  }

  function startEditing(person: Person) {
    setEditing(true);
    setDraft({ summary: person.summary || "", interests: person.interests.join(", "), hobbies: (person.hobbies || []).join(", "), needs: person.needs.join(", ") });
  }

  async function saveDraft() {
    if (!currentPerson) return;
    const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const updated = { ...currentPerson, summary: draft.summary.trim(), interests: split(draft.interests), hobbies: split(draft.hobbies), needs: split(draft.needs), reviewed: true };
    try { await savePerson(updated); setEditing(false); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save profile edits."); }
  }

  async function summarizePerson(person: Person) {
    setSummarizing(true); setError("");
    try {
      const response = await fetch("/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(person) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not summarize this profile.");
      const labels = (items: unknown) => Array.isArray(items) ? items.map((item) => typeof item === "string" ? item : String(item?.label || "")).filter(Boolean) : [];
      const evidence = ["interests", "hobbies", "relationshipNeeds"].flatMap((field) => Array.isArray(result[field]) ? result[field].map((item: { label?: string; evidence?: string; source?: string }) => item.evidence ? `${item.label || field}: “${item.evidence}” (${item.source || "profile"})` : "") : []).filter(Boolean);
      const updated: Person = { ...person, summary: String(result.summary || ""), interests: labels(result.interests), hobbies: labels(result.hobbies), needs: labels(result.relationshipNeeds), evidence, note: result.confidence || person.note, reviewed: false };
      await savePerson(updated);
      setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not summarize this profile."); }
    finally { setSummarizing(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">♥</span> the test</a><div className="top-note">A dating experiment for agents</div><a className="about-link" href="#how">How it works <span>↗</span></a></header>
    <section className="hero" id="top">
      <div className="eyebrow"><span className="live-dot" /> THE AGENTS ARE READY TO MEET</div>
      <h1>Let your agent<br /><em>make the first move.</em></h1>
      <p className="hero-copy">Add one person's LinkedIn and public Instagram. Their agent will read both, meet other agents, and find a promising introduction.</p>
      <div className="hero-pills"><span>01&nbsp; Read two profiles</span><span>02&nbsp; Let agents meet</span><span>03&nbsp; See the fit</span></div>
    </section>

    <section className="workspace">
      <aside className="add-card">
        <div className="section-kicker">BUILD YOUR POOL <span>{String(people.length).padStart(2, "0")} ADDED</span></div>
        <h2>Introduce someone</h2>
        <p className="muted">One person at a time. Use the public profiles they want to share.</p>
        <form onSubmit={addPerson}>
          <label htmlFor="linkedin">LinkedIn profile <span className="source-tag">SOURCE 01</span></label>
          <div className="input-wrap"><span className="input-icon">in</span><input id="linkedin" type="url" required placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} /></div>
          <label htmlFor="instagram">Public Instagram <span className="source-tag">SOURCE 02</span></label>
          <div className="input-wrap"><span className="input-icon insta">◎</span><input id="instagram" type="url" required placeholder="https://instagram.com/..." value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /></div>
          <button className="primary-button" disabled={busy}>{busy ? <><span className="spinner" /> Reading the two profiles…</> : <>Add to the pool <span>→</span></>}</button>
          {error && <p role="alert" className="error-box">{error}</p>}
        </form>
        <div className="privacy-note"><span>✦</span><p>Only these two links are used as sources. Profile analysis is a starting point, not a verdict.</p></div>
      </aside>

      <section className="main-card">
        <div className="main-card-head"><div><div className="section-kicker">YOUR PEOPLE <span className="count-dot">{people.length}</span></div><h2>{people.length ? "The pool" : "Your pool starts here"}</h2><div className="storage-badge">{storageMode === "database" ? "PRIVATE SUPABASE DATABASE" : "SAVED IN THIS BROWSER"}</div></div><button className="run-button" disabled={people.length < 2} onClick={() => { setHasRun(true); setTab("dates"); }}>Run agent dates <span>↗</span></button></div>
        <nav className="tabs" aria-label="Site sections">
          <button className={tab === "people" ? "tab active" : "tab"} onClick={() => setTab("people")}>Profiles <span>{people.length}</span></button>
          <button className={tab === "dates" ? "tab active" : "tab"} onClick={() => setTab("dates")}>Agent dates <span>{hasRun ? dates.length : "—"}</span></button>
          <button className={tab === "rankings" ? "tab active" : "tab"} onClick={() => setTab("rankings")}>Rankings <span>{people.length > 1 ? "↗" : "—"}</span></button>
        </nav>
        {storageError && <p role="alert" className="error-box storage-error">Database setup needed: {storageError}</p>}
        {error && <p role="alert" className="error-box storage-error">{error}</p>}
        {tab === "people" && <div className="content-area">
          {people.length === 0 ? <div className="empty-state"><div className="empty-art"><span>♡</span><i>✳</i><b>↗</b></div><h3>No introductions yet</h3><p>Add two profiles to create the first agent and see their analysis here.</p><div className="two-sources"><span>LinkedIn</span><b>+</b><span>Instagram</span></div></div> : <div className="people-layout">
            <div className="people-list">{people.map((person) => <button key={person.id} className={currentPerson?.id === person.id ? "person-row selected" : "person-row"} onClick={() => setActive(person.id)}><span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span><span className="person-row-text"><strong>{person.name}</strong><small>{person.headline || "Profile added"}</small></span><span className="row-arrow">→</span></button>)}</div>
            {currentPerson && <article className="profile-panel"><div className="profile-top"><span className="avatar large">{currentPerson.name.slice(0, 1).toUpperCase()}</span><div><div className="profile-label">AGENT PROFILE</div><h3>{currentPerson.name}</h3><p>{currentPerson.headline || "A little more to learn"}</p></div><div className="profile-actions"><button className="small-action" disabled={summarizing} onClick={() => summarizePerson(currentPerson)}>{summarizing ? "Drafting…" : "AI draft"}</button><button className="small-action" onClick={() => editing ? setEditing(false) : startEditing(currentPerson)}>{editing ? "Cancel" : "Edit"}</button><button className="remove-button" title="Remove profile" onClick={() => void removePerson(currentPerson.id)}>×</button></div></div>
              <div className="profile-sources"><a href={currentPerson.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn source ↗</a><a href={currentPerson.instagramUrl} target="_blank" rel="noreferrer">Instagram source ↗</a></div>
              {editing ? <div className="profile-editor">
                <label>Profile summary<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={3} /></label>
                <label>Interests <small>comma separated</small><input value={draft.interests} onChange={(event) => setDraft({ ...draft, interests: event.target.value })} /></label>
                <label>Hobbies <small>comma separated</small><input value={draft.hobbies} onChange={(event) => setDraft({ ...draft, hobbies: event.target.value })} /></label>
                <label>Explicitly stated needs <small>comma separated</small><input value={draft.needs} onChange={(event) => setDraft({ ...draft, needs: event.target.value })} /></label>
                <button className="small-action save-action" onClick={() => void saveDraft()}>Save reviewed profile</button>
              </div> : <>
                <div className="profile-section"><div className="profile-label">AI SUMMARY {currentPerson.reviewed ? "· REVIEWED" : "· DRAFT"}</div><p className="profile-copy">{currentPerson.summary || "No summary yet. Use AI draft, or edit this profile yourself."}</p></div>
                <div className="profile-section"><div className="profile-label">INTERESTS & HOBBIES</div>{currentPerson.interests.length || currentPerson.hobbies?.length ? <div className="chips">{[...currentPerson.interests, ...(currentPerson.hobbies || [])].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div> : <p className="empty-detail">No clear interests found yet. AI draft can summarize the available profile text; you can edit its suggestions.</p>}</div>
                <div className="profile-section"><div className="profile-label">NEEDS & PREFERENCES</div><p className="profile-copy">{currentPerson.needs.length ? currentPerson.needs.join(", ") : "Not stated clearly in the sources. The agent will ask, not assume."}</p></div>
              </>}
              <div className="profile-section"><div className="profile-label">SOURCE TEXT</div><p className="profile-copy">{currentPerson.about || currentPerson.bio || "No profile bio returned."}</p>{currentPerson.linkedinPosts && <p className="profile-copy source-excerpt">LinkedIn posts: {currentPerson.linkedinPosts.slice(0, 700)}</p>}</div>
              {currentPerson.evidence?.length ? <div className="profile-section"><div className="profile-label">EVIDENCE FROM THE TWO SOURCES</div>{currentPerson.evidence.map((item, index) => <p className="profile-copy evidence-line" key={index}>{item}</p>)}</div> : null}
              <p className="source-footnote">✦ {currentPerson.note}</p>
            </article>}
          </div>}
        </div>}
        {tab === "dates" && <div className="content-area">
          {!hasRun || people.length < 2 ? <div className="empty-state compact"><div className="empty-art date-art"><span>✦</span><i>↗</i></div><h3>Give the agents someone to meet</h3><p>Add at least two profiles, review both profile drafts, then run their agents. Each AI date uses only the approved summary and profile facts.</p></div> : <div className="dates-list">{dates.map((date) => { const a = people.find((p) => p.id === date.a)!; const b = people.find((p) => p.id === date.b)!; const key = pairKey(a.id, b.id); const session = sessions[key]; return <details className="date-card" key={key}><summary><div className="date-pair"><span className="mini-avatar">{a.name[0]}</span>{a.name}<span className="date-x">×</span><span className="mini-avatar alt">{b.name[0]}</span>{b.name}</div><span className="date-score">{session ? `${session.score}% fit` : "Not dated"} <b>⌄</b></span></summary><div className="date-reason">{session?.reason || "Run a grounded AI conversation for this pair. Each agent will speak from its person's reviewed profile."}</div>{session ? <div className="transcript">{session.transcript.map((line, index) => <p key={index} className={index % 2 ? "bubble right" : "bubble"}>{line}</p>)}</div> : <button className="small-action run-date-action" disabled={dateBusy === key || !a.reviewed || !b.reviewed} onClick={() => void runDate(a, b)}>{dateBusy === key ? "Agents are talking…" : !a.reviewed || !b.reviewed ? "Review both profiles first" : "Run this agent date"}</button>}<div className="simulation-note">AI-GENERATED SIMULATION · NO REAL PERSON IS CONTACTED</div></details>; })}</div>}
        </div>}
        {tab === "rankings" && <div className="content-area">
          {people.length < 2 ? <div className="empty-state compact"><div className="empty-art"><span>↗</span><i>♡</i></div><h3>Rankings appear after introductions</h3><p>Add at least two people. Each person will get their own ordered list of potential fits.</p></div> : <div className="ranking-layout"><div className="ranking-picker"><div className="profile-label">RANK MATCHES FOR</div><select value={rankPersonId || ""} onChange={(e) => setSelectedRankPerson(e.target.value)}>{people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></div><p className="ranking-caption">Score is the percentage of matching interests, hobbies, and explicitly stated needs in the two reviewed profiles. It measures documented overlap, not romantic compatibility.</p><div className="rank-list">{ranked.map(({ person, overlap, score }, index) => <button className="rank-row" key={person.id} onClick={() => { setActive(person.id); setTab("people"); }}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span className="avatar">{person.name[0]}</span><span className="rank-name"><strong>{person.name}</strong><small>{score === null ? "Review both profiles and add details to score" : overlap.length ? `Shared: ${overlap.join(", ")}` : "No matching profile signals found"}</small></span><span className="rank-score">{score === null ? "—" : `${score}%`}<small>{score === null ? "REVIEW" : "OVERLAP"}</small></span></button>)}</div></div>}
        </div>}
      </section>
    </section>

    <section id="how" className="how-section"><div className="section-kicker">A LITTLE LESS SWIPING <span>MORE GETTING TO KNOW</span></div><h2>How the agents meet</h2><div className="how-grid"><div><span className="how-number">01</span><h3>Read the person</h3><p>Two public profile links become a short, evidence-grounded profile. Unclear details stay unclear.</p></div><div><span className="how-number">02</span><h3>Meet another agent</h3><p>Agents compare interests and ask the kind of questions their person might care about.</p></div><div><span className="how-number">03</span><h3>Bring back a feeling</h3><p>See their conversation and a ranked list with the reasons behind each introduction.</p></div></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">♥</span> the test</a><span>Made for curious hearts and their agents.</span><span className="footer-stamp">A SIMULATION, NOT A SUBSTITUTE FOR A REAL DATE</span></footer>
  </main>;
}
