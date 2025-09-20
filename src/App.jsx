import React, { useMemo, useState, useEffect } from "react";

// -------- helpers --------
const fmt = (d) => new Date(d).toLocaleDateString();
const todayISO = () => new Date().toISOString().slice(0,10);
function daysBetween(aISO, bISO) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}
function dateAdd(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// simple offline “tutor”
function localTutor(message, subjects) {
  const m = message.toLowerCase();
  const subjNames = subjects.map(s => (s.name || "").toLowerCase());

  if (m.startsWith("explain ")) {
    const topic = m.replace("explain ", "");
    return `Explanation for ${topic}: define inputs → process → outputs. Show a tiny example, test one edge case, then summarize in 3 bullets.`;
  }
  if (m.startsWith("quiz ")) {
    const topic = m.replace("quiz ", "");
    return [
      `1) Define ${topic} in one sentence.`,
      `2) Give a real-world example of ${topic}.`,
      `3) List two common pitfalls with ${topic}.`,
    ].join("\n");
  }
  if (m.includes("motivate")) {
    return "Do a 25/5 focus sprint. Progress > perfection. Do the next tiny step right now.";
  }
  const hit = subjNames.find(n => n && m.includes(n));
  if (hit) {
    return `For ${hit}: write 3 key ideas, a 15-line demo, and 3 flashcards (definition, application, trap).`;
  }
  return "Try: `explain dynamic programming`, `quiz transformers`, or type a subject name.";
}

// schedule generator
function generatePlan(subjects, prefs) {
  const start = todayISO();
  const plan = {}; // {date: [{name, hours}]}
  const perDayCap = Number(prefs.hoursPerDay || 2);
  const studyDays = new Set(
    (prefs.daysOfWeek?.length ? prefs.daysOfWeek : [1, 2, 3, 4, 5]).map(Number)
  );

  let items = subjects
    .filter(s => s.name && s.hours > 0 && s.examDate)
    .map(s => ({
      name: s.name,
      examDate: s.examDate,
      remaining: Number(s.hours),
      difficulty: Math.min(3, Math.max(1, Number(s.difficulty || 2))),
    }))
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  for (let day = 0; day < 120 && items.some(i => i.remaining > 0); day++) {
    const date = dateAdd(start, day);
    const dow = new Date(date).getDay();
    if (!studyDays.has(dow)) continue;

    let capacity = perDayCap;

    items.sort((a, b) => {
      const ad = new Date(a.examDate) - new Date(date);
      const bd = new Date(b.examDate) - new Date(date);
      if (ad !== bd) return ad - bd;
      return b.difficulty - a.difficulty;
    });

    for (const it of items) {
      if (capacity <= 0 || it.remaining <= 0) continue;
      const daysLeft = Math.max(1, daysBetween(date, it.examDate));
      const target = Math.min(
        it.remaining,
        Math.max(0.5, (it.remaining / daysLeft) * (1 + (it.difficulty - 1) * 0.3))
      );
      const allocation = Math.min(capacity, Number(target.toFixed(2)));
      if (allocation > 0.01) {
        plan[date] = plan[date] || [];
        plan[date].push({ name: it.name, hours: Number(allocation.toFixed(2)) });
        it.remaining = Number((it.remaining - allocation).toFixed(2));
        capacity = Number((capacity - allocation).toFixed(2));
      }
    }
  }
  return plan;
}

function percentComplete(subjects) {
  const total = subjects.reduce((s, x) => s + Number(x.hours || 0), 0);
  const done = subjects.reduce((s, x) => s + Number(x.done || 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// -------- UI --------
function Tab({ id, current, setCurrent, children }) {
  return (
    <button
      className={`tab ${current === id ? "tab--active" : ""}`}
      onClick={() => setCurrent(id)}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <div className="field__label">{label}</div>
      <div className="field__control">{children}</div>
    </label>
  );
}

export default function App() {
  const [tab, setTab] = useState("plan");

  const [subjects, setSubjects] = useLocalStorage("sa_subjects_plain", [
    { id: 1, name: "Algorithms",       examDate: dateAdd(todayISO(), 21), hours: 12, difficulty: 3, notes: "DP + Graphs", done: 0 },
    { id: 2, name: "Machine Learning", examDate: dateAdd(todayISO(), 28), hours: 16, difficulty: 2, notes: "Transformers + Eval", done: 0 },
    { id: 3, name: "Systems",          examDate: dateAdd(todayISO(), 35), hours: 10, difficulty: 2, notes: "Concurrency", done: 0 },
  ]);

  const [prefs, setPrefs] = useLocalStorage("sa_prefs_plain", {
    hoursPerDay: 2,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
  });

  const [chat, setChat] = useLocalStorage("sa_chat_plain", [
    { who: "bot", text: "Hi! Try: `explain dynamic programming`, `quiz transformers`, or type a subject name." }
  ]);
  const [message, setMessage] = useState("");

  const plan = useMemo(() => generatePlan(subjects, prefs), [subjects, prefs]);
  const totalPct = percentComplete(subjects);

  const addSubject = () => {
    setSubjects(s => [
      ...s,
      { id: Date.now(), name: "", examDate: todayISO(), hours: 5, difficulty: 2, notes: "", done: 0 },
    ]);
  };
  const removeSubject = (id) => setSubjects(s => s.filter(x => x.id !== id));
  const handleSubjectChange = (id, field, value) => {
    setSubjects(s => s.map(x => (x.id === id ? { ...x, [field]: value } : x)));
  };
  const markHours = (id, delta) => {
    setSubjects(s =>
      s.map(x =>
        x.id === id
          ? {
              ...x,
              done: Math.max(0, Math.min(Number(x.hours || 0), Number(((x.done || 0) + delta).toFixed(2)))),
            }
          : x
      )
    );
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const userMsg = { who: "user", text: message };
    const botMsg  = { who: "bot",  text: localTutor(message, subjects) };
    setChat(c => [...c, userMsg, botMsg]);
    setMessage("");
  };

  const upcoming = useMemo(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const d = dateAdd(todayISO(), i);
      const items = plan[d] || [];
      out.push({ date: d, items, total: items.reduce((s, x) => s + x.hours, 0) });
    }
    return out;
  }, [plan]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="title">AI-Powered Personal Study Assistant</h1>
          <div className="subtitle">Adaptive schedules • Chat help • Progress tracking (no Tailwind)</div>
        </div>
        <div className="badge">MVP</div>
      </header>

      <nav className="tabs">
        <Tab id="plan"     current={tab} setCurrent={setTab}>Plan</Tab>
        <Tab id="subjects" current={tab} setCurrent={setTab}>Subjects</Tab>
        <Tab id="tutor"    current={tab} setCurrent={setTab}>Tutor</Tab>
        <Tab id="progress" current={tab} setCurrent={setTab}>Progress</Tab>
      </nav>

      {/* PLAN */}
      {tab === "plan" && (
        <section className="card">
          <h2 className="card__title">Next 14 days</h2>
          <div className="grid">
            {upcoming.map(({ date, items, total }) => (
              <div key={date} className="tile">
                <div className="tile__top">
                  <div className="tile__date">{fmt(date)}</div>
                  <div className="tile__hours">{total.toFixed(2)}h</div>
                </div>
                <ul className="tile__list">
                  {items.length === 0 && <li className="muted">No study planned</li>}
                  {items.map((it, idx) => (
                    <li key={idx} className="row">
                      <span>{it.name}</span>
                      <span className="muted">{it.hours}h</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUBJECTS */}
      {tab === "subjects" && (
        <>
          <div className="toolbar">
            <h2>Subjects & Exams</h2>
            <button className="btn" onClick={addSubject}>+ Add Subject</button>
          </div>

          <div className="grid">
            {subjects.map(s => (
              <section key={s.id} className="card">
                <div className="row gap">
                  <Field label="Subject">
                    <input
                      className="input"
                      value={s.name}
                      placeholder="e.g., Algorithms"
                      onChange={(e) => handleSubjectChange(s.id, "name", e.target.value)}
                    />
                  </Field>
                  <Field label="Exam Date">
                    <input
                      type="date"
                      className="input"
                      value={s.examDate}
                      onChange={(e) => handleSubjectChange(s.id, "examDate", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="row gap">
                  <Field label="Total Hours">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className="input"
                      value={s.hours}
                      onChange={(e) => handleSubjectChange(s.id, "hours", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Difficulty (1–3)">
                    <input
                      type="number"
                      min={1}
                      max={3}
                      className="input"
                      value={s.difficulty}
                      onChange={(e) => handleSubjectChange(s.id, "difficulty", Number(e.target.value))}
                    />
                  </Field>
                  <Field label=" ">
                    <button className="btn danger" onClick={() => removeSubject(s.id)}>Remove</button>
                  </Field>
                </div>

                <Field label="Notes">
                  <textarea
                    className="textarea"
                    value={s.notes}
                    placeholder="Key topics, chapters, labs…"
                    onChange={(e) => handleSubjectChange(s.id, "notes", e.target.value)}
                  />
                </Field>

                <div className="row space-between">
                  <div className="row gap">
                    <button className="btn ghost" onClick={() => markHours(s.id, +0.5)}>+0.5h</button>
                    <button className="btn ghost" onClick={() => markHours(s.id, -0.5)}>-0.5h</button>
                  </div>
                  <div className="muted small">Done: {s.done ?? 0} / {s.hours}h</div>
                </div>
              </section>
            ))}
          </div>

          <section className="card">
            <h3>Preferences</h3>
            <div className="row gap">
              <Field label="Target Study Hours / Day">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="input"
                  value={prefs.hoursPerDay}
                  onChange={(e) => setPrefs(p => ({ ...p, hoursPerDay: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Study Days (0=Sun…6=Sat)">
                <input
                  className="input"
                  value={prefs.daysOfWeek?.join(",")}
                  onChange={(e) =>
                    setPrefs(p => ({
                      ...p,
                      daysOfWeek: e.target.value
                        .split(",")
                        .map(x => Number(x.trim()))
                        .filter(x => !Number.isNaN(x)),
                    }))
                  }
                />
              </Field>
            </div>
            <div className="muted small">Example: 1,2,3,4,5 for Mon–Fri</div>
          </section>
        </>
      )}

      {/* TUTOR */}
      {tab === "tutor" && (
        <section className="card">
          <h2 className="card__title">Chat Tutor</h2>
          <div className="chat">
            {chat.map((m, idx) => (
              <div key={idx} className={`bubble ${m.who === "user" ? "bubble--user" : "bubble--bot"}`}>
                <div className="bubble__who">{m.who === "user" ? "You" : "Tutor"}</div>
                <pre className="bubble__text">{m.text}</pre>
              </div>
            ))}
          </div>
          <div className="row gap">
            <input
              className="input flex1"
              placeholder="Try: explain dynamic programming"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="btn" onClick={sendMessage}>Send</button>
          </div>
        </section>
      )}

      {/* PROGRESS */}
      {tab === "progress" && (
        <section className="card">
          <h2 className="card__title">Overall Progress</h2>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${totalPct}%` }} />
          </div>
          <div className="muted small">{totalPct}% complete</div>

          <div className="grid">
            {subjects.map(s => {
              const pct = Math.min(100, Math.round(((s.done || 0) / (s.hours || 1)) * 100));
              return (
                <div key={s.id} className="tile">
                  <div className="row space-between">
                    <div className="tile__date">{s.name || "Untitled"}</div>
                    <div className="badge badge--outline">Due {fmt(s.examDate)}</div>
                  </div>
                  <div className="progress small">
                    <div className="progress__bar" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="muted small">{s.done || 0} / {s.hours || 0} hours</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="footer">
        Built for a CS/AI Capstone — Offline MVP (no external UI libs). State persists in localStorage.
      </footer>
    </div>
  );
}
