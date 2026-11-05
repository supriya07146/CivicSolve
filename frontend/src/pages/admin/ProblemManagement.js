import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminProblems,
    getAdminProblem,
    getDuplicateProblemSuggestions,
} from "../../services/api";

import "../../styles/admin/ProblemManagement.css";

import DuplicateProblemReview from "./DuplicateProblemReview";

const PAGE_SIZE = 10;

/* a report still being worked on is "overdue" after this many days
   (used only when the API doesn't send is_overdue or due_date) */
const OVERDUE_DAYS = 7;

const ASSIGNMENTS_ROUTE = "/admin/assignments";
const ANALYTICS_ROUTE = "/admin/analytics";

const ACTIVE_STATUSES = ["open", "under_review", "assigned", "in_progress"];

/* progress shown in the table when the API has no progress_percent */
const PROGRESS_BY_STATUS = {
    open: 0,
    under_review: 0,
    assigned: 10,
    in_progress: 50,
    resolved: 100,
    closed: 100,
    rejected: 0,
};

const STAGE_OPTIONS = [
    { value: "", label: "All stages" },
    { value: "open", label: "Open" },
    { value: "under_review", label: "Under Review" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "rejected", label: "Rejected" },
    { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
    { value: "", label: "All priorities" },
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

const SORT_OPTIONS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "priority", label: "Highest priority" },
];

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };

const CHECKLIST = [
    "Location and description are complete.",
    "Evidence is relevant and privacy-safe.",
    "Potential duplicate checked; records are distinct.",
];


/* ---------- helpers ---------- */

function useCountUp(target, duration = 900) {
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

function formatDate(value, withTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime && { hour: "2-digit", minute: "2-digit" }),
    });
}

function displayStatus(value) {
    return String(value || "unknown")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const DAY = 86400000;

/* whole days a still-active report is past its limit (0 = not overdue) */
function overdueDays(problem) {
    if (!ACTIVE_STATUSES.includes(problem.status)) return 0;
    if (problem.is_overdue === false) return 0;

    const now = Date.now();

    if (problem.due_date) {
        const due = new Date(problem.due_date).getTime();
        return Number.isNaN(due) ? 0 : Math.max(0, Math.floor((now - due) / DAY));
    }

    const created = new Date(problem.created_at).getTime();
    if (Number.isNaN(created)) return 0;

    const late = Math.floor((now - created) / DAY) - OVERDUE_DAYS;
    return problem.is_overdue ? Math.max(late, 1) : Math.max(0, late);
}

const isOverdue = (problem) => overdueDays(problem) > 0;

const ownerName = (problem) =>
    problem.assigned_organization_name ||
    problem.organization_name ||
    problem.assigned_to_name ||
    "";

const progressOf = (problem) =>
    typeof problem.progress_percent === "number"
        ? Math.max(0, Math.min(100, problem.progress_percent))
        : PROGRESS_BY_STATUS[problem.status] ?? 0;

const codeOf = (problem) => String(problem.problem_code || problem.id).slice(0, 18);

function pageWindow(page, pages) {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);

    const list = [...new Set([1, pages, page - 1, page, page + 1])]
        .filter((p) => p >= 1 && p <= pages)
        .sort((a, b) => a - b);

    const out = [];
    list.forEach((p, i) => {
        if (i && p - list[i - 1] > 1) out.push(`gap-${p}`);
        out.push(p);
    });
    return out;
}

function csvCell(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function StatCard({ label, value, note, tone, delay, active, onClick }) {
    const shown = useCountUp(value);

    return (
        <button
            type="button"
            className={`pm-stat pm-stat-${tone} ${active ? "is-active" : ""}`}
            style={{ "--d": delay }}
            onClick={onClick}
            aria-pressed={active}
        >
            <span className="pm-stat-label">{label}</span>
            <strong className="pm-stat-value">{shown.toLocaleString("en-IN")}</strong>
            <span className="pm-stat-note"><i />{note}</span>
        </button>
    );
}

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
    </svg>
);


/* =========================================================
   PAGE
   ========================================================= */

function ProblemManagement() {

    const navigate = useNavigate();

    const [showDuplicateReview, setShowDuplicateReview] = useState(false);
    const [duplicateClosing, setDuplicateClosing] = useState(false);
    const [pendingDuplicates, setPendingDuplicates] = useState(0);

    /* unfiltered list: feeds the stat cards and side panels */
    const [baseProblems, setBaseProblems] = useState([]);
    const [summary, setSummary] = useState({});

    /* filtered list: feeds the table */
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    /* filters */
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [sort, setSort] = useState("newest");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [page, setPage] = useState(1);

    /* review */
    const [selectedId, setSelectedId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [checks, setChecks] = useState(CHECKLIST.map(() => false));
    const [category, setCategory] = useState("");
    const [priority, setPriority] = useState("");
    const [notes, setNotes] = useState("");

    const [toast, setToast] = useState(null);
    const requestId = useRef(0);
    const reviewRef = useRef(null);


    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3200);
    };

    const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

    /* duplicate review panel: animate out, then unmount */
    const closeDuplicateReview = useCallback(() => {
        setDuplicateClosing(true);
        setTimeout(() => {
            setShowDuplicateReview(false);
            setDuplicateClosing(false);
        }, 220);
    }, []);


    /* ----- debounce search ----- */
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);


    /* ----- unfiltered list for the stat cards ----- */
    useEffect(() => {
        let cancelled = false;

        getAdminProblems({ search: "", status: "", priority: "", category: "" })
            .then((res) => {
                if (cancelled) return;
                setBaseProblems(Array.isArray(res.problems) ? res.problems : []);
                setSummary(res.summary || {});
            })
            .catch(() => { /* the table shows any connection / auth error */ });

        return () => { cancelled = true; };
    }, [reloadKey]);


    /* ----- pending duplicate suggestions (badge on the AI button) ----- */
    useEffect(() => {
        let cancelled = false;

        getDuplicateProblemSuggestions({ status: "pending" })
            .then((res) => {
                if (!cancelled) setPendingDuplicates(res?.suggestions?.length || 0);
            })
            .catch(() => { /* the badge is optional */ });

        return () => { cancelled = true; };
    }, [reloadKey, showDuplicateReview]);


    /* ----- tell the header how many suggestions are pending ----- */
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent("admin:duplicate-count", { detail: pendingDuplicates })
        );
    }, [pendingDuplicates]);

    useEffect(() => {
        return () => {
            window.dispatchEvent(
                new CustomEvent("admin:duplicate-count", { detail: 0 })
            );
        };
    }, []);


    /* ----- open the duplicate review (the header button sends this event) ----- */
    useEffect(() => {
        const openDuplicateReview = () => {
            setShowDuplicateReview(true);
        };

        window.addEventListener(
            "admin:open-duplicate-review",
            openDuplicateReview
        );

        return () => {
            window.removeEventListener(
                "admin:open-duplicate-review",
                openDuplicateReview
            );
        };
    }, []);

    useEffect(() => {
        if (!showDuplicateReview) return;

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeDuplicateReview();
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, [showDuplicateReview, closeDuplicateReview]);

    /* ----- filtered list for the table ----- */
    useEffect(() => {
        const id = ++requestId.current;

        setLoading(true);
        setError("");

        getAdminProblems({
            search: debouncedSearch,
            status: statusFilter,
            priority: priorityFilter,
            category: "",
        })
            .then((res) => {
                if (id !== requestId.current) return;
                setProblems(Array.isArray(res.problems) ? res.problems : []);
            })
            .catch((err) => {
                if (id !== requestId.current) return;
                setError(err.message || "Unable to load problems.");
            })
            .finally(() => {
                if (id === requestId.current) setLoading(false);
            });

    }, [debouncedSearch, statusFilter, priorityFilter, reloadKey]);


    /* ----- derived ----- */
    const categories = useMemo(() => {
        const map = new Map();
        baseProblems.forEach((p) => {
            if (p.category !== undefined && p.category !== null) {
                map.set(String(p.category), p.category_name || `Category ${p.category}`);
            }
        });
        return [...map.entries()].map(([value, label]) => ({ value, label }));
    }, [baseProblems]);

    const overdueList = useMemo(
        () => baseProblems.filter(isOverdue).sort((a, b) => overdueDays(b) - overdueDays(a)),
        [baseProblems]
    );

    const reviewQueue = useMemo(
        () => baseProblems
            .filter((p) => p.status === "under_review" || p.status === "open")
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        [baseProblems]
    );

    const visible = useMemo(() => {
        const list = overdueOnly ? problems.filter(isOverdue) : [...problems];

        list.sort((a, b) => {
            if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
            if (sort === "priority") {
                return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) ||
                    new Date(b.created_at) - new Date(a.created_at);
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });

        return list;
    }, [problems, overdueOnly, sort]);

    const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const rows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const from = visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const to = Math.min(safePage * PAGE_SIZE, visible.length);

    const hasFilters = Boolean(search || statusFilter || priorityFilter || overdueOnly);
    const allChecked = checks.every(Boolean);
    const topOverdue = overdueList[0];
    const nextReview = reviewQueue[0];


    /* ----- handlers ----- */
    const changeFilter = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("");
        setPriorityFilter("");
        setOverdueOnly(false);
        setPage(1);
    };

    const selectProblem = useCallback(async (problem) => {
        setSelectedId(problem.id);
        setSelected(null);
        setDetailLoading(true);
        setDetailError("");
        setChecks(CHECKLIST.map(() => false));
        setNotes("");

        setTimeout(() => {
            reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);

        try {
            const res = await getAdminProblem(problem.id);

            if (!res.problem) {
                setDetailError("Problem details were not returned by the server.");
                return;
            }

            setSelected(res.problem);
            setCategory(
                res.problem.category !== undefined && res.problem.category !== null
                    ? String(res.problem.category)
                    : ""
            );
            setPriority(res.problem.priority || "");

        } catch (err) {
            setDetailError(err.message || "Unable to load problem details.");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const closeReview = () => {
        setSelectedId(null);
        setSelected(null);
        setDetailError("");
    };

    const continueToAssignment = () => {
        if (!selected) return;
        if (!allChecked) {
            showToast("error", "Complete the review checklist first.");
            return;
        }

        navigate(ASSIGNMENTS_ROUTE, {
            state: { problemId: selected.id, category, priority, notes },
        });
    };

    const requestMoreInformation = () => {
        if (!selected) return;

        if (!selected.citizen_email) {
            showToast("error", "This citizen has no email address on file.");
            return;
        }

        const subject = `More information needed: ${selected.problem_code || selected.title}`;
        const body =
            `Hello ${selected.citizen_name || ""},\n\n` +
            `We are reviewing your report "${selected.title}" and need a little more information.\n\n` +
            `${notes ? `${notes}\n\n` : ""}Thank you,\nCivicSolve review team`;

        window.location.href =
            `mailto:${selected.citizen_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const exportProblems = () => {
        const header = ["Code", "Title", "Category", "Reported by", "Email", "Location",
            "Priority", "Status", "Owner", "Reported on"];

        const lines = [header.map(csvCell).join(",")].concat(
            visible.map((p) => [
                p.problem_code || p.id, p.title, p.category_name, p.citizen_name, p.citizen_email,
                p.location, p.priority_display || displayStatus(p.priority),
                p.status_display || displayStatus(p.status), ownerName(p), p.created_at,
            ].map(csvCell).join(","))
        );

        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `civicsolve-problems-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast("success", `Exported ${visible.length} problems.`);
    };

    /* header button: "Export problems" */
    const exportRef = useRef(exportProblems);
    exportRef.current = exportProblems;

    useEffect(() => {
        const handler = () => exportRef.current();
        window.addEventListener("admin:export-problems", handler);
        return () => window.removeEventListener("admin:export-problems", handler);
    }, []);


    const p = selected;
    const overdueCount = overdueList.length;
    const statusPill = (item) => (
        <span className={`pm-pill pm-status-${item.status}`}>
            {item.status_display || displayStatus(item.status)}
        </span>
    );


    return (
        <div className="pm-page">

            <div className="pm-container">

                {/* ===== stat cards ===== */}
                <section className="pm-stat-grid" aria-label="Problem overview">
                    <StatCard
                        tone="total" label="TOTAL PROBLEMS" value={summary.total ?? baseProblems.length}
                        note="All reports" delay="0s"
                        active={false}
                        onClick={clearFilters}
                    />
                    <StatCard
                        tone="review" label="UNDER REVIEW" value={summary.under_review ?? 0}
                        note="Need verification" delay="0.08s"
                        active={statusFilter === "under_review"}
                        onClick={() => { setStatusFilter("under_review"); setOverdueOnly(false); setPage(1); }}
                    />
                    <StatCard
                        tone="progress" label="IN PROGRESS" value={summary.in_progress ?? 0}
                        note="Work underway" delay="0.16s"
                        active={statusFilter === "in_progress"}
                        onClick={() => { setStatusFilter("in_progress"); setOverdueOnly(false); setPage(1); }}
                    />
                    <StatCard
                        tone="overdue" label="OVERDUE" value={overdueCount}
                        note="Require escalation" delay="0.24s"
                        active={overdueOnly}
                        onClick={() => { setStatusFilter(""); setOverdueOnly((v) => !v); setPage(1); }}
                    />
                </section>


                {/* ===== filters ===== */}
                <section className="pm-card pm-filter-card" style={{ "--d": "0.1s" }}>

                    <label className="pm-search">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search by title or issue ID"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search problems"
                        />
                    </label>

                    <select value={statusFilter} onChange={changeFilter(setStatusFilter)}
                        aria-label="Filter by stage">
                        {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select value={priorityFilter} onChange={changeFilter(setPriorityFilter)}
                        aria-label="Filter by priority">
                        {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select value={sort} onChange={changeFilter(setSort)} aria-label="Sort order">
                        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {hasFilters && (
                        <button type="button" className="pm-clear" onClick={clearFilters}>Clear</button>
                    )}

                </section>


                {/* ===== reported issues ===== */}
                <section className="pm-card pm-directory" style={{ "--d": "0.16s" }}>

                    <div className="pm-card-head">
                        <div>
                            <h2>Reported Issues</h2>
                            <p>
                                {loading
                                    ? "Loading reports..."
                                    : `${(summary.total ?? baseProblems.length).toLocaleString("en-IN")} total · ${visible.length.toLocaleString("en-IN")} shown${overdueOnly ? " · overdue only" : ""}`}
                            </p>
                        </div>

                        <button type="button" className="pm-outline-btn" onClick={exportProblems}
                            disabled={loading || visible.length === 0}>
                            Export ↗
                        </button>
                    </div>


                    <div className="pm-table-wrap">

                        {loading ? (

                            <div className="pm-state">
                                <div className="pm-loader" />
                                <p>Loading community reports...</p>
                            </div>

                        ) : error ? (

                            <div className="pm-state pm-state-error">
                                <div className="pm-state-icon">!</div>
                                <strong>Could not load problems</strong>
                                <p>{error}</p>
                                <button type="button" className="pm-retry" onClick={refresh}>
                                    Try again
                                </button>
                            </div>

                        ) : rows.length === 0 ? (

                            <div className="pm-state">
                                <div className="pm-state-icon">P</div>
                                <strong>No problems found</strong>
                                <p>No reports match the current search or filters.</p>
                            </div>

                        ) : (

                            <table className="pm-table">

                                <thead>
                                    <tr>
                                        <th>PROBLEM / LOCATION</th>
                                        <th>STATUS / PRIORITY</th>
                                        <th>OWNERSHIP / DATE</th>
                                        <th>PROGRESS / ACTION</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map((item) => {
                                        const late = overdueDays(item) > 0;
                                        const owner = ownerName(item);
                                        const pct = progressOf(item);

                                        return (
                                            <tr
                                                key={item.id}
                                                className={selectedId === item.id ? "is-selected" : ""}
                                                onClick={() => selectProblem(item)}
                                            >

                                                <td className="pm-td-name">
                                                    <strong>{item.title}</strong>
                                                    <small>
                                                        {[codeOf(item), item.location].filter(Boolean).join(" · ")}
                                                    </small>
                                                </td>

                                                <td data-label="Status">
                                                    {statusPill(item)}
                                                    <small className="pm-sub">
                                                        {(item.priority_display || displayStatus(item.priority))}
                                                        {" "}priority
                                                    </small>
                                                </td>

                                                <td data-label="Ownership">
                                                    <span className="pm-owner">
                                                        <strong>
                                                            {owner ||
                                                                (["open", "under_review"].includes(item.status)
                                                                    ? "Not yet assigned"
                                                                    : "—")}
                                                        </strong>
                                                        <small className={late ? "is-late" : ""}>
                                                            {formatDate(item.created_at)}
                                                            {late ? " · Overdue" : ""}
                                                        </small>
                                                    </span>
                                                </td>

                                                <td data-label="Progress">
                                                    <div className="pm-progress">
                                                        <div className="pm-bar">
                                                            <span className={`pm-fill pm-fill-${item.status}`}
                                                                style={{ width: `${Math.max(pct, 2)}%` }} />
                                                        </div>
                                                        <div className="pm-progress-foot">
                                                            <span className={`pm-pct pm-pct-${item.status}`}>
                                                                {pct}% complete
                                                            </span>
                                                            <button type="button" className="pm-link"
                                                                onClick={(e) => { e.stopPropagation(); selectProblem(item); }}>
                                                                View →
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>

                        )}

                    </div>


                    {!loading && !error && rows.length > 0 && (
                        <div className="pm-pagination">

                            <span>
                                Showing {from}–{to} of {visible.length.toLocaleString("en-IN")} records
                            </span>

                            <nav aria-label="Pagination">

                                <button type="button" className="pm-page-btn"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(safePage - 1)}>
                                    ← Previous
                                </button>

                                {pageWindow(safePage, totalPages).map((n) =>
                                    typeof n === "string" ? (
                                        <span key={n} className="pm-gap">…</span>
                                    ) : (
                                        <button key={n} type="button"
                                            className={`pm-page-num ${n === safePage ? "active" : ""}`}
                                            aria-current={n === safePage ? "page" : undefined}
                                            onClick={() => setPage(n)}>
                                            {n}
                                        </button>
                                    )
                                )}

                                <button type="button" className="pm-page-btn"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(safePage + 1)}>
                                    Next →
                                </button>

                            </nav>

                        </div>
                    )}

                </section>


                {/* ===== review + sidebar ===== */}
                <div className="pm-lower">

                    <div className="pm-lower-main">

                        <section className="pm-card pm-review" ref={reviewRef} style={{ "--d": "0.2s" }}>

                            {!selectedId ? (

                                <div className="pm-state">
                                    <div className="pm-state-icon">✓</div>
                                    <strong>Review selected report</strong>
                                    <p>
                                        Select a report from the table to check its details,
                                        confirm the category and priority, and move it to assignment.
                                    </p>
                                </div>

                            ) : detailLoading ? (

                                <div className="pm-state">
                                    <div className="pm-loader" />
                                    <p>Loading report...</p>
                                </div>

                            ) : detailError ? (

                                <div className="pm-state pm-state-error">
                                    <div className="pm-state-icon">!</div>
                                    <strong>Could not load report</strong>
                                    <p>{detailError}</p>
                                </div>

                            ) : p && (

                                <>
                                    <div className="pm-review-top">
                                        <div className="pm-review-tags">
                                            {statusPill(p)}
                                            <span className="pm-code">{codeOf(p)}</span>
                                            <span className={`pm-pill pm-priority-${p.priority}`}>
                                                {p.priority_display || displayStatus(p.priority)}
                                            </span>
                                        </div>
                                        <button type="button" className="pm-close" onClick={closeReview}
                                            aria-label="Close review">
                                            ×
                                        </button>
                                    </div>

                                    <h2 className="pm-review-title">
                                        Review selected report · {codeOf(p)}
                                    </h2>
                                    <h3 className="pm-review-name">{p.title}</h3>
                                    <p className="pm-review-meta">
                                        {[p.location, p.citizen_name && `Reported by ${p.citizen_name}`,
                                        formatDate(p.created_at)].filter(Boolean).join(" · ")}
                                    </p>


                                    <div className="pm-checks">
                                        {CHECKLIST.map((text, i) => (
                                            <label key={text} className={`pm-check ${checks[i] ? "checked" : ""}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checks[i]}
                                                    onChange={() =>
                                                        setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                                                    }
                                                />
                                                <span>{text}</span>
                                            </label>
                                        ))}
                                    </div>


                                    <div className="pm-confirm">
                                        <label>
                                            <span>Confirmed category</span>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                                {category === "" && <option value="">—</option>}
                                                {categories.map((c) => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label>
                                            <span>Confirmed priority</span>
                                            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                                {PRIORITY_OPTIONS.filter((o) => o.value).map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>


                                    <label className="pm-notes">
                                        <span>Review notes</span>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add notes for the assignment team or for the citizen."
                                        />
                                    </label>


                                    <div className="pm-actions">
                                        <button type="button" className="pm-btn pm-btn-primary"
                                            onClick={continueToAssignment} disabled={!allChecked}
                                            title={allChecked ? "" : "Complete the checklist to continue"}>
                                            Verify &amp; continue to assignment
                                        </button>
                                        <button type="button" className="pm-btn pm-btn-outline"
                                            onClick={requestMoreInformation}>
                                            Request more information
                                        </button>
                                    </div>


                                    {/* full report details */}

                                    <div className="pm-details">

                                        <section className="pm-section">
                                            <h4>Problem description</h4>
                                            <p className="pm-text">{p.description || "No description provided."}</p>
                                        </section>

                                        <section className="pm-section">
                                            <h4>Report information</h4>
                                            <dl className="pm-grid">
                                                <div><dt>Category</dt><dd>{p.category_name || "—"}</dd></div>
                                                <div><dt>Reported on</dt><dd>{formatDate(p.created_at, true)}</dd></div>
                                                <div><dt>Last updated</dt><dd>{formatDate(p.updated_at, true)}</dd></div>
                                                <div><dt>Resolved on</dt><dd>{formatDate(p.resolved_at, true)}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="pm-section">
                                            <h4>Citizen information</h4>
                                            <dl className="pm-grid">
                                                <div><dt>Full name</dt><dd>{p.citizen_name || "—"}</dd></div>
                                                <div><dt>Email</dt><dd>{p.citizen_email || "—"}</dd></div>
                                                <div><dt>Phone</dt><dd>{p.citizen_phone || "—"}</dd></div>
                                            </dl>
                                        </section>

                                        <section className="pm-section">
                                            <h4>Location</h4>
                                            <p className="pm-text">{p.location || "No location provided."}</p>
                                            {p.latitude !== null && p.latitude !== undefined &&
                                                p.longitude !== null && p.longitude !== undefined && (
                                                    <p className="pm-coords">
                                                        Coordinates: {p.latitude}, {p.longitude}
                                                    </p>
                                                )}
                                        </section>

                                        <section className="pm-section">
                                            <h4>Resolution notes</h4>
                                            <p className="pm-text">
                                                {p.resolution_notes || "No resolution notes have been recorded."}
                                            </p>
                                        </section>

                                        <section className="pm-section">
                                            <h4>Attachments</h4>
                                            {Array.isArray(p.attachments) && p.attachments.length > 0 ? (
                                                <div className="pm-stack">
                                                    {p.attachments.map((a) => (
                                                        <div className="pm-attachment" key={a.id}>
                                                            <div>
                                                                <strong>Attachment #{a.id}</strong>
                                                                <span>Uploaded {formatDate(a.uploaded_at, true)}</span>
                                                            </div>
                                                            {a.file_url && (
                                                                <a href={a.file_url} target="_blank" rel="noreferrer">
                                                                    Open file →
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="pm-muted">No attachments were submitted.</p>
                                            )}
                                        </section>

                                        <section className="pm-section">
                                            <h4>Assignment history</h4>
                                            {Array.isArray(p.assignments) && p.assignments.length > 0 ? (
                                                <div className="pm-stack">
                                                    {p.assignments.map((a) => (
                                                        <div className="pm-assignment" key={a.id}>
                                                            <div className="pm-assignment-top">
                                                                <strong>
                                                                    {a.organization_name || `Organization #${a.organization}`}
                                                                </strong>
                                                                <span className={`pm-pill pm-assignment-${a.status}`}>
                                                                    {a.status_display || displayStatus(a.status)}
                                                                </span>
                                                            </div>
                                                            {a.organization_email && <p>{a.organization_email}</p>}
                                                            <span className="pm-muted">
                                                                Assigned {formatDate(a.assigned_at, true)}
                                                            </span>
                                                            {a.notes && <p className="pm-text">{a.notes}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="pm-muted">This problem has no recorded assignments.</p>
                                            )}
                                        </section>

                                    </div>
                                </>

                            )}

                        </section>


                        {/* ----- admin activity summary ----- */}
                        <section className="pm-insight" style={{ "--d": "0.3s" }}>

                            <div className="pm-insight-text">
                                <h3>Admin activity summary</h3>
                                <span className="pm-insight-eyebrow"><i />Active administrator</span>
                                <p className="pm-insight-line">
                                    {(summary.total ?? baseProblems.length).toLocaleString("en-IN")} reports
                                    {" · "}{summary.under_review ?? 0} in review
                                    {" · "}{overdueCount} overdue
                                </p>
                                <p>Keeping the problem pipeline accurate and moving.</p>
                                <div className="pm-chips">
                                    <span className="pm-chip pm-chip-teal">{summary.resolved ?? 0} Resolved</span>
                                    <span className="pm-chip pm-chip-amber">{summary.rejected ?? 0} Rejected</span>
                                </div>
                            </div>

                            <button type="button" className="pm-btn pm-btn-primary pm-insight-btn"
                                onClick={() => navigate(ANALYTICS_ROUTE)}>
                                View analytics
                            </button>

                        </section>

                    </div>


                    <aside className="pm-side">

                        <section className="pm-card pm-side-card" style={{ "--d": "0.24s" }}>
                            <div className="pm-side-head">
                                <span className="pm-side-icon">✦</span>
                                <h2>Review guidance</h2>
                            </div>
                            <div className="pm-callout">
                                <span className="pm-callout-tag">Human decision</span>
                                <p>
                                    Confirm the location, evidence and category before a report moves to
                                    assignment. Check for duplicates first.
                                </p>
                                <p className="pm-callout-sub">
                                    The reviewer confirms all values. No automatic decisions are made.
                                </p>
                            </div>
                        </section>


                        <section className="pm-card pm-side-card pm-overdue" style={{ "--d": "0.3s" }}>
                            <p className="pm-overdue-label"><i />Overdue Review</p>

                            {topOverdue ? (
                                <>
                                    <h3>{codeOf(topOverdue)}{topOverdue.location ? ` · ${topOverdue.location}` : ""}</h3>
                                    <span className="pm-pill pm-late-pill">
                                        {topOverdue.status_display || displayStatus(topOverdue.status)}
                                        {" · "}{overdueDays(topOverdue)} day{overdueDays(topOverdue) === 1 ? "" : "s"} overdue
                                    </span>
                                    <p className="pm-muted pm-overdue-text">
                                        {ownerName(topOverdue)
                                            ? `Responsible: ${ownerName(topOverdue)}. `
                                            : "No organization assigned yet. "}
                                        Request an updated plan and record the escalation.
                                    </p>
                                    <button type="button" className="pm-btn pm-btn-dark"
                                        onClick={() => selectProblem(topOverdue)}>
                                        Review escalation →
                                    </button>
                                </>
                            ) : (
                                <p className="pm-muted pm-overdue-text">
                                    Nothing is overdue. Reports past {OVERDUE_DAYS} days without
                                    resolution will appear here.
                                </p>
                            )}
                        </section>


                        <section className="pm-card pm-side-card" style={{ "--d": "0.36s" }}>
                            <h2>Quick Actions</h2>
                            <div className="pm-quick">
                                <button type="button"
                                    onClick={() => navigate(ASSIGNMENTS_ROUTE,
                                        nextReview ? { state: { problemId: nextReview.id } } : undefined)}>
                                    <span className="pm-quick-icon">+</span>Assign next verified report
                                </button>
                                <button type="button" disabled={!nextReview}
                                    onClick={() => nextReview && selectProblem(nextReview)}>
                                    <span className="pm-quick-icon dark">✓</span>
                                    {nextReview ? `Verify ${codeOf(nextReview)}` : "No reports to verify"}
                                </button>
                                <button type="button"
                                    onClick={() => { setStatusFilter(""); setOverdueOnly(true); setPage(1); }}>
                                    <span className="pm-quick-icon light">⌖</span>Browse overdue reports
                                </button>
                            </div>
                        </section>

                    </aside>

                </div>

            </div>


            {toast && (
                <div className={`pm-toast pm-toast-${toast.type}`} role="status">{toast.text}</div>
            )}

            {/* ===== duplicate review panel (opened from the header button) ===== */}
            {showDuplicateReview && (
                <div
                    className={`dpr-modal-overlay ${duplicateClosing ? "is-closing" : ""}`}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDuplicateReview();
                        }
                    }}
                >
                    <div
                        className="dpr-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="AI duplicate problem analysis"
                    >
                        <DuplicateProblemReview onClose={closeDuplicateReview} />
                    </div>
                </div>
            )}

        </div>
    );
}

export default ProblemManagement;