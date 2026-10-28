"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Person = {
  id: string; name: string; linkedinUrl: string; instagramUrl: string; headline: string;
  about: string; bio: string; linkedinPosts: string; interests: string[]; needs: string[]; note: string; createdAt: string;
};

type DateRecord = { a: string; b: string; score: number; transcript: string[]; reason: string };
const storeKey = "agentic-dating-people-v1";

function getText(person: Person) { return [person.headline, person.about, person.bio, person.linkedinPosts].filter(Boolean).join(" "); }
function shared(a: Person, b: Person) { return a.interests.filter((interest) => b.interests.includes(interest)); }
function dateBetween(a: Person, b: Person): DateRecord {
  const common = shared(a, b);
  const firstInterest = common[0] ?? a.interests[0] ?? "what they enjoy outside work";
  const secondInterest = common[1] ?? b.interests[0] ?? "their favorite way to spend a weekend";
  const aEvidence = getText(a).slice(0, 200) || "their public profile";
  const bEvidence = getText(b).slice(0, 200) || "their public profile";
  const score = Math.min(98, 50 + common.length * 12 + (a.headline && b.headline ? 5 : 0));
  return {
    a: a.id, b: b.id, score,
    reason: common.length ? `They both mention ${common.join(" and ")}.` : "There is not enough shared interest evidence yet, so this is a low-confidence introduction.",
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

  useEffect(() => {
    try { setPeople(JSON.parse(localStorage.getItem(storeKey) || "[]") as Person[]); } catch { setPeople([]); }
    setStorageReady(true);
  }, []);
  useEffect(() => { if (storageReady) localStorage.setItem(storeKey, JSON.stringify(people)); }, [people, storageReady]);

  const dates = useMemo(() => {
    const result: DateRecord[] = [];
    for (let i = 0; i < people.length; i += 1) for (let j = i + 1; j < people.length; j += 1) result.push(dateBetween(people[i], people[j]));
    return result;
  }, [people]);
  const currentPerson = people.find((person) => person.id === active) ?? people[0] ?? null;
  const rankPersonId = selectedRankPerson || people[0]?.id || null;
  const ranked = useMemo(() => {
    if (!rankPersonId) return [];
    const subject = people.find((person) => person.id === rankPersonId);
    if (!subject) return [];
    return people.filter((person) => person.id !== subject.id).map((person) => ({ person, overlap: shared(subject, person), score: dateBetween(subject, person).score })).sort((a, b) => b.score - a.score);
  }, [people, rankPersonId]);

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ linkedinUrl, instagramUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add this profile.");
      setPeople((existing) => [result as Person, ...existing]); setActive((result as Person).id);
      setLinkedinUrl(""); setInstagramUrl(""); setTab("people");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this profile."); }
    finally { setBusy(false); }
  }

  function removePerson(id: string) { setPeople((existing) => existing.filter((person) => person.id !== id)); if (active === id) setActive(null); }

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
        <div className="main-card-head"><div><div className="section-kicker">YOUR PEOPLE <span className="count-dot">{people.length}</span></div><h2>{people.length ? "The pool" : "Your pool starts here"}</h2></div><button className="run-button" disabled={people.length < 2} onClick={() => { setHasRun(true); setTab("dates"); }}>Run agent dates <span>↗</span></button></div>
        <nav className="tabs" aria-label="Site sections">
          <button className={tab === "people" ? "tab active" : "tab"} onClick={() => setTab("people")}>Profiles <span>{people.length}</span></button>
          <button className={tab === "dates" ? "tab active" : "tab"} onClick={() => setTab("dates")}>Agent dates <span>{hasRun ? dates.length : "—"}</span></button>
          <button className={tab === "rankings" ? "tab active" : "tab"} onClick={() => setTab("rankings")}>Rankings <span>{people.length > 1 ? "↗" : "—"}</span></button>
        </nav>
        {tab === "people" && <div className="content-area">
          {people.length === 0 ? <div className="empty-state"><div className="empty-art"><span>♡</span><i>✳</i><b>↗</b></div><h3>No introductions yet</h3><p>Add two profiles to create the first agent and see their analysis here.</p><div className="two-sources"><span>LinkedIn</span><b>+</b><span>Instagram</span></div></div> : <div className="people-layout">
            <div className="people-list">{people.map((person) => <button key={person.id} className={currentPerson?.id === person.id ? "person-row selected" : "person-row"} onClick={() => setActive(person.id)}><span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span><span className="person-row-text"><strong>{person.name}</strong><small>{person.headline || "Profile added"}</small></span><span className="row-arrow">→</span></button>)}</div>
            {currentPerson && <article className="profile-panel"><div className="profile-top"><span className="avatar large">{currentPerson.name.slice(0, 1).toUpperCase()}</span><div><div className="profile-label">AGENT PROFILE</div><h3>{currentPerson.name}</h3><p>{currentPerson.headline || "A little more to learn"}</p></div><button className="remove-button" title="Remove profile" onClick={() => removePerson(currentPerson.id)}>×</button></div>
              <div className="profile-sources"><a href={currentPerson.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn source ↗</a><a href={currentPerson.instagramUrl} target="_blank" rel="noreferrer">Instagram source ↗</a></div>
              <div className="profile-section"><div className="profile-label">INTERESTS FOUND</div>{currentPerson.interests.length ? <div className="chips">{currentPerson.interests.map((interest) => <span key={interest}>{interest}</span>)}</div> : <p className="empty-detail">No clear interests found in the profile text.</p>}</div>
              <div className="profile-section"><div className="profile-label">ABOUT</div><p className="profile-copy">{currentPerson.about || currentPerson.bio || "The sources did not include a readable bio. The agent will avoid guessing."}</p></div>
              {currentPerson.linkedinPosts && <div className="profile-section"><div className="profile-label">LINKEDIN POST TEXT</div><p className="profile-copy">{currentPerson.linkedinPosts.slice(0, 700)}</p></div>}
              <div className="profile-section"><div className="profile-label">NEEDS & PREFERENCES</div><p className="profile-copy">Not stated clearly in the two profiles. The agent will ask, not assume.</p></div>
              <p className="source-footnote">✦ {currentPerson.note}</p>
            </article>}
          </div>}
        </div>}
        {tab === "dates" && <div className="content-area">
          {!hasRun || people.length < 2 ? <div className="empty-state compact"><div className="empty-art date-art"><span>✦</span><i>↗</i></div><h3>Give the agents someone to meet</h3><p>Add at least two profiles, then run their agents. The conversation is a visible simulation based on the two profile sources.</p></div> : <div className="dates-list">{dates.map((date) => { const a = people.find((p) => p.id === date.a)!; const b = people.find((p) => p.id === date.b)!; return <details className="date-card" key={`${date.a}-${date.b}`}><summary><div className="date-pair"><span className="mini-avatar">{a.name[0]}</span>{a.name}<span className="date-x">×</span><span className="mini-avatar alt">{b.name[0]}</span>{b.name}</div><span className="date-score">{date.score}% fit <b>⌄</b></span></summary><div className="date-reason">{date.reason}</div><div className="transcript">{date.transcript.slice(0, 5).map((line, index) => <p key={index} className={index % 2 ? "bubble right" : "bubble"}>{line}</p>)}</div><div className="simulation-note">SIMULATED AGENT CONVERSATION · BASED ON THESE TWO PROFILES</div></details>; })}</div>}
        </div>}
        {tab === "rankings" && <div className="content-area">
          {people.length < 2 ? <div className="empty-state compact"><div className="empty-art"><span>↗</span><i>♡</i></div><h3>Rankings appear after introductions</h3><p>Add at least two people. Each person will get their own ordered list of potential fits.</p></div> : <div className="ranking-layout"><div className="ranking-picker"><div className="profile-label">RANK MATCHES FOR</div><select value={rankPersonId || ""} onChange={(e) => setSelectedRankPerson(e.target.value)}>{people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></div><p className="ranking-caption">A transparent sort based on shared interests in the two profiles. It is a conversation starter, not a promise of compatibility.</p><div className="rank-list">{ranked.map(({ person, overlap, score }, index) => <button className="rank-row" key={person.id} onClick={() => { setActive(person.id); setTab("people"); }}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span className="avatar">{person.name[0]}</span><span className="rank-name"><strong>{person.name}</strong><small>{overlap.length ? `Both mention ${overlap.join(", ")}` : "Not enough shared interests found yet"}</small></span><span className="rank-score">{score}<small>FIT</small></span></button>)}</div></div>}
        </div>}
      </section>
    </section>

    <section id="how" className="how-section"><div className="section-kicker">A LITTLE LESS SWIPING <span>MORE GETTING TO KNOW</span></div><h2>How the agents meet</h2><div className="how-grid"><div><span className="how-number">01</span><h3>Read the person</h3><p>Two public profile links become a short, evidence-grounded profile. Unclear details stay unclear.</p></div><div><span className="how-number">02</span><h3>Meet another agent</h3><p>Agents compare interests and ask the kind of questions their person might care about.</p></div><div><span className="how-number">03</span><h3>Bring back a feeling</h3><p>See their conversation and a ranked list with the reasons behind each introduction.</p></div></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">♥</span> the test</a><span>Made for curious hearts and their agents.</span><span className="footer-stamp">A SIMULATION, NOT A SUBSTITUTE FOR A REAL DATE</span></footer>
  </main>;
}
