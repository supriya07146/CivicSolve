import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getMyProblems,
} from "../../services/api";
import "../../styles/user/MyProblems.css";

const STATUS_LABELS = {
    open: "Open",
    under_review: "Under Review",
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
};

const PRIORITY_LABELS = {
    low: "Low priority",
    medium: "Medium priority",
    high: "High priority",
    urgent: "Urgent priority",
};

const STATUS_PROGRESS = {
    open: 0,
    under_review: 20,
    assigned: 35,
    in_progress: 65,
    resolved: 100,
    closed: 100,
    rejected: 0,
};

const LIFECYCLE = [
    ["Reported", "reported"],
    ["Under Review", "under_review"],
    ["Assigned", "assigned"],
    ["In Progress", "in_progress"],
    ["Resolved", "resolved"],
    ["Closed", "closed"],
];

const LIFECYCLE_INDEX = {
    open: 0,
    under_review: 1,
    assigned: 2,
    in_progress: 3,
    resolved: 4,
    closed: 5,
};

const LIVE_STATUSES = ["open", "under_review", "assigned", "in_progress"];

const EMPTY_SUMMARY = {
    total: 0,
    open: 0,
    closed: 0,
    resolved: 0,
    rejected: 0,
};

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function shortCode(problem) {
    const code = String(problem.problem_code || problem.id || "");
    return code.length > 13 ? code.slice(0, 8).toUpperCase() : code.toUpperCase();
}

function statusLabel(status) {
    return STATUS_LABELS[status] || String(status || "Unknown").replaceAll("_", " ");
}

function getOrganization(problem) {
    if (problem.assignment_details?.organization_name) {
        return problem.assignment_details.organization_name;
    }

    const assignments = problem.assignments || [];

    if (assignments.length) {
        return (
            assignments[0].organization_details?.organization_name ||
            "Assigned organization"
        );
    }

    return "Not yet assigned";
}

function getProgress(status) {
    return STATUS_PROGRESS[status] ?? 0;
}


/* =========================================================
   SMALL HELPERS
   ========================================================= */

/* numbers count up smoothly when they change */
function CountUp({ value }) {
    const [shown, setShown] = useState(0);
    const fromRef = useRef(0);

    useEffect(() => {
        const target = Number(value) || 0;
        const reduce =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduce) {
            fromRef.current = target;
            setShown(target);
            return undefined;
        }

        const from = fromRef.current;
        const duration = 750;
        const startTime = performance.now();
        let frame;

        const tick = (now) => {
            const p = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const next = Math.round(from + (target - from) * eased);

            fromRef.current = next;
            setShown(next);

            if (p < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <>{shown}</>;
}


/* =========================================================
   ILLUSTRATIONS
   ========================================================= */

/* hero: a report board being tracked */
const HeroArt = () => (
    <svg className="mp-art" viewBox="0 0 400 130" aria-hidden="true">
        <defs>
            <linearGradient id="mpGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="mpPin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7ff5e4" />
                <stop offset="1" stopColor="#12b5a0" />
            </linearGradient>
        </defs>

        {/* sky */}
        <circle className="mp-twinkle" cx="24" cy="16" r="1.5" fill="#fff" />
        <circle className="mp-twinkle mp-d2" cx="214" cy="8" r="1.3" fill="#fff" />
        <circle className="mp-twinkle mp-d3" cx="378" cy="48" r="1.5" fill="#7ff5e4" />
        <circle className="mp-twinkle mp-d4" cx="58" cy="44" r="1.2" fill="#fff" />
        <circle className="mp-twinkle mp-d2" cx="372" cy="20" r="9" fill="#ffd447" opacity="0.8" />

        {/* skyline */}
        <g fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)">
            <rect x="6" y="78" width="28" height="52" rx="4" />
            <rect x="38" y="60" width="24" height="70" rx="4" />
            <rect x="66" y="92" width="22" height="38" rx="4" />
            <rect x="330" y="88" width="26" height="42" rx="4" />
            <rect x="360" y="68" width="28" height="62" rx="4" />
        </g>

        {/* dotted route */}
        <path
            className="mp-art-route"
            d="M104 112 C120 126 130 126 150 116"
            fill="none"
            stroke="#7ff5e4"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="4 5"
        />

        {/* pin */}
        <ellipse className="mp-ring" cx="104" cy="110" rx="16" ry="5" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
        <ellipse className="mp-ring mp-ring-2" cx="104" cy="110" rx="16" ry="5" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
        <g className="mp-art-pin">
            <path d="M104 108 C104 108 90 92 90 80 a14 14 0 0 1 28 0 C118 92 104 108 104 108z" fill="url(#mpPin)" />
            <circle cx="104" cy="80" r="5.5" fill="#06162a" />
            <circle cx="104" cy="80" r="2.3" fill="#7ff5e4" />
        </g>

        {/* report board */}
        <g className="mp-art-board">
            <rect x="140" y="12" width="150" height="106" rx="13" fill="url(#mpGlass)" stroke="rgba(255,255,255,0.3)" />
            <rect x="154" y="22" width="46" height="6" rx="3" fill="rgba(255,255,255,0.75)" />
            <circle cx="262" cy="25" r="2.5" fill="rgba(255,255,255,0.4)" />
            <circle cx="272" cy="25" r="2.5" fill="rgba(255,255,255,0.4)" />
            <circle cx="282" cy="25" r="2.5" fill="rgba(255,255,255,0.4)" />

            {/* row 1 — resolved */}
            <circle cx="158" cy="46" r="6" fill="#7ff5e4" />
            <path d="M155 46.2l2.1 2.1 3.8-3.9" fill="none" stroke="#06162a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="170" y="41" width="58" height="5" rx="2.5" fill="rgba(255,255,255,0.7)" />
            <rect x="244" y="39" width="32" height="11" rx="5.5" fill="rgba(127,245,228,0.35)" />
            <rect x="170" y="52" width="106" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
            <rect className="mp-art-fill" x="170" y="52" width="106" height="4" rx="2" fill="#7ff5e4" />

            {/* row 2 — in progress */}
            <circle cx="158" cy="72" r="6" fill="#ffc15a" />
            <rect x="170" y="67" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.7)" />
            <rect x="244" y="65" width="32" height="11" rx="5.5" fill="rgba(255,193,90,0.35)" />
            <rect x="170" y="78" width="106" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
            <rect className="mp-art-fill mp-art-fill-2" x="170" y="78" width="68" height="4" rx="2" fill="#ffc15a" />

            {/* row 3 — under review */}
            <circle cx="158" cy="98" r="6" fill="#8fb4ff" />
            <rect x="170" y="93" width="54" height="5" rx="2.5" fill="rgba(255,255,255,0.7)" />
            <rect x="244" y="91" width="32" height="11" rx="5.5" fill="rgba(143,180,255,0.35)" />
            <rect x="170" y="104" width="106" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
            <rect className="mp-art-fill mp-art-fill-3" x="170" y="104" width="30" height="4" rx="2" fill="#8fb4ff" />
        </g>

        {/* magnifier scanning the board */}
        <g className="mp-art-scan">
            <circle cx="318" cy="56" r="18" fill="rgba(127,245,228,0.12)" stroke="#7ff5e4" strokeWidth="3.5" />
            <line x1="331" y1="69" x2="346" y2="86" stroke="#7ff5e4" strokeWidth="4.5" strokeLinecap="round" />
        </g>

        {/* floating check badge */}
        <g className="mp-art-badge">
            <circle cx="300" cy="20" r="11" fill="#7ff5e4" />
            <path d="M294.5 20.4l3.7 3.7 7-7.2" fill="none" stroke="#06162a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* notification chip */}
        <g className="mp-art-chip">
            <rect x="300" y="98" width="88" height="26" rx="13" fill="url(#mpGlass)" stroke="rgba(255,255,255,0.3)" />
            <circle cx="315" cy="111" r="8" fill="rgba(127,245,228,0.25)" />
            <circle cx="319" cy="106" r="2.3" fill="#f5a524" />
            <path d="M311.6 113.4h6.8l-1-1.4v-2.8a2.4 2.4 0 00-4.8 0v2.8zM314 115a1.1 1.1 0 002 0" fill="none" stroke="#7ff5e4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="329" y="107" width="46" height="4" rx="2" fill="rgba(255,255,255,0.7)" />
            <rect x="329" y="114" width="30" height="3.5" rx="1.75" fill="rgba(255,255,255,0.35)" />
        </g>
    </svg>
);

/* civic impact card: a growing seedling */
const ImpactArt = () => (
    <svg className="mp-impact-art" viewBox="0 0 90 90" aria-hidden="true">
        <ellipse cx="45" cy="85" rx="26" ry="4" fill="rgba(0,0,0,0.22)" />
        <path d="M30 66h30l-4 18H34z" fill="rgba(127,245,228,0.22)" stroke="rgba(127,245,228,0.55)" />
        <g className="mp-sway">
            <path d="M45 66 C45 56 45 46 45 36" stroke="#7ff5e4" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M45 52 C34 52 27 44 27 35 C38 35 45 41 45 52z" fill="#14d3ac" />
            <path d="M45 44 C56 44 64 36 64 25 C53 25 45 32 45 44z" fill="#7ff5e4" />
        </g>
        <circle className="mp-twinkle" cx="18" cy="28" r="2" fill="#fff" />
        <circle className="mp-twinkle mp-d2" cx="74" cy="46" r="1.8" fill="#7ff5e4" />
        <circle className="mp-twinkle mp-d3" cx="14" cy="56" r="1.5" fill="#fff" />
    </svg>
);

/* action insight card: swinging bell with ripples */
const ActionArt = () => (
    <svg className="mp-action-art" viewBox="0 0 130 100" aria-hidden="true">
        <defs>
            <linearGradient id="mpBell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7ff5e4" />
                <stop offset="1" stopColor="#12b5a0" />
            </linearGradient>
        </defs>
        <circle className="mp-ring-big" cx="65" cy="52" r="26" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
        <circle className="mp-ring-big mp-ring-big-2" cx="65" cy="52" r="26" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
        <g className="mp-bell-swing">
            <path d="M65 26 a17 17 0 0 1 17 17 c0 15 6 19 6 19 H42 s6-4 6-19 a17 17 0 0 1 17-17z" fill="url(#mpBell)" />
            <circle cx="65" cy="67" r="5" fill="#7ff5e4" />
            <rect x="63" y="20" width="4" height="7" rx="2" fill="#7ff5e4" />
        </g>
        <circle className="mp-dot-pulse" cx="83" cy="32" r="6" fill="#f5a524" />
        <circle className="mp-twinkle" cx="22" cy="24" r="2" fill="#fff" />
        <circle className="mp-twinkle mp-d2" cx="112" cy="70" r="2" fill="#7ff5e4" />
        <circle className="mp-twinkle mp-d3" cx="26" cy="78" r="1.6" fill="#fff" />
    </svg>
);

/* empty state: clipboard with a magnifier */
const EmptyArt = () => (
    <svg className="mp-empty-art" viewBox="0 0 150 110" aria-hidden="true">
        <ellipse cx="72" cy="104" rx="38" ry="4" fill="rgba(12,38,56,0.08)" />
        <rect x="38" y="14" width="64" height="86" rx="11" fill="#e6f7f3" stroke="#bfe3dc" />
        <rect x="56" y="8" width="28" height="12" rx="6" fill="#12b5a0" />
        <rect x="50" y="34" width="40" height="6" rx="3" fill="#9fd6cb" />
        <rect x="50" y="48" width="30" height="6" rx="3" fill="#c4e6df" />
        <rect x="50" y="62" width="36" height="6" rx="3" fill="#c4e6df" />
        <rect x="50" y="76" width="22" height="6" rx="3" fill="#c4e6df" />
        <g className="mp-empty-scan">
            <circle cx="104" cy="66" r="17" fill="rgba(255,255,255,0.7)" stroke="#12b5a0" strokeWidth="4" />
            <line x1="116" y1="79" x2="130" y2="95" stroke="#12b5a0" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle className="mp-twinkle" cx="22" cy="30" r="2.4" fill="#7ff5e4" />
        <circle className="mp-twinkle mp-d2" cx="130" cy="26" r="2" fill="#12b5a0" />
    </svg>
);

const SKELETON_ROWS = [0, 1, 2, 3];


/* =========================================================
   PAGE
   ========================================================= */

function MyProblems() {
    const navigate = useNavigate();

    const [problems, setProblems] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [pagination, setPagination] = useState({
        current_page: 1,
        page_size: 4,
        total_pages: 1,
        total_records: 0,
        has_next: false,
        has_previous: false,
    });

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [sort, setSort] = useState("newest");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [detailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const loadProblems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getMyProblems({
                search,
                status: statusFilter,
                priority: priorityFilter,
                sort,
                page,
                page_size: 4,
            });

            setProblems(
                Array.isArray(response.problems) ? response.problems : []
            );

            setSummary({
                ...EMPTY_SUMMARY,
                ...(response.summary || {}),
            });

            setPagination({
                current_page: response.pagination?.current_page ?? page,
                page_size: response.pagination?.page_size ?? 4,
                total_pages: response.pagination?.total_pages ?? 1,
                total_records:
                    response.pagination?.total_records ?? response.count ?? 0,
                has_next: response.pagination?.has_next ?? false,
                has_previous: response.pagination?.has_previous ?? false,
            });
        } catch (err) {
            setError(err.message || "Unable to load your reports.");
            setProblems([]);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, priorityFilter, sort, page]);

    useEffect(() => {
        loadProblems();
    }, [loadProblems]);

    const visibleStart = pagination.total_records
        ? (pagination.current_page - 1) * pagination.page_size + 1
        : 0;

    const visibleEnd = Math.min(
        pagination.current_page * pagination.page_size,
        pagination.total_records
    );

    const activeFilters = useMemo(
        () => Boolean(search || statusFilter || priorityFilter),
        [search, statusFilter, priorityFilter]
    );

    const submitSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const applyStatus = (value) => {
        setPage(1);
        setStatusFilter(value);
    };


    const openDetails = async (problem) => {
        if (!problem?.id) {
            setDetailError("Unable to open this report because its ID is missing.");
            return;
        }

        navigate(`/user/problem/${problem.id}`);
    };


    const closeDetails = () => {
        setSelectedProblem(null);
        setDetailError("");
    };

    const resetFilters = () => {
        setSearchInput("");
        setSearch("");
        setStatusFilter("");
        setPriorityFilter("");
        setSort("newest");
        setPage(1);
    };

    const statusTabs = [
        { label: "All reports", value: "" },
        { label: "Open", value: "open" },
        { label: "Under Review", value: "under_review" },
        { label: "In Progress", value: "in_progress" },
        { label: "Resolved", value: "resolved" },
        { label: "Closed", value: "closed" },
    ];

    const nextAction = problems.find(
        (problem) =>
            problem.status === "resolved" ||
            problem.status === "under_review"
    );

    return (
        <main className="my-problems-page">

            {/* =====================  HERO  ===================== */}
            <section className="mp-hero">

                <div className="mp-hero-bg" aria-hidden="true">
                    <span className="mp-blob mp-blob-1" />
                    <span className="mp-blob mp-blob-2" />
                    <span className="mp-petal mp-petal-1" />
                    <span className="mp-petal mp-petal-2" />
                    <span className="mp-petal mp-petal-3" />
                    <span className="mp-petal mp-petal-4" />
                    <span className="mp-petal mp-petal-5" />
                </div>

                <div className="mp-hero-inner">

                    <div className="mp-hero-content">
                        <div className="mp-eyebrow">COMMUNITY WORKSPACE / REPORTS</div>

                        <div className="mp-title-row">
                            <div className="mp-title-icon" aria-hidden="true">▤</div>

                            <div>
                                <h1>My Problems</h1>
                                <p>
                                    Track every report, responsible team and next step in one place.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mp-hero-art">
                        <HeroArt />
                    </div>

                    <button
                        className="mp-report-button"
                        type="button"
                        onClick={() => navigate("/user/report")}
                    >
                        <span aria-hidden="true">＋</span> Report a Problem
                    </button>

                </div>

                <svg className="mp-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
                </svg>

            </section>

            <div className="mp-content">
                {error && (
                    <div className="mp-alert mp-alert-error" role="alert">
                        <div>
                            <strong>Couldn't load your reports</strong>
                            <p>{error}</p>
                        </div>
                        <button type="button" onClick={loadProblems}>
                            Retry
                        </button>
                    </div>
                )}

                <section className="mp-summary-grid" aria-label="Report statistics">
                    <article className="mp-stat-card" style={{ "--d": "0.05s" }}>
                        <div className="mp-stat-top">
                            <span>Total reports</span>
                            <span className="mp-stat-icon mp-icon-teal">▥</span>
                        </div>
                        <strong>{loading ? "—" : <CountUp value={summary.total} />}</strong>
                        <span className="mp-stat-note">All your submissions</span>
                    </article>

                    <article className="mp-stat-card" style={{ "--d": "0.12s" }}>
                        <div className="mp-stat-top">
                            <span>Open reports</span>
                            <span className="mp-stat-icon mp-icon-amber">◷</span>
                        </div>
                        <strong>{loading ? "—" : <CountUp value={summary.open} />}</strong>
                        <span className="mp-stat-note mp-note-amber">
                            Open, review, assigned and in progress
                        </span>
                    </article>

                    <article className="mp-stat-card" style={{ "--d": "0.19s" }}>
                        <div className="mp-stat-top">
                            <span>Closed reports</span>
                            <span className="mp-stat-icon mp-icon-green">✓</span>
                        </div>
                        <strong>{loading ? "—" : <CountUp value={summary.closed} />}</strong>
                        <span className="mp-stat-note mp-note-green">
                            Closed status only
                        </span>
                    </article>

                    <article className="mp-impact-card" style={{ "--d": "0.26s" }}>
                        <div className="mp-impact-orb" />
                        <span className="mp-impact-eyebrow">CIVIC IMPACT</span>
                        <h3>Your reports help<br />build a better community.</h3>
                        <p><span /> Better, together.</p>
                        <ImpactArt />
                    </article>
                </section>

                <nav className="mp-status-tabs" aria-label="Filter reports by status">
                    {statusTabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.value || "all"}
                            className={`mp-status-tab ${statusFilter === tab.value ? "active" : ""
                                }`}
                            onClick={() => applyStatus(tab.value)}
                            aria-pressed={statusFilter === tab.value}
                        >
                            <span className="mp-tab-dot" />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <form className="mp-filter-bar" onSubmit={submitSearch}>
                    <label className="mp-search-box">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by title, location or issue ID"
                            aria-label="Search reports"
                        />
                    </label>

                    <button className="mp-search-submit" type="submit">
                        Search
                    </button>

                    <label className="mp-select-wrap">
                        <span className="mp-sr-only">Filter by status</span>
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setPage(1);
                                setStatusFilter(event.target.value);
                            }}
                        >
                            <option value="">All statuses</option>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <option value={value} key={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="mp-select-wrap">
                        <span className="mp-sr-only">Filter by priority</span>
                        <select
                            value={priorityFilter}
                            onChange={(event) => {
                                setPage(1);
                                setPriorityFilter(event.target.value);
                            }}
                        >
                            <option value="">All priorities</option>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option value={value} key={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="mp-select-wrap">
                        <span className="mp-sr-only">Sort reports</span>
                        <select
                            value={sort}
                            onChange={(event) => {
                                setPage(1);
                                setSort(event.target.value);
                            }}
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="title">Title A–Z</option>
                        </select>
                    </label>
                </form>

                <section className="mp-table-card">
                    <div className="mp-table-heading">
                        <div className="mp-table-heading-left">
                            <div className="mp-table-icon" aria-hidden="true">▤</div>
                            <div>
                                <h2>Your reports</h2>
                                <p>
                                    {loading
                                        ? "Loading your submissions…"
                                        : `${summary.total} total submissions`}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="mp-export-button"
                            onClick={() => {
                                const rows = [
                                    ["Issue ID", "Title", "Location", "Status", "Priority", "Date"],
                                    ...problems.map((problem) => [
                                        problem.problem_code,
                                        problem.title,
                                        problem.location,
                                        statusLabel(problem.status),
                                        problem.priority,
                                        formatDate(problem.created_at),
                                    ]),
                                ];

                                const csv = rows
                                    .map((row) =>
                                        row.map((cell) =>
                                            `"${String(cell ?? "").replace(/"/g, '""')}"`
                                        ).join(",")
                                    )
                                    .join("\r\n");

                                const url = URL.createObjectURL(
                                    new Blob(["\uFEFF" + csv], {
                                        type: "text/csv;charset=utf-8;",
                                    })
                                );

                                const link = document.createElement("a");
                                link.href = url;
                                link.download = "civicsolve-my-problems.csv";
                                link.click();
                                URL.revokeObjectURL(url);
                            }}
                            disabled={problems.length === 0}
                        >
                            Export ↗
                        </button>
                    </div>

                    <div className="mp-table-scroll">
                        <table className="mp-table" aria-busy={loading}>
                            <thead>
                                <tr>
                                    <th>Problem / Location</th>
                                    <th>Status / Priority</th>
                                    <th>Ownership / Date</th>
                                    <th>Progress / Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    SKELETON_ROWS.map((i) => (
                                        <tr key={`skeleton-${i}`} className="mp-skel-row" style={{ "--i": i }}>
                                            <td>
                                                <span className="mp-skel w70" />
                                                <span className="mp-skel w45" />
                                            </td>
                                            <td>
                                                <span className="mp-skel w50" />
                                                <span className="mp-skel w35" />
                                            </td>
                                            <td>
                                                <span className="mp-skel w60" />
                                                <span className="mp-skel w40" />
                                            </td>
                                            <td>
                                                <span className="mp-skel full" />
                                                <span className="mp-skel w50" />
                                            </td>
                                        </tr>
                                    ))
                                ) : problems.length === 0 ? (
                                    <tr className="mp-empty-row">
                                        <td colSpan="4" className="mp-table-message">
                                            <EmptyArt />
                                            <strong>
                                                {activeFilters
                                                    ? "No reports match your filters"
                                                    : "No reports yet"}
                                            </strong>
                                            <p>
                                                {activeFilters
                                                    ? "Try changing your search or filters."
                                                    : "Report a community problem to see it here."}
                                            </p>
                                            {activeFilters ? (
                                                <button
                                                    type="button"
                                                    className="mp-inline-button"
                                                    onClick={resetFilters}
                                                >
                                                    Clear filters
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="mp-inline-button"
                                                    onClick={() => navigate("/user/report")}
                                                >
                                                    Report a problem
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    problems.map((problem, index) => {
                                        const progress = getProgress(problem.status);
                                        const isLive = LIVE_STATUSES.includes(problem.status);

                                        return (
                                            <tr key={problem.id} style={{ "--i": index }}>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="mp-problem-title"
                                                        onClick={() => openDetails(problem)}
                                                    >
                                                        {problem.title}
                                                    </button>
                                                    <span className="mp-problem-meta">
                                                        CS-{shortCode(problem)} · {problem.location || "Location not provided"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className={`mp-status-badge status-${problem.status}`}>
                                                        <span />
                                                        {statusLabel(problem.status)}
                                                    </span>
                                                    <span className={`mp-priority priority-${problem.priority}`}>
                                                        <span />
                                                        {PRIORITY_LABELS[problem.priority] || problem.priority}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="mp-owner-name">
                                                        {getOrganization(problem)}
                                                    </span>
                                                    <span className="mp-owner-meta">
                                                        {formatDate(problem.created_at)}
                                                    </span>
                                                </td>

                                                <td className="mp-progress-cell">
                                                    <div
                                                        className={`mp-progress-track ${problem.status === "rejected" ? "is-rejected" : ""
                                                            } ${isLive ? "live" : ""}`}
                                                        role="progressbar"
                                                        aria-label={`Workflow stage for ${problem.title}`}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                        aria-valuenow={progress}
                                                    >
                                                        <span style={{ width: `${progress}%` }} />
                                                    </div>

                                                    <div className="mp-progress-footer">
                                                        <span>
                                                            {problem.status === "resolved" ||
                                                                problem.status === "closed"
                                                                ? "Resolved workflow"
                                                                : problem.status === "rejected"
                                                                    ? "Report rejected"
                                                                    : `${statusLabel(problem.status)} stage`}
                                                        </span>

                                                        <div className="mp-row-actions">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(`/user/problem/${problem.id}`)
                                                                }
                                                            >
                                                                View Details
                                                            </button>

                                                            {problem.status === "resolved" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        navigate(`/user/verify/${problem.id}`)
                                                                    }
                                                                >
                                                                    Verify Resolution
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mp-table-footer">
                        <span>
                            Showing {visibleStart}–{visibleEnd} of {pagination.total_records} reports
                        </span>

                        <div className="mp-pagination">
                            <button
                                type="button"
                                disabled={!pagination.has_previous || loading}
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                            >
                                ← Previous
                            </button>

                            <span className="mp-page-indicator">
                                {pagination.current_page} / {Math.max(1, pagination.total_pages)}
                            </span>

                            <button
                                type="button"
                                disabled={!pagination.has_next || loading}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </section>

                <section className="mp-bottom-grid">
                    <article className="mp-next-action-card">
                        <div className="mp-action-orb" />
                        <ActionArt />
                        <span className="mp-action-eyebrow">✦ ACTION INSIGHT</span>
                        <h2>{nextAction ? "Your report needs attention" : "Your next action"}</h2>

                        {nextAction ? (
                            <>
                                <div className="mp-action-reference">
                                    CS-{shortCode(nextAction)} · {nextAction.title}
                                </div>
                                <p>
                                    Current status: <strong>{statusLabel(nextAction.status)}</strong>.
                                    Check the latest report details for updates from the responsible team.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openDetails(nextAction)}
                                >
                                    View report details →
                                </button>
                            </>
                        ) : (
                            <p>
                                Keep track of your submitted reports here. When a report changes
                                status, the latest information will appear in your list.
                            </p>
                        )}
                    </article>

                    <article className="mp-status-guide">
                        <div className="mp-guide-heading">
                            <span className="mp-guide-icon">i</span>
                            <div>
                                <h2>What do the statuses mean?</h2>
                                <p>Follow your report through the resolution process.</p>
                            </div>
                        </div>

                        <div className="mp-lifecycle">
                            {LIFECYCLE.map(([label, value], index, items) => (
                                <React.Fragment key={value}>
                                    <span
                                        className={`mp-lifecycle-step lifecycle-${value}`}
                                        style={{ "--i": index }}
                                    >
                                        {label}
                                    </span>
                                    {index < items.length - 1 && (
                                        <span className="mp-lifecycle-arrow">→</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <p className="mp-guide-description">
                            <strong>Resolved</strong> means the responsible team has marked the
                            work complete. <strong>Closed</strong> is a separate workflow status
                            recorded by CivicSolve.
                        </p>

                        <div className="mp-guide-footer">
                            <div className="mp-mini-bars" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>
                            <div>
                                <strong>Issue lifecycle</strong>
                                <span>Report · Review · Action · Follow-up</span>
                            </div>
                        </div>
                    </article>
                </section>
            </div>

            {selectedProblem && (
                <div
                    className="mp-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeDetails();
                    }}
                >
                    <section
                        className="mp-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mp-detail-title"
                    >
                        <div className="mp-modal-header">
                            <div>
                                <span className="mp-modal-eyebrow">
                                    REPORT CS-{shortCode(selectedProblem)}
                                </span>
                                <h2 id="mp-detail-title">{selectedProblem.title}</h2>
                            </div>
                            <button
                                type="button"
                                className="mp-modal-close"
                                onClick={closeDetails}
                                aria-label="Close report details"
                            >
                                ×
                            </button>
                        </div>

                        {detailLoading && (
                            <p className="mp-detail-loading">Refreshing report details…</p>
                        )}

                        {detailError && (
                            <div className="mp-alert mp-alert-error" role="alert">
                                {detailError}
                            </div>
                        )}

                        <div className="mp-detail-badges">
                            <span className={`mp-status-badge status-${selectedProblem.status}`}>
                                <span />
                                {statusLabel(selectedProblem.status)}
                            </span>
                            <span className={`mp-priority priority-${selectedProblem.priority}`}>
                                <span />
                                {PRIORITY_LABELS[selectedProblem.priority] || selectedProblem.priority}
                            </span>
                        </div>

                        {selectedProblem.status === "rejected" ? (
                            <div className="mp-reject-banner">
                                This report was rejected by the reviewing team.
                            </div>
                        ) : (
                            <div className="mp-track" aria-label="Report progress">
                                {LIFECYCLE.map(([label, value], index) => {
                                    const current = LIFECYCLE_INDEX[selectedProblem.status] ?? 0;
                                    const state =
                                        index < current ? "done" : index === current ? "current" : "";

                                    return (
                                        <div
                                            className={`mp-track-step ${state}`}
                                            key={value}
                                            style={{ "--i": index }}
                                        >
                                            <span className="mp-track-dot">
                                                {index < current ? "✓" : index + 1}
                                            </span>
                                            <small>{label}</small>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mp-detail-grid">
                            <div>
                                <span>Category</span>
                                <strong>
                                    {selectedProblem.category_details?.name || "—"}
                                </strong>
                            </div>
                            <div>
                                <span>Reported on</span>
                                <strong>{formatDate(selectedProblem.created_at)}</strong>
                            </div>
                            <div>
                                <span>Location</span>
                                <strong>{selectedProblem.location || "—"}</strong>
                            </div>
                            <div>
                                <span>Responsible organization</span>
                                <strong>{getOrganization(selectedProblem)}</strong>
                            </div>
                        </div>

                        <div className="mp-detail-section">
                            <h3>Description</h3>
                            <p>{selectedProblem.description || "No description available."}</p>
                        </div>

                        {selectedProblem.resolution_notes && (
                            <div className="mp-detail-section">
                                <h3>Resolution notes</h3>
                                <p>{selectedProblem.resolution_notes}</p>
                            </div>
                        )}

                        {selectedProblem.attachments?.length > 0 && (
                            <div className="mp-detail-section">
                                <h3>Evidence and attachments</h3>
                                <div className="mp-attachments">
                                    {selectedProblem.attachments.map((attachment) => (
                                        <a
                                            key={attachment.id}
                                            href={attachment.file}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View attachment ↗
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mp-modal-actions">
                            <button
                                type="button"
                                className="mp-modal-secondary"
                                onClick={closeDetails}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="mp-modal-primary"
                                onClick={() => {
                                    closeDetails();
                                    loadProblems();
                                }}
                            >
                                Refresh reports
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}

export default MyProblems;