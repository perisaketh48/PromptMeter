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

const chipDefs = [
  {
    at: 30,
    label: "⚡ Server motivation: rising",
    color: "#92400e",
    bg: "#fef3c7",
  },
  { at: 55, label: "🐹 Hamster RPM stable", color: "#065f46", bg: "#d1fae5" },
  { at: 75, label: "🚀 Backend responding", color: "#1e40af", bg: "#dbeafe" },
];

const styles = `
  @keyframes fl-barShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes fl-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes fl-fadeSlide {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fl-dotBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1);   opacity: 1;   }
  }
  .fl-dot { animation: fl-dotBounce 1.2s ease-in-out infinite; }
  .fl-dot:nth-child(2) { animation-delay: 0.2s; }
  .fl-dot:nth-child(3) { animation-delay: 0.4s; }
  .fl-coffee { animation: fl-float 2.5s ease-in-out infinite; display: inline-block; }
  .fl-chip   { animation: fl-fadeSlide 0.4s ease; }
  .fl-line   { animation: fl-fadeSlide 0.35s ease; }
`;

export default function FunnyLoader() {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [termLines, setTermLines] = useState([
    { text: "$ initializing app...", color: "#6b7280" },
  ]);
  const [chips, setChips] = useState([]);
  const [quip, setQuip] = useState("$ initializing app...");
  const addedChipsRef = useRef(new Set());

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return Math.min(95, prev + Math.random() * 12);
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * messages.length);
      setMsgIdx(randomIdx);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const text = messages[msgIdx];
    const color = msgIdx === messages.length - 1 ? "#22c55e" : undefined;
    setTermLines((prev) => {
      const next = [...prev, { text, color }];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
  }, [msgIdx]);

  useEffect(() => {
    if (progress < 20) setQuip("$ initializing app...");
    else if (progress < 50) setQuip('"Good things take time..."');
    else if (progress < 80) setQuip('"Still here? We like your patience ❤️"');
    else setQuip('"Plot twist: we\'re actually almost done 🚀"');

    chipDefs.forEach((def) => {
      if (progress > def.at && !addedChipsRef.current.has(def.at)) {
        addedChipsRef.current.add(def.at);
        setChips((prev) => [...prev, def]);
        setTermLines((prev) => {
          const next = [...prev, { text: "→ " + def.label, color: "#f97316" }];
          return next.length > 5 ? next.slice(next.length - 5) : next;
        });
      }
    });
  }, [progress]);

  const pct = Math.floor(progress);

  return (
    <>
      <style>{styles}</style>

      <div style={s.page}>
        <div style={s.card}>
          <div style={s.titleBar}>
            <div style={s.dots}>
              <span
                className="fl-dot"
                style={{ ...s.dot, background: "#ef4444" }}
              />
              <span
                className="fl-dot"
                style={{ ...s.dot, background: "#facc15" }}
              />
              <span
                className="fl-dot"
                style={{ ...s.dot, background: "#22c55e" }}
              />
            </div>
            <span style={s.barLabel}>server-startup.sh</span>
            <div style={s.liveDots}>
              <span className="fl-dot" style={s.liveDot} />
              <span className="fl-dot" style={s.liveDot} />
              <span className="fl-dot" style={s.liveDot} />
            </div>
          </div>

          <div style={s.body}>
            <div style={s.heroRow}>
              <span className="fl-coffee" style={{ fontSize: 38 }}>
                ☕
              </span>
              <div>
                <p style={s.heroTitle}>Waking up sleepy servers...</p>
                <p style={s.heroSub}>
                  Our free cloud servers go into deep sleep to save money.
                  <br />
                  We're currently bribing them with coffee.
                </p>
              </div>
            </div>

            <div style={s.divider} />

            <div style={s.terminal}>
              <div style={s.termHeader}>OUTPUT</div>
              {termLines.map((line, i) => (
                <div
                  key={i}
                  className="fl-line"
                  style={{
                    color: line.color || "#e2e8f0",
                    lineHeight: 1.7,
                    fontSize: 13,
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={s.progressMeta}>
                <span style={s.progressLabel}>motivation_level</span>
                <span style={s.progressPct}>{pct}%</span>
              </div>
              <div style={s.track}>
                <div
                  style={{
                    ...s.fill,
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            {chips.length > 0 && (
              <div style={s.chipRow}>
                {chips.map((c, i) => (
                  <span
                    key={i}
                    className="fl-chip"
                    style={{ ...s.chip, background: c.bg, color: c.color }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}

            <div style={s.divider} />

            <div style={s.footer}>
              <span style={s.quip}>{quip}</span>
              <span style={s.footerRight}>Render free tier moment 💀</span>
            </div>
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
    maxWidth: 520,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    overflow: "hidden",
  },
  titleBar: {
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    padding: "13px 18px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  dots: { display: "flex", gap: 6 },
  dot: { width: 11, height: 11, borderRadius: "50%", display: "inline-block" },
  barLabel: { fontSize: 12, color: "#64748b", fontFamily: "monospace" },
  liveDots: {
    marginLeft: "auto",
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#f97316",
    display: "inline-block",
  },

  body: { padding: "26px 28px 24px" },

  heroRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#f8fafc",
    margin: "0 0 4px",
  },
  heroSub: { fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.65 },

  divider: { borderTop: "1px solid rgba(255,255,255,0.07)", margin: "20px 0" },

  terminal: {
    background: "#020617",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "14px 16px",
    minHeight: 110,
    fontFamily: "monospace",
  },
  termHeader: {
    fontSize: 11,
    color: "#475569",
    letterSpacing: "0.07em",
    marginBottom: 10,
  },

  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 12, color: "#64748b", fontFamily: "monospace" },
  progressPct: {
    fontSize: 12,
    fontWeight: 600,
    color: "#f8fafc",
    fontFamily: "monospace",
  },
  track: {
    height: 8,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #f97316, #fb923c, #f97316)",
    backgroundSize: "200% 100%",
    animation: "fl-barShimmer 2s linear infinite",
    transition: "width 1s cubic-bezier(.4,0,.2,1)",
  },

  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 999,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quip: { fontSize: 13, color: "#94a3b8" },
  footerRight: { fontSize: 12, color: "#475569" },
};
