import React, { useEffect, useState, useRef } from "react";

const messages = [
  "🔌 Looking for the backend...",
  "☕ Giving coffee to sleepy servers...",
  "🧠 Convincing AI to cooperate...",
  "🐹 Charging hamster-powered infrastructure...",
  "📡 Connecting to cloud services...",
  "⚔️ Fighting Render cold starts...",
  "🚀 Almost ready...",
  "🔄 Spinning up containers...",
  "💾 Waking up the database...",
  "🌐 Syncing across regions...",
  "⚡ Optimizing performance...",
  "🔐 Double-checking permissions...",
  "📦 Loading dependencies...",
  "🎯 Calibrating servers...",
  "✨ Adding some sparkle...",
  "🔧 Fine-tuning the API...",
  "🎪 Setting up the circus...",
  "🎨 Painting the UI...",
];

const quips = [
  { min: 0, text: "Render free tier moment 💀" },
  { min: 40, text: '"Good things take time..."' },
  { min: 70, text: '"Still here? We like your patience ❤️"' },
  { min: 88, text: '"Almost done, we promise 🚀"' },
];

const styles = `
  @keyframes fl-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes fl-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-5px); }
  }
  @keyframes fl-bounce {
    0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
    40%           { transform: scale(1);   opacity: 1;   }
  }
  .fl-dot { animation: fl-bounce 1.2s ease-in-out infinite; }
  .fl-dot:nth-child(2) { animation-delay: 0.2s; }
  .fl-dot:nth-child(3) { animation-delay: 0.4s; }
  .fl-coffee { animation: fl-float 2.5s ease-in-out infinite; display: inline-block; }
`;

export default function FunnyLoader() {
  const [progress, setProgress] = useState(0);
  const [randomMessage, setRandomMessage] = useState("");
  const [quip, setQuip] = useState(quips[0].text);

  /* pick ONE random message on mount */
  useEffect(() => {
    const idx = Math.floor(Math.random() * messages.length);
    setRandomMessage(messages[idx]);
  }, []);

  /* progress ticker */
  useEffect(() => {
    const startTime = Date.now();
    const minDuration = 4000;
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const target = (elapsed / minDuration) * 100;
      const next = Math.min(target, 95);
      setProgress(next);
      const active = [...quips].reverse().find((q) => next >= q.min);
      if (active) setQuip(active.text);
      if (elapsed >= minDuration) {
        clearInterval(id);
        setProgress(100);
        setQuip(quips[quips.length - 1].text);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const pct = Math.floor(progress);

  return (
    <>
      <style>{styles}</style>

      <div style={s.page}>
        <div style={s.card}>
          {/* title bar */}
          <div style={s.titleBar}>
            <span style={{ ...s.trafficDot, background: "#ef4444" }} />
            <span style={{ ...s.trafficDot, background: "#facc15" }} />
            <span style={{ ...s.trafficDot, background: "#22c55e" }} />
            <span style={s.barLabel}>server-startup.sh</span>
            <div style={s.liveDots}>
              <span className="fl-dot" style={s.liveDot} />
              <span className="fl-dot" style={s.liveDot} />
              <span className="fl-dot" style={s.liveDot} />
            </div>
          </div>

          {/* body */}
          <div style={s.body}>
            {/* centered hero */}
            <div style={s.hero}>
              <span className="fl-coffee" style={{ fontSize: 40 }}>
                ☕
              </span>
              <p style={s.heroTitle}>Waking up sleepy servers...</p>
              <p style={s.heroSub}>
                Free tier cold start — bribing servers with coffee.
              </p>
            </div>

            {/* single random message — the ONE sentence */}
            <div style={s.msgBox}>
              <span style={s.prompt}>$</span>
              <span style={s.msgText}>{randomMessage}</span>
            </div>

            {/* progress bar */}
            <div style={s.progressMeta}>
              <span style={s.progressLabel}>motivation_level</span>
              <span style={s.progressPct}>{pct}%</span>
            </div>
            <div style={s.track}>
              <div style={{ ...s.fill, width: `${progress}%` }} />
            </div>

            {/* single footer quip */}
            <p style={s.quip}>{quip}</p>
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg, #0f172a 0%, #111827 50%, #1e293b 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    width: "90%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
  },

  /* title bar */
  titleBar: {
    padding: "11px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  trafficDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    display: "inline-block",
  },
  barLabel: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
    marginLeft: 6,
  },
  liveDots: {
    marginLeft: "auto",
    display: "flex",
    gap: 3,
    alignItems: "center",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#f97316",
    display: "inline-block",
  },

  /* body */
  body: { padding: "24px 22px 20px" },

  /* hero — centered, compact */
  hero: { textAlign: "center", marginBottom: 18 },
  heroTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#f8fafc",
    margin: "10px 0 4px",
  },
  heroSub: { fontSize: 12, color: "#64748b", margin: 0 },

  /* message box */
  msgBox: {
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "11px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  prompt: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  msgText: { fontSize: 13, color: "#cbd5e1", fontFamily: "monospace" },

  /* progress */
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 11, color: "#475569", fontFamily: "monospace" },
  progressPct: {
    fontSize: 11,
    fontWeight: 600,
    color: "#f8fafc",
    fontFamily: "monospace",
  },
  track: {
    height: 7,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 14,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #f97316, #fb923c, #f97316)",
    backgroundSize: "200% 100%",
    animation: "fl-shimmer 2s linear infinite",
    transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
  },

  /* quip */
  quip: {
    textAlign: "center",
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    margin: 0,
  },
};
