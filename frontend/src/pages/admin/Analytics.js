
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    getAdminAnalytics,
    getAdminOverdueProblems,
    getAdminEscalatedProblems,
    updateAdminProblemEscalation,
    getAdminAIInsights,
} from "../../services/api";

import "../../styles/admin/Analytics.css";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatNumber = (value) => {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number.toLocaleString() : "0";
};

const formatPercent = (value) => {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : "0.0%";
};

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
};

const formatHours = (value) => {
    const hours = Number(value);
    if (!Number.isFinite(hours)) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    return `${(hours / 24).toFixed(1)} days`;
};

const formatShortTime = (value) => {
    const hours = Number(value);
    if (!Number.isFinite(hours)) return "—";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
};

const humanize = (value) => {
    if (!value) return "Unknown";

    return String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatMonth = (value) => {
    if (!value) return "—";

    let date = new Date(value);

    if (
        Number.isNaN(date.getTime()) &&
        /^\d{4}-\d{2}$/.test(String(value))
    ) {
        date = new Date(`${value}-01`);
    }

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
    });
};

const ACCENTS = ["teal", "navy", "indigo", "amber"];
const EMPTY_STATUSES = [];

/* ------------------------------------------------------------------ */
/* Presentational components                                           */
/* ------------------------------------------------------------------ */

function StatCard({ title, value, subtitle, tone }) {
    return (
        <article className={`an-stat an-stat-${tone}`}>
            <span>{title}</span>
            <strong>{value}</strong>
            <em>● {subtitle}</em>
        </article>
    );
}

function BarChart({
    title,
    subtitle,
    data,
    labelKey,
    valueKey,
    emptyText,
    formatLabel = humanize,
}) {
    const rows = Array.isArray(data) ? data : [];

    const maximum = Math.max(
        1,
        ...rows.map((item) => Number(item[valueKey] ?? 0))
    );

    return (
        <section className="an-card">
            <div className="an-card-head">
                <div>
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>

                <span className="an-pill-chip">
                    {rows.length} items
                </span>
            </div>

            {rows.length === 0 ? (
                <div className="an-empty">
                    {emptyText || "No data available yet."}
                </div>
            ) : (
                <div className="an-bars">
                    {rows.map((item, index) => {
                        const value = Number(item[valueKey] ?? 0);

                        const width = Math.max(
                            value > 0 ? 3 : 0,
                            (value / maximum) * 100
                        );

                        const accent = ACCENTS[index % ACCENTS.length];

                        return (
                            <div
                                className="an-bar"
                                key={`${item[labelKey] || "item"}-${index}`}
                            >
                                <div className="an-bar-top">
                                    <span className="an-bar-label">
                                        {formatLabel(item[labelKey])}
                                    </span>

                                    <span className={`an-bar-value tone-${accent}`}>
                                        {formatNumber(value)}
                                    </span>
                                </div>

                                <div className="an-bar-track">
                                    <div
                                        className={`an-bar-fill fill-${accent}`}
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function TrendChart({ data }) {
    const rows = Array.isArray(data) ? data : [];

    const W = 520;
    const H = 230;
    const padL = 36;
    const padR = 14;
    const padT = 14;
    const padB = 30;

    const values = rows.map((item) => Number(item.count ?? 0));
    const maximum = Math.max(1, ...values);

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const points = values.map((value, index) => ({
        x:
            padL +
            (values.length === 1
                ? innerW / 2
                : (index / (values.length - 1)) * innerW),
        y: padT + innerH - (value / maximum) * innerH,
        value,
        label: formatMonth(rows[index].month),
    }));

    const line = points
        .map(
            (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
        )
        .join(" ");

    const baseline = padT + innerH;

    const area = points.length
        ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`
        : "";

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        y: padT + innerH - t * innerH,
        label: Math.round(t * maximum),
    }));

    const labelEvery = Math.ceil(points.length / 8) || 1;

    return (
        <section className="an-card">
            <div className="an-card-head">
                <div>
                    <h2>Reported problems over time</h2>
                    <p>Monthly problem reports</p>
                </div>

                <span className="an-pill-chip">
                    {rows.length} months
                </span>
            </div>

            {rows.length === 0 ? (
                <div className="an-empty">
                    No monthly data available yet.
                </div>
            ) : (
                <>
                    <svg
                        className="an-trend"
                        viewBox={`0 0 ${W} ${H}`}
                        role="img"
                        aria-label="Line chart of monthly problem reports"
                    >
                        <defs>
                            <linearGradient
                                id="an-area-grad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#12b5a0"
                                    stopOpacity="0.28"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#12b5a0"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                        </defs>

                        {ticks.map((tick) => (
                            <g key={tick.y}>
                                <line
                                    className="an-grid-line"
                                    x1={padL}
                                    x2={W - padR}
                                    y1={tick.y}
                                    y2={tick.y}
                                />

                                <text
                                    className="an-axis-text"
                                    x={padL - 8}
                                    y={tick.y + 3.5}
                                    textAnchor="end"
                                >
                                    {tick.label}
                                </text>
                            </g>
                        ))}

                        <path d={area} fill="url(#an-area-grad)" />
                        <path className="an-line" d={line} />

                        {points.map((point, index) => (
                            <g key={`${point.label}-${index}`}>
                                <circle
                                    className="an-dot"
                                    cx={point.x}
                                    cy={point.y}
                                    r="3.8"
                                >
                                    <title>
                                        {`${point.label}: ${point.value}`}
                                    </title>
                                </circle>

                                {index % labelEvery === 0 && (
                                    <text
                                        className="an-axis-text"
                                        x={point.x}
                                        y={H - 8}
                                        textAnchor="middle"
                                    >
                                        {point.label}
                                    </text>
                                )}
                            </g>
                        ))}
                    </svg>

                    <div className="an-legend">
                        <span><i /> Reported</span>
                    </div>
                </>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* AI insights section                                                 */
/* ------------------------------------------------------------------ */

function AIInsightsSection({
    insights,
    loading,
    error,
    onRefresh,
}) {
    const data = insights?.data || {};

    const categories = data.frequently_reported_categories || [];
    const repeatedLocations = data.repeated_locations || [];
    const attentionAreas = data.areas_requiring_attention || [];
    const resolutionTrends = data.monthly_resolution_trends || [];

    return (
        <section className="an-ai-section">
            <div className="an-ai-header">
                <div className="an-ai-heading">
                    <div className="an-ai-icon">
                        <span>✦</span>
                    </div>

                    <div>
                        <span className="an-ai-eyebrow">
                            CIVICSOLVE INTELLIGENCE
                        </span>
                        <h2>AI-Powered Admin Insights</h2>
                        <p>
                            Data-driven analysis to help administrators
                            identify community issues and priorities.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="an-ai-refresh"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? "Analyzing..." : "↻ Generate insights"}
                </button>
            </div>

            {error && (
                <div className="an-ai-error" role="alert">
                    {error}
                </div>
            )}

            {loading && !insights ? (
                <div className="an-ai-loading">
                    <div className="an-ai-spinner" />
                    <strong>Analyzing CivicSolve records...</strong>
                    <p>
                        Reviewing categories, locations and resolution trends.
                    </p>
                </div>
            ) : !insights ? (
                <div className="an-ai-empty">
                    <strong>AI insights are not available right now.</strong>
                    <p>
                        Please try generating the insights again.
                    </p>
                </div>
            ) : (
                <>
                    <div className="an-ai-status-row">
                        <span className="an-ai-status">
                            <i className={insights.ai_available ? "ai-online" : "ai-fallback"} />
                            {insights.ai_available
                                ? "AI analysis generated"
                                : "Data-based summary"}
                        </span>

                        <span className="an-ai-generated">
                            Updated {formatDate(insights.generated_at)}
                        </span>
                    </div>

                    <div className="an-ai-summary">
                        <div className="an-ai-summary-title">
                            <span>✧</span>
                            <h3>Administrator analysis</h3>
                        </div>

                        <div className="an-ai-summary-content">
                            {insights.summary || "No analysis summary available."}
                        </div>
                    </div>

                    <div className="an-ai-metrics">
                        <article>
                            <span>Total reports</span>
                            <strong>
                                {formatNumber(data.overview?.total_problems)}
                            </strong>
                        </article>

                        <article>
                            <span>Unresolved</span>
                            <strong>
                                {formatNumber(data.overview?.unresolved_problems)}
                            </strong>
                        </article>

                        <article>
                            <span>Overdue</span>
                            <strong>
                                {formatNumber(data.overview?.overdue_problems)}
                            </strong>
                        </article>

                        <article>
                            <span>Resolution rate</span>
                            <strong>
                                {formatPercent(data.overview?.resolution_rate)}
                            </strong>
                        </article>
                    </div>

                    <div className="an-ai-data-grid">
                        <div className="an-ai-data-card">
                            <div className="an-ai-card-heading">
                                <span className="an-ai-small-icon">▤</span>
                                <div>
                                    <h3>Frequently reported categories</h3>
                                    <p>Categories with the highest report counts</p>
                                </div>
                            </div>

                            {categories.length === 0 ? (
                                <div className="an-ai-data-empty">
                                    No category data available.
                                </div>
                            ) : (
                                <div className="an-ai-list">
                                    {categories.map((item, index) => (
                                        <div
                                            className="an-ai-list-item"
                                            key={`${item.category || item.category__name || "category"}-${index}`}
                                        >
                                            <div className="an-ai-list-main">
                                                <strong>
                                                    {item.category || item.category__name || "Unknown category"}
                                                </strong>
                                                <span>
                                                    {formatNumber(item.total_reports)} reports
                                                </span>
                                            </div>

                                            <div className="an-ai-list-details">
                                                <span>
                                                    {formatNumber(item.unresolved_reports)} unresolved
                                                </span>
                                                <span>
                                                    {formatNumber(item.high_priority_reports)} high priority
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="an-ai-data-card">
                            <div className="an-ai-card-heading">
                                <span className="an-ai-small-icon">⌖</span>
                                <div>
                                    <h3>Repeated locations</h3>
                                    <p>Locations appearing in multiple reports</p>
                                </div>
                            </div>

                            {repeatedLocations.length === 0 ? (
                                <div className="an-ai-data-empty">
                                    No repeated locations identified.
                                </div>
                            ) : (
                                <div className="an-ai-list">
                                    {repeatedLocations.map((item, index) => (
                                        <div
                                            className="an-ai-list-item"
                                            key={`${item.location || "location"}-${index}`}
                                        >
                                            <div className="an-ai-list-main">
                                                <strong>
                                                    {item.location || "Unknown location"}
                                                </strong>
                                                <span>
                                                    {formatNumber(item.total_reports)} reports
                                                </span>
                                            </div>

                                            <div className="an-ai-list-details">
                                                <span>
                                                    {formatNumber(item.unresolved_reports)} unresolved
                                                </span>
                                                <span>
                                                    {formatNumber(item.high_priority_reports)} high priority
                                                </span>
                                                <span>
                                                    {formatNumber(item.escalated_reports)} escalated
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="an-ai-data-grid">
                        <div className="an-ai-data-card an-ai-attention-card">
                            <div className="an-ai-card-heading">
                                <span className="an-ai-small-icon attention-icon">!</span>
                                <div>
                                    <h3>Areas requiring attention</h3>
                                    <p>Locations flagged by unresolved, overdue or priority reports</p>
                                </div>
                            </div>

                            {attentionAreas.length === 0 ? (
                                <div className="an-ai-data-empty">
                                    No locations currently meet the attention criteria.
                                </div>
                            ) : (
                                <div className="an-ai-list">
                                    {attentionAreas.map((item, index) => (
                                        <div
                                            className="an-ai-list-item"
                                            key={`${item.location || "attention"}-${index}`}
                                        >
                                            <div className="an-ai-list-main">
                                                <strong>
                                                    {item.location || "Unknown location"}
                                                </strong>
                                                <span className="an-ai-attention-label">
                                                    Review recommended
                                                </span>
                                            </div>

                                            <div className="an-ai-list-details">
                                                <span>
                                                    {formatNumber(item.total_reports)} reports
                                                </span>
                                                <span>
                                                    {formatNumber(item.unresolved_reports)} unresolved
                                                </span>
                                                <span>
                                                    {formatNumber(item.high_priority_reports)} high priority
                                                </span>
                                                <span>
                                                    {formatNumber(item.escalated_reports)} escalated
                                                </span>
                                                <span>
                                                    {formatNumber(item.overdue_reports)} overdue
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="an-ai-data-card">
                            <div className="an-ai-card-heading">
                                <span className="an-ai-small-icon">◷</span>
                                <div>
                                    <h3>Resolution-time trends</h3>
                                    <p>Monthly average time for resolved problems</p>
                                </div>
                            </div>

                            {resolutionTrends.length === 0 ? (
                                <div className="an-ai-data-empty">
                                    No monthly resolution-time data available.
                                </div>
                            ) : (
                                <div className="an-ai-list">
                                    {resolutionTrends.map((item, index) => (
                                        <div
                                            className="an-ai-list-item"
                                            key={`${item.month || "month"}-${index}`}
                                        >
                                            <div className="an-ai-list-main">
                                                <strong>{formatMonth(item.month)}</strong>
                                                <span>
                                                    {formatNumber(item.resolved_count)} resolved
                                                </span>
                                            </div>

                                            <div className="an-ai-resolution-value">
                                                Average resolution time:{" "}
                                                <strong>
                                                    {formatHours(item.average_resolution_hours)}
                                                </strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="an-ai-disclaimer">
                        <span>ⓘ</span>
                        <p>
                            These insights are generated from available CivicSolve
                            records. Recommendations support administrative review;
                            they do not guarantee resolution dates or establish
                            causes for reported issues.
                        </p>
                    </div>
                </>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Analytics() {
    const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);

    const [dashboard, setDashboard] = useState(null);
    const [overdue, setOverdue] = useState([]);
    const [escalated, setEscalated] = useState([]);

    const [insights, setInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [insightsError, setInsightsError] = useState("");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [updatingCode, setUpdatingCode] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);

    const overdueRef = useRef(null);

    /* ---------------- AI insights loading ---------------- */

    const loadAIInsights = useCallback(async () => {
        setInsightsLoading(true);
        setInsightsError("");

        try {
            const response = await getAdminAIInsights();
            setInsights(response);
        } catch (err) {
            setInsightsError(
                err.message || "Unable to generate AI insights."
            );
        } finally {
            setInsightsLoading(false);
        }
    }, []);

    /* ---------------- dashboard data loading ---------------- */

    const loadAnalytics = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");
        setActionError("");

        try {
            const [
                dashboardData,
                overdueData,
                escalatedData,
            ] = await Promise.all([
                getAdminAnalytics(),
                getAdminOverdueProblems(),
                getAdminEscalatedProblems(),
            ]);

            setDashboard(dashboardData);

            setOverdue(
                Array.isArray(overdueData.problems)
                    ? overdueData.problems
                    : []
            );

            setEscalated(
                Array.isArray(escalatedData.problems)
                    ? escalatedData.problems
                    : []
            );

            setUpdatedAt(new Date());
        } catch (err) {
            setError(
                err.message || "Unable to load analytics. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }

        await loadAIInsights();
    }, [loadAIInsights]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    /* ---------------- popup keyboard handling ---------------- */

    useEffect(() => {
        if (!isAIInsightsOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsAIInsightsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isAIInsightsOpen]);

    /* ---------------- escalation action ---------------- */

    const handleEscalation = async (problemCode, nextValue) => {
        if (!problemCode) {
            setActionError(
                "This problem does not have a problem code."
            );
            return;
        }

        setUpdatingCode(problemCode);
        setActionError("");

        try {
            await updateAdminProblemEscalation(
                problemCode,
                nextValue
            );

            await loadAnalytics(true);
        } catch (err) {
            setActionError(
                err.message || "Unable to update escalation status."
            );
        } finally {
            setUpdatingCode(null);
        }
    };

    /* ---------------- derived data ---------------- */

    const summary = dashboard?.summary || {};

    const categories = dashboard?.problems_by_category || [];
    const months = dashboard?.problems_by_month || [];
    const locations = dashboard?.problems_by_location || [];
    const statuses = dashboard?.problems_by_status || EMPTY_STATUSES;
    const organizations = dashboard?.organization_performance || [];

    const statusTotal = useMemo(
        () =>
            statuses.reduce(
                (sum, item) => sum + Number(item.count ?? 0),
                0
            ),
        [statuses]
    );

    const topStatusIndex = useMemo(() => {
        let best = -1;
        let max = -1;

        statuses.forEach((item, index) => {
            const count = Number(item.count ?? 0);

            if (count > max) {
                max = count;
                best = index;
            }
        });

        return best;
    }, [statuses]);

    const jumpToOverdue = () => {
        overdueRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const rateTone = (rate) => {
        const number = Number(rate ?? 0);

        if (number >= 80) return "good";
        if (number >= 60) return "mid";

        return "low";
    };

    /* ---------------- render ---------------- */

    if (loading) {
        return (
            <div className="analytics-page">
                <div className="an-container">
                    <div className="an-loading">
                        <div className="an-spinner" />
                        <p>Loading CivicSolve analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-page">

            {/* Attention strip */}

            {Number(summary.overdue_problems) > 0 && (
                <div className="an-banner">
                    <div className="an-container an-banner-inner">
                        <span className="an-banner-icon">!</span>

                        <p>
                            {formatNumber(summary.overdue_problems)} problem
                            {Number(summary.overdue_problems) === 1
                                ? " is"
                                : "s are"} overdue

                            {Number(summary.escalated_problems) > 0
                                ? ` — ${formatNumber(summary.escalated_problems)} escalated for admin attention. `
                                : ". "}

                            <button
                                type="button"
                                onClick={jumpToOverdue}
                            >
                                Review overdue problems →
                            </button>
                        </p>
                    </div>
                </div>
            )}

            <div className="an-container">

                {/* Status bar and AI Insights button */}

                <div className="an-filterbar">
                    <p>
                        <span aria-hidden="true">◔</span>
                        Live data

                        {updatedAt && (
                            <>
                                {" "}· updated{" "}
                                {updatedAt.toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </>
                        )}
                    </p>

                    <div className="an-header-actions">
                        <button
                            type="button"
                            className="an-ai-header-button"
                            onClick={() => setIsAIInsightsOpen(true)}
                            aria-label="Open AI insights"
                            aria-expanded={isAIInsightsOpen}
                            title="AI-Powered Admin Insights"
                        >
                            <span className="an-ai-header-icon">✦</span>
                            <span>AI Insights</span>
                        </button>

                        <button
                            type="button"
                            className="an-ghost-btn"
                            onClick={() => loadAnalytics(true)}
                            disabled={refreshing}
                        >
                            {refreshing ? "Refreshing..." : "↻ Refresh data"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="an-error" role="alert">
                        <strong>Could not load analytics.</strong>
                        <span>{error}</span>

                        <button onClick={() => loadAnalytics()}>
                            Try again
                        </button>
                    </div>
                )}

                {actionError && (
                    <div className="an-error" role="alert">
                        <span>{actionError}</span>

                        <button onClick={() => setActionError("")}>
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Stat cards */}

                <section className="an-stats">
                    <StatCard
                        title="Resolution rate"
                        value={formatPercent(summary.resolution_rate)}
                        subtitle={`${formatNumber(summary.resolved_problems)} / ${formatNumber(summary.total_problems)} reported`}
                        tone="solid"
                    />

                    <StatCard
                        title="Avg resolution time"
                        value={formatShortTime(summary.average_resolution_hours)}
                        subtitle="For resolved problems"
                        tone="teal"
                    />

                    <StatCard
                        title="Overdue problems"
                        value={formatNumber(summary.overdue_problems)}
                        subtitle="Past priority deadline"
                        tone="amber"
                    />

                    <StatCard
                        title="Escalations open"
                        value={formatNumber(summary.escalated_problems)}
                        subtitle="Flagged for admin review"
                        tone="indigo"
                    />
                </section>

                {/* Existing charts */}

                <div className="an-grid">
                    <TrendChart data={months} />

                    <BarChart
                        title="Reports by category"
                        data={categories}
                        labelKey="category__name"
                        valueKey="count"
                    />
                </div>

                <div className="an-grid">
                    <BarChart
                        title="Reports by location"
                        data={locations}
                        labelKey="location"
                        valueKey="count"
                        emptyText="No location data available."
                    />

                    <section className="an-card">
                        <div className="an-card-head">
                            <div>
                                <h2>Current lifecycle distribution</h2>
                                <p>Problems by status</p>
                            </div>

                            <span className="an-pill-chip">
                                {formatNumber(statusTotal)} total
                            </span>
                        </div>

                        {statuses.length === 0 ? (
                            <div className="an-empty">
                                No status data available.
                            </div>
                        ) : (
                            <div className="an-table-wrap">
                                <table className="an-table">
                                    <thead>
                                        <tr>
                                            <th>Stage</th>
                                            <th>Problems</th>
                                            <th>Share</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {statuses.map((item, index) => {
                                            const count = Number(item.count ?? 0);

                                            const share = statusTotal
                                                ? Math.round(
                                                    (count / statusTotal) * 100
                                                )
                                                : 0;

                                            const accent =
                                                ACCENTS[index % ACCENTS.length];

                                            return (
                                                <tr
                                                    key={`${item.status}-${index}`}
                                                >
                                                    <td>
                                                        <strong>
                                                            {humanize(item.status)}
                                                        </strong>
                                                    </td>

                                                    <td>{formatNumber(count)}</td>

                                                    <td>
                                                        <span
                                                            className={`an-share ${
                                                                index === topStatusIndex
                                                                    ? "share-top"
                                                                    : `share-${accent}`
                                                            }`}
                                                        >
                                                            {share}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {/* Organization performance */}

                <section className="an-org">
                    <div className="an-org-head">
                        <h2>Organization performance</h2>
                        <span>{organizations.length} organizations</span>
                    </div>

                    {organizations.length === 0 ? (
                        <div className="an-org-empty">
                            No organization performance data available yet.
                        </div>
                    ) : (
                        <div className="an-org-wrap">
                            <table className="an-org-table">
                                <thead>
                                    <tr>
                                        <th>Organization</th>
                                        <th>Assigned</th>
                                        <th>Completed</th>
                                        <th>Accepted</th>
                                        <th>In progress</th>
                                        <th>Completion rate</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {organizations.map((organization) => (
                                        <tr key={organization.organization_id}>
                                            <td>
                                                <strong>
                                                    {organization.organization__organization_name ||
                                                        "Unnamed organization"}
                                                </strong>
                                            </td>

                                            <td>
                                                {formatNumber(organization.total_assigned)}
                                            </td>

                                            <td>
                                                {formatNumber(organization.completed)}
                                            </td>

                                            <td>
                                                {formatNumber(organization.accepted)}
                                            </td>

                                            <td>
                                                {formatNumber(organization.in_progress)}
                                            </td>

                                            <td>
                                                <span
                                                    className={`an-rate rate-${rateTone(
                                                        organization.completion_rate
                                                    )}`}
                                                >
                                                    {formatPercent(
                                                        organization.completion_rate
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Overdue problems */}

                <section
                    className="an-card an-table-card"
                    ref={overdueRef}
                >
                    <div className="an-card-head">
                        <div>
                            <h2>Overdue problems</h2>
                            <p>
                                Problems that have passed their priority-based
                                deadline.
                            </p>
                        </div>

                        <span className="an-count an-count-amber">
                            {overdue.length} overdue
                        </span>
                    </div>

                    {overdue.length === 0 ? (
                        <div className="an-empty">
                            No overdue problems found.
                        </div>
                    ) : (
                        <div className="an-table-wrap">
                            <table className="an-table an-table-wide">
                                <thead>
                                    <tr>
                                        <th>Problem</th>
                                        <th>Category</th>
                                        <th>Location</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Deadline</th>
                                        <th>Overdue by</th>
                                        <th>Escalation</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {overdue.map((problem) => (
                                        <tr key={problem.problem_code || problem.id}>
                                            <td>
                                                <strong>
                                                    {problem.title || "Untitled problem"}
                                                </strong>
                                                <small>
                                                    {problem.problem_code || problem.id}
                                                </small>
                                            </td>

                                            <td>{problem.category || "—"}</td>
                                            <td>{problem.location || "—"}</td>

                                            <td>
                                                <span
                                                    className={`an-priority priority-${problem.priority || "unknown"}`}
                                                >
                                                    {humanize(problem.priority)}
                                                </span>
                                            </td>

                                            <td>{humanize(problem.status)}</td>
                                            <td>{formatDate(problem.deadline)}</td>

                                            <td className="an-overdue-by">
                                                {formatHours(problem.overdue_hours)}
                                            </td>

                                            <td>
                                                {problem.is_escalated ? (
                                                    <span className="an-state state-escalated">
                                                        Escalated
                                                    </span>
                                                ) : (
                                                    <span className="an-state state-normal">
                                                        Not escalated
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Escalated problems */}

                <section className="an-card an-table-card">
                    <div className="an-card-head">
                        <div>
                            <h2>Escalated problems</h2>
                            <p>
                                Cases flagged by the admin for additional attention.
                            </p>
                        </div>

                        <span className="an-count an-count-red">
                            {escalated.length} escalated
                        </span>
                    </div>

                    {escalated.length === 0 ? (
                        <div className="an-empty">
                            No problems are currently escalated.
                        </div>
                    ) : (
                        <div className="an-table-wrap">
                            <table className="an-table an-table-wide">
                                <thead>
                                    <tr>
                                        <th>Problem</th>
                                        <th>Category</th>
                                        <th>Location</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Escalated at</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {escalated.map((problem) => (
                                        <tr key={problem.problem_code || problem.id}>
                                            <td>
                                                <strong>
                                                    {problem.title || "Untitled problem"}
                                                </strong>
                                                <small>
                                                    {problem.problem_code || problem.id}
                                                </small>
                                            </td>

                                            <td>{problem.category || "—"}</td>
                                            <td>{problem.location || "—"}</td>

                                            <td>
                                                <span
                                                    className={`an-priority priority-${problem.priority || "unknown"}`}
                                                >
                                                    {humanize(problem.priority)}
                                                </span>
                                            </td>

                                            <td>{humanize(problem.status)}</td>
                                            <td>{formatDate(problem.escalated_at)}</td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="an-action-btn"
                                                    disabled={
                                                        updatingCode === problem.problem_code
                                                    }
                                                    onClick={() =>
                                                        handleEscalation(
                                                            problem.problem_code,
                                                            false
                                                        )
                                                    }
                                                >
                                                    {updatingCode === problem.problem_code
                                                        ? "Updating..."
                                                        : "De-escalate"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Footnote */}

                <aside className="an-footnote">
                    <span className="an-footnote-icon">✓</span>

                    <div>
                        <strong>Live analytics</strong>
                        <p>
                            Figures come directly from CivicSolve records.
                            Resolution rate is the share of reported problems
                            that have been resolved.
                        </p>
                    </div>
                </aside>
            </div>

            {/* AI Insights popup */}

            {isAIInsightsOpen && (
                <div
                    className="an-ai-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsAIInsightsOpen(false);
                        }
                    }}
                >
                    <section
                        className="an-ai-popup"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="an-ai-popup-title"
                    >
                        <div className="an-ai-popup-topbar">
                            <div>
                                <span className="an-ai-popup-eyebrow">
                                    CIVICSOLVE INTELLIGENCE
                                </span>

                                <h2 id="an-ai-popup-title">
                                    AI Admin Insights
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="an-ai-close-button"
                                onClick={() => setIsAIInsightsOpen(false)}
                                aria-label="Close AI insights"
                                title="Close"
                            >
                                ×
                            </button>
                        </div>

                        <AIInsightsSection
                            insights={insights}
                            loading={insightsLoading}
                            error={insightsError}
                            onRefresh={loadAIInsights}
                        />
                    </section>
                </div>
            )}
        </div>
    );
}

export default Analytics;
