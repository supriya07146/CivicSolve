import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getPendingOrganizations,
    approveOrganization,
    rejectOrganization,
    getAdminAnalytics,
    getAdminOverdueProblems,
    getAdminProblems,
} from "../../services/api";

import "../../styles/admin/AdminDashboard.css";


/* ---------- constants ---------- */

const PRIORITY_WEIGHT = { urgent: 0, high: 1, medium: 2, low: 3 };
const QUEUE_ROWS_SHOWN = 5;
const DAY_MS = 24 * 60 * 60 * 1000;


/* ---------- helpers ---------- */

function useCountUp(target, duration = 1000) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let raf;
        const start = performance.now();

        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return value;
}

function smoothPath(points) {
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
}

function monthLabel(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleString("en-GB", { month: "short" });
}

function monthRange(months) {
    if (months.length === 0) return "";
    const fmt = (iso) =>
        new Date(iso).toLocaleString("en-GB", { month: "short", year: "numeric" });
    return months.length === 1
        ? fmt(months[0].iso)
        : `${fmt(months[0].iso)} – ${fmt(months[months.length - 1].iso)}`;
}

function formatOverdue(hours) {
    if (hours >= 48) return `${Math.floor(hours / 24)} days overdue`;
    return `${Math.floor(hours)} hrs overdue`;
}


/* ---------- small pieces ---------- */

function StatCard({ label, value, suffix = "", note, tone, delay }) {
    const shown = useCountUp(value);

    return (
        <div className={`ad-stat ad-stat-${tone}`} style={{ "--d": delay }}>
            <span className="ad-stat-label">{label}</span>
            <strong className="ad-stat-value">{shown}{suffix}</strong>
            <span className="ad-stat-note"><i />{note}</span>
        </div>
    );
}

function TrendChart({ data }) {
    const W = 560, H = 210;
    const padL = 10, padR = 10, padT = 14, padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const highest = Math.max(
        10,
        ...data.map((m) => Math.max(m.reported, m.resolved))
    );
    const maxV = Math.ceil(highest * 1.15);
    const steps = Math.max(data.length - 1, 1);

    const toPoints = (key) =>
        data.map((m, i) => [
            padL + (i / steps) * plotW,
            padT + plotH - (m[key] / maxV) * plotH,
        ]);

    return (
        <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label="Reported and resolved problems trend by month">

            {[0, 1, 2].map((i) => (
                <line
                    key={i}
                    x1={padL} x2={W - padR}
                    y1={padT + (plotH / 2) * i}
                    y2={padT + (plotH / 2) * i}
                    className="ad-chart-grid"
                />
            ))}

            {data.length > 1 && (
                <>
                    <path d={smoothPath(toPoints("resolved"))} pathLength="1"
                        className="ad-chart-line ad-chart-resolved" />
                    <path d={smoothPath(toPoints("reported"))} pathLength="1"
                        className="ad-chart-line ad-chart-reported" />
                </>
            )}

            {data.map((m, i) => (
                <text
                    key={m.iso}
                    x={padL + (i / steps) * plotW}
                    y={H - 8}
                    textAnchor="middle"
                    className="ad-chart-label"
                >
                    {m.label}
                </text>
            ))}
        </svg>
    );
}


/* =========================================================
   PAGE
   ========================================================= */

function AdminDashboard() {

    const navigate = useNavigate();

    const [organizations, setOrganizations] = useState([]);
    const [orgLoading, setOrgLoading] = useState(true);

    const [analytics, setAnalytics] = useState(null);
    const [overdueData, setOverdueData] = useState(null);
    const [problemsData, setProblemsData] = useState(null);
    const [dashLoading, setDashLoading] = useState(true);

    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState(null);
    const [snapshotAt, setSnapshotAt] = useState(null);


    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3200);
    };


    const loadOrganizations = async () => {

        try {

            const response = await getPendingOrganizations();

            setOrganizations(response.organizations || []);

        } catch (error) {

            showToast("error", error.message);

        } finally {

            setOrgLoading(false);

        }
    };


    const loadDashboard = async () => {

        const [a, o, p] = await Promise.allSettled([
            getAdminAnalytics(),
            getAdminOverdueProblems(),
            getAdminProblems(),
        ]);

        if (a.status === "fulfilled") setAnalytics(a.value);
        if (o.status === "fulfilled") setOverdueData(o.value);
        if (p.status === "fulfilled") setProblemsData(p.value);

        const failed = [a, o, p].find((r) => r.status === "rejected");
        if (failed) showToast("error", failed.reason.message);

        setSnapshotAt(new Date());
        setDashLoading(false);
    };


    useEffect(() => {

        loadOrganizations();
        loadDashboard();

    }, []);


    const approve = async (id) => {

        setBusyId(id);

        try {

            await approveOrganization(id);

            showToast("success", "Organization approved successfully.");

            await loadOrganizations();

        } catch (error) {

            showToast("error", error.message);

        } finally {

            setBusyId(null);

        }
    };


    const reject = async (id) => {

        setBusyId(id);

        try {

            await rejectOrganization(id);

            showToast("success", "Organization rejected.");

            await loadOrganizations();

        } catch (error) {

            showToast("error", error.message);

        } finally {

            setBusyId(null);

        }
    };


    /* ---------- derived data ---------- */

    const summary = analytics?.summary || {};
    const problemSummary = problemsData?.summary || {};
    const allProblems = problemsData?.problems || [];

    const total = summary.total_problems ?? problemSummary.total ?? 0;
    const resolved = summary.resolved_problems ?? problemSummary.resolved ?? 0;
    const resolveRate = Math.round(summary.resolution_rate ?? 0);

    // open = needs verification, under_review = verified, ready to assign
    const reviewQueueCount = problemSummary.open ?? 0;
    const awaitingCount = problemSummary.under_review ?? 0;
    const inProgressCount = problemSummary.in_progress ?? 0;

    const overdueList = overdueData?.problems || [];
    const overdueCount = overdueData?.count ?? summary.overdue_problems ?? 0;

    const newSinceYesterday = allProblems.filter(
        (p) =>
            p.status === "open" &&
            Date.now() - new Date(p.created_at).getTime() < DAY_MS
    ).length;

    const queueProblems = allProblems
        .filter((p) => p.status === "open" || p.status === "under_review")
        .sort((x, y) => {
            const w =
                (PRIORITY_WEIGHT[x.priority] ?? 9) -
                (PRIORITY_WEIGHT[y.priority] ?? 9);
            return w !== 0
                ? w
                : new Date(y.created_at) - new Date(x.created_at);
        });

    const queueRows = queueProblems.slice(0, QUEUE_ROWS_SHOWN).map((p) => {
        const isOpen = p.status === "open";
        return {
            key: p.id,
            title: `${p.problem_code} · ${p.title}`,
            meta: p.location,
            badge: {
                label: `${p.status_display} · ${p.priority_display}`,
                tone: isOpen ? "amber" : "purple",
            },
            actionLabel: isOpen ? "Verify report" : "Assign team",
            to: isOpen ? "/admin/problems" : "/admin/assignments",
        };
    });

    const totalActionItems = queueProblems.length + organizations.length;
    const queueLoading = dashLoading || orgLoading;

    const workflow = [
        { label: "Review queue", value: reviewQueueCount, tone: "teal" },
        { label: "Awaiting assignment", value: awaitingCount, tone: "indigo" },
        { label: "Overdue", value: overdueCount, tone: "red" },
        { label: "In progress", value: inProgressCount, tone: "amber" },
    ];
    const workflowMax = Math.max(1, ...workflow.map((w) => w.value));

    const trendMonths = (analytics?.problems_by_month || [])
        .slice(-6)
        .map((m) => ({
            iso: m.month,
            label: monthLabel(m.month),
            reported: m.count || 0,
            resolved: m.resolved || 0,
        }));

    const snapshot = snapshotAt
        ? snapshotAt.toLocaleString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: false,
        })
        : "—";

    const alertNames = overdueList
        .slice(0, 2)
        .map((p) => `${p.problem_code} ${p.title}`);


    return (
        <div className="ad-dashboard">

            {/* ===== attention strip ===== */}
            {overdueCount > 0 && (
                <div className="ad-alert">
                    <div className="ad-container ad-alert-inner">
                        <span className="ad-alert-icon">!</span>
                        <p>
                            <b>
                                {overdueCount} overdue problem{overdueCount === 1 ? "" : "s"} need
                                {overdueCount === 1 ? "s" : ""} attention
                            </b>
                            {alertNames.length > 0 && (
                                <> — {alertNames.join(" and ")}
                                    {overdueCount > alertNames.length ? " and more" : ""} passed the
                                    expected date
                                    {overdueList[0] && ` (${formatOverdue(overdueList[0].overdue_hours)})`}.
                                </>
                            )}{" "}
                            <button type="button" onClick={() => navigate("/admin/problems")}>
                                Review updates and recovery plans →
                            </button>
                        </p>
                    </div>
                </div>
            )}


            <div className="ad-container">

                {/* ===== stat cards ===== */}
                <section className="ad-stat-grid">
                    <StatCard tone="teal" label="REPORTED PROBLEMS" value={total}
                        note="All time" delay="0s" />
                    <StatCard tone="amber" label="REVIEW QUEUE" value={reviewQueueCount}
                        note={`${newSinceYesterday} new since yesterday`} delay="0.08s" />
                    <StatCard tone="solid" label="AWAITING ASSIGNMENT" value={awaitingCount}
                        note="Ready for matching" delay="0.16s" />
                    <StatCard tone="indigo" label="RESOLUTION RATE" value={resolveRate} suffix="%"
                        note={`${resolved} of ${total} resolved`} delay="0.24s" />
                </section>


                <div className="ad-main-grid">

                    {/* ================= LEFT ================= */}
                    <div className="ad-col">

                        {/* priority review queue */}
                        <section className="ad-card" style={{ "--d": "0.3s" }}>

                            <div className="ad-card-head">
                                <div>
                                    <h2>Priority review queue</h2>
                                    <p>{totalActionItems} item{totalActionItems === 1 ? "" : "s"} need action</p>
                                </div>
                                <button type="button" className="ad-outline-btn"
                                    onClick={() => navigate("/admin/problems")}>
                                    View all →
                                </button>
                            </div>

                            <div className="ad-table">

                                <div className="ad-table-row ad-table-header">
                                    <span>RECORD</span>
                                    <span>QUEUE / PRIORITY</span>
                                    <span>ACTION</span>
                                </div>

                                {queueLoading && (
                                    <div className="ad-table-empty">Loading review queue...</div>
                                )}

                                {/* problems */}
                                {!queueLoading && queueRows.map((row) => (
                                    <div className="ad-table-row" key={row.key}>
                                        <div>
                                            <strong>{row.title}</strong>
                                            <small>{row.meta}</small>
                                        </div>
                                        <div>
                                            <span className={`ad-badge ad-badge-${row.badge.tone}`}>
                                                {row.badge.label}
                                            </span>
                                        </div>
                                        <div>
                                            <button type="button" className="ad-action-btn"
                                                onClick={() => navigate(row.to)}>
                                                {row.actionLabel} →
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* pending organizations */}
                                {!queueLoading && organizations.map((org) => (
                                    <div className="ad-table-row" key={`org-${org.id}`}>
                                        <div>
                                            <strong>{org.organization_name} · Application</strong>
                                            <small>
                                                {org.organization_type
                                                    ? `${org.organization_type} · `
                                                    : ""}
                                                {org.email}
                                            </small>
                                        </div>
                                        <div>
                                            <span className="ad-badge ad-badge-slate">Documents pending</span>
                                        </div>
                                        <div className="ad-action-pair">
                                            <button type="button" className="ad-action-btn"
                                                disabled={busyId === org.id}
                                                onClick={() => approve(org.id)}>
                                                {busyId === org.id ? "..." : "Approve"}
                                            </button>
                                            <button type="button" className="ad-reject-btn"
                                                disabled={busyId === org.id}
                                                onClick={() => reject(org.id)}>
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {!queueLoading && totalActionItems === 0 && (
                                    <div className="ad-table-empty">
                                        <div className="ad-empty-check">✓</div>
                                        <strong>No pending items</strong>
                                        <small>Everything has been reviewed.</small>
                                    </div>
                                )}

                            </div>

                        </section>


                        {/* trend */}
                        <section className="ad-card" style={{ "--d": "0.4s" }}>

                            <div className="ad-card-head">
                                <div>
                                    <h2>Reported &amp; resolved trend</h2>
                                    <p>
                                        {trendMonths.length > 0
                                            ? `${monthRange(trendMonths)} · Monthly workload`
                                            : "Monthly workload"}
                                    </p>
                                </div>
                            </div>

                            {trendMonths.length > 0 ? (
                                <>
                                    <TrendChart data={trendMonths} />

                                    <div className="ad-legend">
                                        <span><i className="ad-legend-reported" />Reported</span>
                                        <span><i className="ad-legend-resolved" />Resolved</span>
                                    </div>
                                </>
                            ) : (
                                <div className="ad-table-empty">
                                    {dashLoading ? "Loading trend..." : "No data yet."}
                                </div>
                            )}

                        </section>

                    </div>


                    {/* ================= RIGHT ================= */}
                    <div className="ad-col">

                        <section className="ad-card" style={{ "--d": "0.35s" }}>

                            <h2 className="ad-card-title">Workflow health</h2>

                            <div className="ad-health">
                                {workflow.map((w) => (
                                    <div className="ad-health-row" key={w.label}>
                                        <div className="ad-health-top">
                                            <span>{w.label}</span>
                                            <b className={`ad-tone-${w.tone}`}>{w.value}</b>
                                        </div>
                                        <div className="ad-bar">
                                            <span
                                                className={`ad-bar-fill ad-fill-${w.tone}`}
                                                style={{ width: `${(w.value / workflowMax) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </section>


                        <section className="ad-ai" style={{ "--d": "0.45s" }}>

                            <span className="ad-ai-eyebrow"><i />AI ADVISORY</span>

                            <h2>Monitoring priorities</h2>

                            <h3>{overdueCount > 0 ? `${overdueCount} critical item${overdueCount === 1 ? "" : "s"} need attention` : "Workflow operating smoothly"}</h3>

                            <p>
                                {reviewQueueCount > 0
                                    ? `${reviewQueueCount} report${reviewQueueCount === 1 ? "" : "s"} awaiting initial verification. ${organizations.length} organization application${organizations.length === 1 ? "" : "s"} pending review.`
                                    : "All reported items verified. Routine monitoring active across civic categories."}
                            </p>

                            <div className="ad-ai-chips">
                                <span className="ad-chip ad-chip-teal">⛨ {totalActionItems} In Action Queue</span>
                                <span className="ad-chip ad-chip-amber">⚡ {overdueCount} Overdue</span>
                            </div>

                            <button type="button" className="ad-ai-btn"
                                onClick={() => navigate("/admin/analytics")}>
                                Open analytics →
                            </button>

                        </section>


                        <section className="ad-card" style={{ "--d": "0.55s" }}>

                            <h2 className="ad-card-title">Quick Actions</h2>

                            <div className="ad-quick">

                                <button type="button" onClick={() => navigate("/admin/organizations")}>
                                    <span className="ad-quick-icon ad-qi-teal">+</span>
                                    Open review queue
                                </button>

                                <button type="button" onClick={() => navigate("/admin/assignments")}>
                                    <span className="ad-quick-icon ad-qi-dark">✓</span>
                                    Assign pending reports
                                </button>

                                <button type="button" onClick={() => navigate("/admin/analytics")}>
                                    <span className="ad-quick-icon ad-qi-light">◉</span>
                                    View analytics
                                </button>

                            </div>

                            <small className="ad-snapshot">Last snapshot: {snapshot}</small>

                        </section>

                    </div>

                </div>

            </div>


            {toast && (
                <div className={`ad-toast ad-toast-${toast.type}`} role="status">
                    {toast.text}
                </div>
            )}

        </div>
    );
}

export default AdminDashboard;