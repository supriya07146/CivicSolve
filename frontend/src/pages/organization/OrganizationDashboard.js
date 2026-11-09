import React, { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import "../../styles/organization/OrganizationDashboard.css";
import { getOrganizationImageUrl } from "../../components/organization/OrganizationLayout";
import { API_ROOT } from "../../services/api";


const API_URL = `${API_ROOT}/organization/dashboard/`;

/*
  Keep these in sync with the routes in your router.
  Verified against OrganizationLayout.js: dashboard, available-problems,
  active-problems, resolved-problems, solutions, progress, notifications, profile.
*/
const ROUTES = {
  available: "/organization/available-problems",
  active: "/organization/active-problems",
  resolved: "/organization/resolved-problems",
  solutions: "/organization/solutions",
  progress: "/organization/progress",
  profile: "/organization/profile",
  // accept-problems is not in OrganizationLayout, so assignments are reviewed on Available Problems.
  // If App.js really has an /organization/accept-problems route, keep your old value.
  accept: "/organization/available-problems",
};

const fmt = (value) => Number(value || 0).toLocaleString("en-IN");

/* ---------- hooks / helpers ---------- */
function useCountUp(target, active, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (!active) return setValue(0);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || end === 0) return setValue(end);
    let raf;
    let start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

function CountUp({ value, loading, suffix = "" }) {
  const shown = useCountUp(value, !loading);
  if (loading) return <span className="od-skeleton" />;
  return (
    <>
      {fmt(shown)}
      {suffix}
    </>
  );
}

/* fades/slides a block in when it scrolls into view */
function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${className} od-reveal${seen ? " in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}

function statusInfo(item) {
  const key = String(item.assignment_status || "").toLowerCase();
  let info = { label: key.replaceAll("_", " ") || "Open", tone: "amber", progress: 10 };
  if (key.includes("pending") || key.includes("assigned"))
    info = { label: "Review & accept", tone: "amber", progress: 5 };
  else if (key.includes("progress")) info = { label: "Update progress", tone: "violet", progress: 55 };
  else if (key.includes("verif") || key.includes("await"))
    info = { label: "Awaiting confirmation", tone: "teal", progress: 90 };
  else if (key.includes("resolv") || key.includes("complet"))
    info = { label: "Completed", tone: "green", progress: 100 };
  else if (key.includes("accept")) info = { label: "Start work", tone: "teal", progress: 20 };

  const own = Number(item.progress);
  if (Number.isFinite(own) && item.progress !== null && item.progress !== undefined) {
    info.progress = Math.max(0, Math.min(100, own));
  }
  return info;
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6
      } ${p2.x},${p2.y}`;
  }
  return d;
}

/* ---------- illustrations ---------- */

/* hero: a task checklist being ticked off, a location pin and a turning gear */
function HeroArt() {
  const rows = [
    { y: 84, w: 74 },
    { y: 118, w: 60 },
    { y: 152, w: 68 },
  ];
  return (
    <svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle className="od-art-glow" cx="160" cy="124" r="98" fill="rgba(124,231,206,0.12)" />
      <circle cx="160" cy="124" r="98" fill="none" stroke="rgba(123,232,208,0.25)" strokeWidth="1.2" strokeDasharray="3 7" className="od-art-orbit" />

      {/* clipboard */}
      <g className="od-art-board">
        <rect x="96" y="44" width="128" height="160" rx="14" fill="#0d4a4b" stroke="#52e5c6" strokeWidth="2.5" />
        <rect x="128" y="34" width="64" height="20" rx="8" fill="#14c8a4" />
        {rows.map((r, i) => (
          <g key={r.y}>
            <circle cx="122" cy={r.y} r="9" fill="rgba(255,255,255,0.08)" stroke="#52e5c6" strokeWidth="1.8" />
            <path
              className="od-art-check"
              pathLength="1"
              d={`M117.5 ${r.y} l3.5 3.5 l6.5 -7.5`}
              style={{ "--d": `${i * 0.9}s` }}
            />
            <rect x="140" y={r.y - 5} width={r.w} height="10" rx="5" fill="rgba(255,255,255,0.22)" />
          </g>
        ))}
      </g>

      {/* location pin */}
      <g className="od-art-float">
        <path
          d="M254 46c-15 0-26 11-26 25 0 18 26 40 26 40s26-22 26-40c0-14-11-25-26-25z"
          fill="#f5b04c"
        />
        <circle cx="254" cy="71" r="9" fill="#06202b" />
      </g>
      <ellipse className="od-art-ripple" cx="254" cy="122" rx="14" ry="5" fill="none" stroke="#f5b04c" strokeWidth="1.5" />

      {/* gear */}
      <g className="od-art-gear">
        <circle cx="76" cy="176" r="19" fill="none" stroke="#2bdcb8" strokeWidth="6" strokeDasharray="6 6.4" />
        <circle cx="76" cy="176" r="12" fill="none" stroke="#2bdcb8" strokeWidth="2.4" />
        <circle cx="76" cy="176" r="3.5" fill="#2bdcb8" />
      </g>
    </svg>
  );
}

function StatIcon({ kind }) {
  const p = { viewBox: "0 0 48 48", className: `od-stat-icon ${kind}`, "aria-hidden": true };
  if (kind === "assigned")
    return (
      <svg {...p}>
        <rect x="11" y="9" width="26" height="33" rx="5" />
        <rect x="18" y="5" width="12" height="7" rx="3" />
        <path d="M17 22h14M17 29h14M17 36h8" />
      </svg>
    );
  if (kind === "active")
    return (
      <svg {...p}>
        <circle cx="24" cy="24" r="15" />
        <path className="od-hand" d="M24 14v10l7 4" />
      </svg>
    );
  if (kind === "resolved")
    return (
      <svg {...p}>
        <circle cx="24" cy="24" r="16" />
        <path className="od-tick" pathLength="1" d="M16 25l6 6 11-13" />
      </svg>
    );
  return (
    <svg {...p}>
      <path className="od-tick" pathLength="1" d="M8 36l10-11 8 6 14-18" />
      <path d="M31 13h9v9" />
    </svg>
  );
}

function Ring({ percent, loading }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const p = loading ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <svg className="od-ring" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r={r} className="od-ring-track" />
      <circle cx="48" cy="48" r={r} className="od-ring-fill" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - p / 100) }} />
    </svg>
  );
}

function Gears() {
  return (
    <svg className="od-gears" viewBox="0 0 90 70" aria-hidden="true">
      <g className="od-gear a">
        <circle cx="30" cy="30" r="14" className="teeth" />
        <circle cx="30" cy="30" r="9" className="body" />
        <circle cx="30" cy="30" r="3" className="hub" />
      </g>
      <g className="od-gear b">
        <circle cx="60" cy="46" r="10" className="teeth" />
        <circle cx="60" cy="46" r="6" className="body" />
        <circle cx="60" cy="46" r="2.2" className="hub" />
      </g>
    </svg>
  );
}

/* little road with a truck driving along the bottom of the workload card */
function MiniRoad() {
  return (
    <svg className="od-miniroad" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="22" width="300" height="8" fill="rgba(0,0,0,.28)" />
      <line x1="0" y1="26" x2="300" y2="26" className="od-road-dash" />
      <g className="od-minitruck">
        <rect x="0" y="9" width="20" height="12" rx="2" fill="#f5b04c" />
        <rect x="20" y="12" width="10" height="9" rx="2" fill="#ffd98a" />
        <circle cx="6" cy="22" r="3" fill="#06202b" stroke="#fff" strokeWidth="1" />
        <circle cx="24" cy="22" r="3" fill="#06202b" stroke="#fff" strokeWidth="1" />
      </g>
    </svg>
  );
}

function PerformanceChart({ data }) {
  const W = 640;
  const H = 210;
  const top = 14;
  const bottom = 12;
  const max = Math.max(1, ...data.map((d) => Math.max(+d.reported || 0, +d.resolved || 0)));
  const stepX = data.length > 1 ? (W - 20) / (data.length - 1) : 0;
  const build = (key) =>
    data.map((d, i) => ({ x: 10 + i * stepX, y: H - bottom - ((+d[key] || 0) / max) * (H - top - bottom) }));
  const rep = build("reported");
  const res = build("resolved");
  const repPath = smoothPath(rep);
  const resPath = smoothPath(res);
  const area = resPath ? `${resPath} L${res[res.length - 1].x},${H} L${res[0].x},${H} Z` : "";

  return (
    <div className="od-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Reported and resolved per month">
        <defs>
          <linearGradient id="odArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#19d3a8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#19d3a8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="od-chart-grid" />
        ))}
        {area && <path d={area} fill="url(#odArea)" className="od-chart-area" />}
        {repPath && <path d={repPath} pathLength="1" className="od-line od-line-reported" />}
        {resPath && <path d={resPath} pathLength="1" className="od-line od-line-resolved" />}
      </svg>
      <div className="od-chart-dots">
        {data.map((d, i) => (
          <span
            key={`${d.month}-${i}`}
            className="od-chart-dot"
            style={{ left: `${((10 + i * stepX) / W) * 100}%`, top: `${(res[i].y / H) * 100}%` }}
            title={`${d.month}: ${d.reported || 0} reported · ${d.resolved || 0} resolved`}
          />
        ))}
      </div>
      <div className="od-chart-months">
        {data.map((d, i) => (
          <span key={`${d.month}-${i}`}>{d.month}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ card, index, loading }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Reveal as="article" className={`od-stat od-stat-${card.tone}`} style={{ "--i": index }} onMouseMove={onMove}>
      <StatIcon kind={card.icon} />
      <span className="od-stat-label">{card.label}</span>
      <div className="od-stat-number">
        <CountUp value={card.value} loading={loading} suffix={card.suffix} />
      </div>
      <span className="od-stat-note">{card.note}</span>
    </Reveal>
  );
}

/* ---------- page ---------- */
function OrganizationDashboard() {
  const outlet = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(API_URL, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401) throw new Error("Your session has expired. Please log in again.");
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || "Unable to load dashboard.");
        }
        setData(await response.json());
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Unable to connect to the server.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, [reloadKey]);

  const stats = data?.stats || {};
  const org = data?.organization || {};
  const assignments = data?.next_assignments || [];
  const priorities = data?.priorities || [];
  const performance = data?.performance || [];

  useEffect(() => {
    if (org.name) {
      outlet?.setOrg?.((prev) => {
        const base = { ...prev, name: org.name };
        if (org.profile_image_url) {
          base.profile_image_url = getOrganizationImageUrl(org.profile_image_url);
        }
        return base;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.name, org.profile_image_url]);

  const rate = Number.isFinite(Number(stats.completion_rate)) ? Number(stats.completion_rate) : 0;
  const pendingAcceptance = Number(stats.pending_acceptance) || 0;
  const pendingVerification = Number(stats.pending_verification) || 0;

  const cards = [
    { label: "Assigned this month", value: stats.assigned_this_month, tone: "teal", icon: "assigned", note: `${fmt(pendingAcceptance)} awaiting acceptance` },
    { label: "Active work", value: stats.active_work, tone: "amber", icon: "active", note: "Accepted and in progress" },
    { label: "Resolved this month", value: stats.resolved_this_month, tone: "accent", icon: "resolved", note: `${fmt(pendingVerification)} awaiting verification` },
    { label: "Completion rate", value: rate, suffix: "%", tone: "indigo", icon: "rate", note: "Of all assigned problems" },
  ];

  const topPriority = priorities[0];
  const alert = topPriority
    ? { text: `${topPriority.title}${topPriority.location ? ` · ${topPriority.location}` : ""} needs your attention.`, cta: "Review it", to: ROUTES.active }
    : pendingAcceptance > 0
      ? { text: `${fmt(pendingAcceptance)} assignment${pendingAcceptance === 1 ? " is" : "s are"} waiting for you to accept.`, cta: "Review assignments", to: ROUTES.accept }
      : { text: "You're all caught up. New assignments will show up here.", cta: "Browse problems", to: ROUTES.available };

  const tips = [
    alert,
    { text: "Regular progress updates keep citizens informed and build trust.", cta: "Update progress", to: ROUTES.progress },
    { text: "Verified solutions lift your completion rate.", cta: "See resolved", to: ROUTES.resolved },
  ];

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % 3), 6000);
    return () => clearInterval(id);
  }, []);
  const tip = tips[tipIndex];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="od-root">
      {/* ---------- Hero ---------- */}
      <section className="od-hero">
        <span className="od-orb od-orb-a" aria-hidden="true" />
        <span className="od-orb od-orb-b" aria-hidden="true" />

        <div className="od-hero-copy">
          <span className="od-eyebrow">Community workspace · Organization</span>
          <h1>
            {greeting}, {org.name || "team"} <span className="od-spark">✨</span>
          </h1>
          <p>
            Small actions. Real progress. Here's what's happening
            {org.service_area ? ` in ${org.service_area}` : " in your service area"}.
          </p>
          <Link to={ROUTES.active} className="od-cta">
            <span>＋</span> View active problems
          </Link>
        </div>

        <div className="od-hero-art" aria-hidden="true">
          <HeroArt />
        </div>
      </section>

      {/* ---------- Rotating tip strip ---------- */}
      <div className="od-ticker" role="status">
        <div className="od-wrap od-ticker-inner">
          <span className="od-ticker-pulse" />
          <span className="od-tip" key={tipIndex}>
            {tip.text} <Link to={tip.to}>{tip.cta} →</Link>
          </span>
          <span className="od-tip-dots" aria-hidden="true">
            {tips.map((_, i) => (
              <i key={i} className={i === tipIndex ? "on" : ""} />
            ))}
          </span>
        </div>
      </div>

      <div className="od-wrap od-body">
        {error && (
          <div className="od-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
          </div>
        )}

        <section className="od-stats">
          {cards.map((card, i) => (
            <StatCard key={card.label} card={card} index={i} loading={loading} />
          ))}
        </section>

        <div className="od-grid">
          <div className="od-col">
            <Reveal as="article" className="od-panel">
              <div className="od-panel-head">
                <div>
                  <h3>Your next actions</h3>
                  <p>
                    {loading
                      ? "Loading assignments…"
                      : `${assignments.length} assignment${assignments.length === 1 ? "" : "s"} tracked`}
                  </p>
                </div>
                <div className="od-head-actions">
                  <button
                    type="button"
                    className={`od-pill-link od-pill-btn${loading ? " spinning" : ""}`}
                    onClick={() => setReloadKey((k) => k + 1)}
                  >
                    <span>↻</span> Refresh
                  </button>
                  <Link to={ROUTES.active} className="od-pill-link">View all →</Link>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="od-empty">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <rect x="12" y="10" width="40" height="46" rx="6" />
                    <path d="M22 24h20M22 33h20M22 42h11" />
                  </svg>
                  <strong>{loading ? "Loading…" : "No outstanding assignments"}</strong>
                  <p>New assignments will appear here as soon as they're sent to you.</p>
                  {!loading && <Link to={ROUTES.available} className="od-pill-link">Browse available problems</Link>}
                </div>
              ) : (
                <div className="od-table-wrap">
                  <table className="od-table">
                    <thead>
                      <tr>
                        <th>Assignment</th>
                        <th>Assigned</th>
                        <th>Next action</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((item, i) => {
                        const info = statusInfo(item);
                        return (
                          <tr key={item.assignment_id} style={{ "--i": i }}>
                            <td>
                              <strong>{item.title}</strong>
                              <small>
                                {item.problem_code?.slice(0, 8)}
                                {item.location ? ` · ${item.location}` : ""}
                                {item.priority ? ` · ${item.priority} priority` : ""}
                              </small>
                            </td>
                            <td className="od-muted">
                              {item.assigned_at
                                ? new Date(item.assigned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                : "—"}
                            </td>
                            <td><span className={`od-tag od-tag-${info.tone}`}>{info.label}</span></td>
                            <td>
                              <div className="od-progress">
                                <div className="od-progress-track">
                                  <span className={`od-progress-fill od-tag-${info.tone}`} style={{ "--p": info.progress / 100 }} />
                                </div>
                                <small>{info.progress}%</small>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Reveal>

            <Reveal as="article" className="od-panel od-panel-dark od-performance">
              <div className="od-panel-head">
                <div>
                  <h3>Team performance</h3>
                  <p>Reported and resolved workload · last 6 months</p>
                </div>
                <Link to={ROUTES.resolved} className="od-pill-link od-pill-light">Full report</Link>
              </div>
              {performance.length > 0 ? (
                <>
                  <PerformanceChart data={performance} />
                  <div className="od-legend">
                    <span><i className="reported" /> Reported</span>
                    <span><i className="resolved" /> Resolved</span>
                  </div>
                </>
              ) : (
                <div className="od-chart-empty">
                  {loading ? "Loading performance data…" : "Performance data will appear as assignments are recorded."}
                </div>
              )}
            </Reveal>
          </div>

          <div className="od-col">
            <Reveal as="article" className="od-panel" style={{ "--i": 1 }}>
              <div className="od-panel-head">
                <div><h3>Today's priorities</h3></div>
                <span className="od-count">{priorities.length}</span>
              </div>
              {priorities.length === 0 ? (
                <div className="od-empty od-empty-compact">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle cx="32" cy="32" r="22" />
                    <path d="M22 33l7 7 13-15" />
                  </svg>
                  <strong>No high-priority items</strong>
                  <p>You're all caught up for now.</p>
                </div>
              ) : (
                <div className="od-priorities">
                  {priorities.map((item, i) => (
                    <div className={`od-priority${i === 0 ? " first" : ""}`} key={item.assignment_id}>
                      <span className={`od-dot ${item.priority}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.location || "Location not provided"}</small>
                        <em className={item.priority}>{item.priority}</em>
                      </div>
                      <Link to={ROUTES.active} aria-label={`View ${item.title}`}>View →</Link>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>

            <Reveal as="article" className="od-panel od-panel-dark od-workload" style={{ "--i": 2 }}>
              <Gears />
              <span className="od-kicker"><i /> Workload</span>
              <div className="od-workload-row">
                <div className="od-ring-wrap">
                  <Ring percent={rate} loading={loading} />
                  <span className="od-ring-value"><CountUp value={rate} loading={loading} suffix="%" /></span>
                </div>
                <div>
                  <h3><CountUp value={stats.active_work} loading={loading} /> active</h3>
                  <p>{fmt(stats.total_assignments)} assignments all-time</p>
                </div>
              </div>
              <Link to={ROUTES.profile} className="od-btn od-btn-primary od-btn-block">
                Manage organization profile
              </Link>
              <MiniRoad />
            </Reveal>

            <Reveal as="article" className="od-panel od-quick" style={{ "--i": 3 }}>
              <h3>Quick actions</h3>
              <Link to={ROUTES.accept} className="od-quick-item">
                <span className="od-quick-icon teal">+</span>
                <span><strong>Accept new assignments</strong><small>Review assigned problems</small></span>
                <b>{fmt(pendingAcceptance)}</b>
              </Link>
              <Link to={ROUTES.solutions} className="od-quick-item">
                <span className="od-quick-icon violet">✦</span>
                <span><strong>Pending verification</strong><small>Solutions awaiting review</small></span>
                <b>{fmt(pendingVerification)}</b>
              </Link>
              <Link to={ROUTES.active} className="od-quick-item">
                <span className="od-quick-icon green">✓</span>
                <span><strong>Total assignments</strong><small>All-time workload</small></span>
                <b>{fmt(stats.total_assignments)}</b>
              </Link>
            </Reveal>
          </div>
        </div>

        <footer className="od-footer">
          <span>© {new Date().getFullYear()} CivicSolve · Community • Action • Impact</span>
          <span>{org.service_area || "Organization workspace"}</span>
        </footer>
      </div>
    </div>
  );
}

export default OrganizationDashboard;