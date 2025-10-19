import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("plan");

  // -------- Subjects (name, targetHours, examDate) --------
  const [subjects, setSubjects] = useState([]); // [{name, targetHours, examDate}]
  const [form, setForm] = useState({ name: "", targetHours: 10, examDate: "" });

  // -------- Study Sessions (logging) --------
  const [sessions, setSessions] = useState([]); // [{subject, hours, dateISO}]

  // -------- Tutor chat (kept from before) --------
  const [tutorInput, setTutorInput] = useState("");
  const [chat, setChat] = useState([
    { who: "bot", text: "Hi! Ask me to explain a topic or quiz you. Try: “explain recursion”, “quiz dynamic programming”, or “motivation”." }
  ]);
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // ------- THEME -------
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", !isDark);
  };

  // ====== Derived data ======

  // hours logged per subject
  const loggedBySubject = useMemo(() => {
    const map = {};
    for (const s of sessions) map[s.subject] = (map[s.subject] || 0) + Number(s.hours || 0);
    return map;
  }, [sessions]);

  // percentage progress per subject
  const progress = useMemo(() => {
    const map = {};
    for (const subj of subjects) {
      const done = loggedBySubject[subj.name] || 0;
      const target = Number(subj.targetHours || 0);
      map[subj.name] = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    }
    return map;
  }, [subjects, loggedBySubject]);

  // next 14-day simple plan (remaining hours ÷ remaining days)
  const simplePlan = useMemo(() => {
    // build an array of upcoming days
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({ date: d, items: [] });
    }

    // for each subject with examDate/target, distribute remaining hours
    subjects.forEach((subj) => {
      const target = Number(subj.targetHours || 0);
      const done = loggedBySubject[subj.name] || 0;
      const remaining = Math.max(0, target - done);

      const examDate = subj.examDate ? new Date(subj.examDate) : null;
      const lastDayIndex = examDate
        ? Math.min(13, Math.max(0, Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))))
        : 13;

      const daysAvailable = lastDayIndex + 1; // inclusive of today
      if (remaining > 0 && daysAvailable > 0) {
        const perDay = remaining / daysAvailable;
        for (let i = 0; i <= lastDayIndex; i++) {
          days[i].items.push({ subject: subj.name, hours: perDay });
        }
      }
    });

    return days;
  }, [subjects, sessions]);

  // ====== Actions ======
  const addSubject = () => {
    const name = form.name.trim();
    if (!name) return;
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setForm({ ...form, name: "" });
      return;
    }
    setSubjects([...subjects, { name, targetHours: Number(form.targetHours || 0), examDate: form.examDate }]);
    setForm({ name: "", targetHours: 10, examDate: "" });
  };

  const removeSubject = (name) => {
    setSubjects(subjects.filter((s) => s.name !== name));
    setSessions(sessions.filter((x) => x.subject !== name)); // clean logs for removed subject
  };

  const updateSubjectField = (name, field, value) => {
    setSubjects((prev) =>
      prev.map((s) => (s.name === name ? { ...s, [field]: field === "targetHours" ? Number(value) : value } : s))
    );
  };

  const [logForm, setLogForm] = useState({ subject: "", hours: 1, date: "" });

  const logStudy = () => {
    const subject = logForm.subject || (subjects[0]?.name ?? "");
    if (!subject) return;
    const hours = Number(logForm.hours || 0);
    const dateISO = logForm.date || new Date().toISOString().slice(0, 10);
    if (hours <= 0) return;
    setSessions([...sessions, { subject, hours, dateISO }]);
    setLogForm({ subject, hours: 1, date: "" });
  };

  // Tutor scripted responses
// Tutor scripted responses (smarter answers + quizzes + motivation)
const tutorRespond = (msg) => {
  const raw = (msg || "").trim();
  const m = raw.toLowerCase();

  // Motivation (catch typos like "motive"/"motiva")
  if (m.includes("motivation") || m.includes("motivate") || m === "motive" || m.includes("motiva")) {
    return "Try a 25/5 sprint: 25 min focused work + 5 min break. Pick one tiny task you can finish now—progress > perfection.";
  }

  // Tiny knowledge base for common topics
  const kb = {
    "pi": "π is the ratio of a circle’s circumference to its diameter (~3.14159). It’s irrational/transcendental and shows up in geometry, trig, probability (Gaussians), and Fourier analysis.",
    "recursion": "A function solves a problem by calling itself on a smaller input until a base case. Define base case(s), ensure progress toward them, and combine results.",
    "bfs": "Breadth-First Search explores a graph level by level using a queue. It finds the shortest path in unweighted graphs.",
    "dfs": "Depth-First Search explores as far as possible along a branch (stack/recursion) before backtracking; useful for cycle detection/topological sort.",
    "bfs vs dfs": "BFS → queue, level-order, shortest paths (unweighted). DFS → stack/recursion, explores deep; good for cycles/toposort. Memory: BFS can blow up on wide graphs; DFS on deep graphs (stack).",
    "dynamic programming": "DP reuses results of overlapping subproblems. Identify state, recurrence, base cases, and computation order (top-down memoization or bottom-up tabulation).",
    "binary search": "Searches sorted data by halving the range each step; maintain an invariant over [lo, hi). Time O(log n).",
    "big o": "Asymptotic upper bound on growth. Common: O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n).",
    "linked list": "Nodes with {value, next}. O(1) insert/delete at head; O(n) random access. Variants: doubly-linked, circular.",
    "logistic regression": "Models P(y=1|x)=σ(w·x+b). Trained with cross-entropy. Outputs probabilities; pick a threshold for classification.",
    "sorting": "Quicksort (avg O(n log n), in-place), mergesort (O(n log n), stable), heapsort (O(n log n), in-place). Choose based on stability/memory/data shape."
  };

  // Simple aliases
  const aliases = {
    "bfs and dfs": "bfs vs dfs",
    "time complexity": "big o",
    "big-o": "big o",
    "linkedlist": "linked list",
    "sorting algorithms": "sorting",
    "pi number": "pi",
    "logit": "logistic regression"
  };
  const normalize = (t) => aliases[(t || "").toLowerCase().trim()] || (t || "").toLowerCase().trim();

  // EXPLAIN …
  if (m.startsWith("explain ")) {
    const topicRaw = raw.slice(8).trim();
    const t = normalize(topicRaw);
    if (kb[t]) return kb[t];
    return `Quick way to learn "${topicRaw}":\n• Define it in one sentence.\n• Tiny example (2–3 lines).\n• One edge case.\n• 2–3 takeaways.`;
  }

  // QUIZ …
  if (m.startsWith("quiz ")) {
    const topicRaw = raw.slice(5).trim();
    const t = normalize(topicRaw);
    const quizzes = {
      "binary search": [
        "1) State the invariant for lo/hi.",
        "2) When do you stop (lo<hi or lo<=hi)?",
        "3) How do you find first/last occurrence with duplicates?"
      ],
      "recursion": [
        "1) What’s the base case?",
        "2) How does the input shrink each call?",
        "3) Walk a simple example by hand."
      ],
      "dynamic programming": [
        "1) Define the DP state.",
        "2) Write the recurrence.",
        "3) What order do you compute and why?"
      ],
      "bfs vs dfs": [
        "1) When is BFS strictly better?",
        "2) What data structure does each use?",
        "3) Name a task that specifically needs DFS."
      ],
      "sorting": [
        "1) What is stability and why does it matter?",
        "2) Compare quick/merge/heap by memory and worst-case.",
        "3) Which suits nearly-sorted arrays and why?"
      ]
    };
    if (quizzes[t]) return ["Quick quiz:", ...quizzes[t]].join("\n");
    return `Quick quiz on ${topicRaw}:\n1) Define it in one sentence.\n2) Real-world example.\n3) Two pitfalls.`;
  }

  // Subject-aware nudge (matches user’s subjects)
  const hit = subjects.find((s) => m.includes(String(s.name).toLowerCase()));
  if (hit) {
    return `For ${hit.name}: do 30–45 focused minutes. Write 3 key ideas, a 15-line example, and 3 flashcards (def, use, trap).`;
  }

  // Default help
  return 'Try: "explain recursion", "bfs vs dfs", "quiz binary search", or "motivation".';
};


  const sendTutor = () => {
    const msg = tutorInput.trim();
    if (!msg) return;
    const userMsg = { who: "user", text: tutorInput };
    const botMsg = { who: "bot", text: tutorRespond(tutorInput) };
    setChat((c) => [...c, userMsg, botMsg]);
    setTutorInput("");
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="title">📚 Study Assistant</h1>
          <p className="subtitle">Adaptive schedules • Progress tracking • Tutor (MVP)</p>
        </div>
        <button className="btn secondary" onClick={toggleTheme}>Toggle Theme</button>
      </header>

      {/* Centered Navigation */}
      <nav className="main-nav">
        <button className={activeTab === "plan" ? "active" : ""} onClick={() => setActiveTab("plan")}>Plan</button>
        <button className={activeTab === "subjects" ? "active" : ""} onClick={() => setActiveTab("subjects")}>Subjects</button>
        <button className={activeTab === "tutor" ? "active" : ""} onClick={() => setActiveTab("tutor")}>Tutor</button>
        <button className={activeTab === "progress" ? "active" : ""} onClick={() => setActiveTab("progress")}>Progress</button>
      </nav>

      {/* PLAN (log sessions + simple plan + recent logs) */}
      {activeTab === "plan" && (
        <section className="card">
          <h2>Study Plan</h2>
          <p className="muted">Log a session below. The 14-day plan estimates hours/day based on remaining time.</p>

          <div className="row" style={{ marginTop: 10 }}>
            <select
              className="input"
              value={logForm.subject || (subjects[0]?.name ?? "")}
              onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })}
            >
              {subjects.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min="0.25"
              step="0.25"
              value={logForm.hours}
              onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
              placeholder="Hours"
            />
            <input
              className="input"
              type="date"
              value={logForm.date}
              onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
            />
            <button className="btn brand" onClick={logStudy}>Log</button>
          </div>

          <h3 style={{ marginTop: 20 }}>Next 14 Days (recommended)</h3>
          <div className="table">
            <div className="thead">
              <div>Date</div><div>Subjects • Hours</div>
            </div>
            {simplePlan.map((d, i) => {
              const dateLabel = d.date.toISOString().slice(0, 10);
              const items = d.items
                .map((it) => `${it.subject} ${Math.max(0.25, it.hours).toFixed(1)}h`)
                .join(" · ");
              return (
                <div className="trow" key={i}>
                  <div>{dateLabel}</div>
                  <div className="muted">{items || "—"}</div>
                </div>
              );
            })}
          </div>

          <h3 style={{ marginTop: 20 }}>Recent Logs</h3>
          <div className="table">
            <div className="thead">
              <div>Date</div><div>Subject</div><div>Hours</div>
            </div>
            {[...sessions].slice(-8).reverse().map((s, idx) => (
              <div className="trow" key={idx}>
                <div>{s.dateISO}</div>
                <div>{s.subject}</div>
                <div>{Number(s.hours).toFixed(2)}</div>
              </div>
            ))}
            {sessions.length === 0 && <p className="muted">No logs yet.</p>}
          </div>
        </section>
      )}

      {/* SUBJECTS (add / edit / delete) */}
      {activeTab === "subjects" && (
        <section className="card">
          <h2>Subjects</h2>
          <div className="row">
            <input
              className="input"
              type="text"
              placeholder="Subject name (e.g., Math)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
            />
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              value={form.targetHours}
              onChange={(e) => setForm({ ...form, targetHours: e.target.value })}
              placeholder="Target hours"
            />
            <input
              className="input"
              type="date"
              value={form.examDate}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            />
            <button className="btn brand" onClick={addSubject}>Add</button>
          </div>

          <div className="table" style={{ marginTop: 12 }}>
            <div className="thead">
              <div>Subject</div><div>Target (h)</div><div>Exam</div><div>Actions</div>
            </div>
            {subjects.map((s) => (
              <div className="trow" key={s.name}>
                <div><strong>{s.name}</strong></div>
                <div>
                  <input
                    className="input small"
                    type="number"
                    min="0"
                    step="1"
                    value={s.targetHours}
                    onChange={(e) => updateSubjectField(s.name, "targetHours", e.target.value)}
                  />
                </div>
                <div>
                  <input
                    className="input small"
                    type="date"
                    value={s.examDate || ""}
                    onChange={(e) => updateSubjectField(s.name, "examDate", e.target.value)}
                  />
                </div>
                <div>
                  <button className="btn danger" onClick={() => removeSubject(s.name)}>Remove</button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <p className="muted">No subjects yet.</p>}
          </div>
        </section>
      )}

      {/* TUTOR (chat) */}
      {activeTab === "tutor" && (
        <section className="card">
          <h2>AI Tutor</h2>
          <p className="muted">Type a question below. I’ll answer with a quick explanation, quiz, or motivation.</p>

          <div className="chat">
            {chat.map((m, idx) => (
              <div key={idx} className={`bubble ${m.who === "user" ? "user" : "bot"}`}>
                <div className="who">{m.who === "user" ? "You" : "Tutor"}</div>
                <pre className="text">{m.text}</pre>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <input
              type="text"
              className="input"
              placeholder="e.g., explain recursion"
              value={tutorInput}
              onChange={(e) => setTutorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTutor()}
              style={{ flex: 1 }}
            />
            <button className="btn brand" onClick={sendTutor}>Send</button>
          </div>
        </section>
      )}

      {/* PROGRESS */}
      {activeTab === "progress" && (
        <section className="card">
          <h2>Progress</h2>
          <div className="table">
            <div className="thead">
              <div>Subject</div><div>Logged / Target</div><div>Progress</div>
            </div>
            {subjects.map((s) => {
              const done = loggedBySubject[s.name] || 0;
              const pct = progress[s.name] || 0;
              return (
                <div className="trow" key={s.name}>
                  <div><strong>{s.name}</strong></div>
                  <div className="muted">{done.toFixed(1)}h / {Number(s.targetHours || 0).toFixed(1)}h</div>
                  <div style={{ minWidth: 180 }}>
                    <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                    <small className="muted">{pct}%</small>
                  </div>
                </div>
              );
            })}
            {subjects.length === 0 && <p className="muted">Add subjects to track progress.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
