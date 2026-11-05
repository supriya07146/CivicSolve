import { useNavigate } from "react-router-dom";
import React, { useCallback, useEffect, useState } from "react";
import { getOrganizationActiveProblems } from "../../services/api";
import "../../styles/organization/ActiveProblems.css";

const PAGE_SIZE = 6;

const STATUS_LABELS = {
    assigned: "Assigned",
    accepted: "Accepted",
    in_progress: "In Progress",
};

/* Stage progress is derived from the assignment status (the API does not
   return a progress value). */
const STAGE_PROGRESS = {
    assigned: 0,
    accepted: 25,
    in_progress: 60,
};

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
}

function shortDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "—";
}

function codeOf(problem) {
    return problem.problem_code
        ? String(problem.problem_code).slice(0, 8)
        : `#${problem.problem_id}`;
}

/* what the row's action button says and how it looks */
function actionOf(problem) {
    if (problem.is_escalated) return { label: "Escalation", tone: "escalate" };
    if (problem.assignment_status === "assigned")
        return { label: "Accept", tone: "accept" };
    if (
        problem.assignment_status === "accepted" ||
        problem.assignment_status === "in_progress"
    )
        return { label: "Update", tone: "update" };
    return { label: "View", tone: "view" };
}

function stageOf(problem) {
    if (problem.is_escalated) return { key: "escalated", label: "Escalated" };
    const key = problem.assignment_status || "assigned";
    return { key, label: STATUS_LABELS[key] || key };
}

function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/* numbers count up once when they change */
function CountUp({ value }) {
    const [shown, setShown] = useState(0);

    useEffect(() => {
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduce || !value) {
            setShown(value || 0);
            return undefined;
        }

        let frame;
        const start = performance.now();
        const duration = 900;

        const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
            if (p < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <>{shown}</>;
}

/* hero illustration: three assignment rows, progress bars that fill on
   load, a focus frame scanning the queue, and an attention marker. */
function ActiveArt() {
    return (
        <svg className="ap-art" viewBox="0 0 320 130" aria-hidden="true">
            <rect className="ap-art-frame" x="1" y="1" width="318" height="128" rx="14" />

            {[0, 1, 2].map((i) => (
                <g key={i} transform={`translate(16 ${14 + i * 38})`}>
                    <rect className="ap-art-row" width="288" height="30" rx="8" />
                    <circle className={`ap-art-dot ap-art-dot--${i + 1}`} cx="16" cy="15" r="5" />
                    <rect className="ap-art-line" x="30" y="9" width="64" height="4" rx="2" />
                    <rect className="ap-art-line ap-art-line--short" x="30" y="17" width="42" height="3" rx="1.5" />
                    <rect className="ap-art-track" x="118" y="13" width="152" height="5" rx="2.5" />
                    <rect className={`ap-art-bar ap-art-bar--${i + 1}`} x="118" y="13" width="152" height="5" rx="2.5" />
                </g>
            ))}

            <g className="ap-art-scan">
                <rect x="14" y="12" width="292" height="34" rx="10" />
            </g>

            <g transform="translate(296 104)">
                <circle className="ap-art-alert-ring" r="6" />
                <circle className="ap-art-alert" r="3.5" />
            </g>
        </svg>
    );
}

function ActiveProblems() {
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [priority, setPriority] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProblems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getOrganizationActiveProblems({
                search: search.trim(),
                priority,
                status: statusFilter,
                page,
                page_size: PAGE_SIZE,
            });

            setProblems(
                Array.isArray(response.results) ? response.results : []
            );
            setCount(Number(response.count) || 0);
            setTotalPages(Math.max(1, Number(response.total_pages) || 1));
        } catch (err) {
            setProblems([]);
            setCount(0);
            setTotalPages(1);
            setError(err.message || "Unable to load active problems.");
        } finally {
            setLoading(false);
        }
    }, [search, priority, statusFilter, page]);

    useEffect(() => {
        loadProblems();
    }, [loadProblems]);

    const resetFilters = () => {
        setSearch("");
        setPriority("");
        setStatusFilter("");
        setPage(1);
    };

    const openDetails = (problem) =>
        navigate(
            `/organization/problems/${encodeURIComponent(problem.problem_id)}/details`
        );

    /* ---- numbers shown in the summary cards (this page of results) ---- */
    const awaiting = problems.filter(
        (p) => p.assignment_status === "assigned"
    ).length;
    const inProgress = problems.filter(
        (p) => p.assignment_status === "in_progress"
    ).length;
    const escalatedList = problems.filter((p) => p.is_escalated);
    const firstEscalated = escalatedList[0];

    const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, count);

    /* page-number window: up to 5 buttons around the current page */
    const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
    const pageNumbers = Array.from(
        { length: Math.min(5, totalPages) },
        (_, i) => windowStart + i
    );

    /* client-side CSV of the rows currently loaded */
    const exportWorkList = () => {
        if (!problems.length) return;

        const header = [
            "Code",
            "Title",
            "Category",
            "Location",
            "Priority",
            "Status",
            "Reported",
            "Days open",
            "Escalated",
        ];

        const rows = problems.map((p) => [
            codeOf(p),
            p.title,
            p.category,
            p.location,
            p.priority,
            STATUS_LABELS[p.assignment_status] || p.assignment_status,
            formatDate(p.problem_created_at),
            p.days_open ?? 0,
            p.is_escalated ? "Yes" : "No",
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\n");

        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "work-list.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="ap-page">
            {/* ===== Hero ===== */}
            <header className="ap-hero">
                <span className="ap-orb ap-orb--1" aria-hidden="true" />
                <span className="ap-orb ap-orb--2" aria-hidden="true" />
                <span className="ap-orb ap-orb--3" aria-hidden="true" />

                <div className="ap-hero-copy">
                    <span className="ap-eyebrow">ORGANIZATION WORKSPACE</span>
                    <h1>Active Problems</h1>
                    <p>
                        Keep every assignment moving, with deadlines and
                        responsibility in view.
                    </p>

                    <div className="ap-hero-actions">
                        <button
                            type="button"
                            className="ap-export-btn"
                            onClick={exportWorkList}
                            disabled={!problems.length}
                        >
                            Export work list
                        </button>

                        <span className="ap-live-pill">
                            <i aria-hidden="true" />
                            {count} active
                        </span>
                    </div>
                </div>

                <div className="ap-hero-scene">
                    <ActiveArt />
                </div>
            </header>

            <div className="ap-body">
                {/* ===== Attention strip ===== */}
                {firstEscalated && (
                    <button
                        type="button"
                        className="ap-strip"
                        onClick={() => openDetails(firstEscalated)}
                    >
                        <svg className="ap-strip-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path pathLength="1" d="M8 12.5l3 3 5-6" />
                        </svg>
                        <span>
                            <b>
                                {codeOf(firstEscalated)} ·{" "}
                                {firstEscalated.title || "Untitled problem"}
                            </b>{" "}
                            is escalated. Review it and update the progress →
                        </span>
                    </button>
                )}

                {/* ===== Summary cards ===== */}
                <section className="ap-stats" aria-label="Assignment summary">
                    <article className="ap-stat ap-stat--teal">
                        <span className="ap-stat-label">Active assignments</span>
                        <strong>
                            <CountUp value={count} />
                        </strong>
                        <small>
                            {inProgress} in progress · {awaiting} awaiting
                            acceptance
                        </small>
                    </article>

                    <article className="ap-stat ap-stat--amber">
                        <span className="ap-stat-label">Awaiting acceptance</span>
                        <strong>
                            <CountUp value={awaiting} />
                        </strong>
                        <small>Accept to confirm responsibility</small>
                    </article>

                    <article className="ap-stat ap-stat--alert">
                        <span className="ap-stat-label">Escalated</span>
                        <strong>
                            <CountUp value={escalatedList.length} />
                        </strong>
                        <small>
                            {escalatedList.length
                                ? "Escalation review requested"
                                : "Nothing escalated right now"}
                        </small>
                    </article>
                </section>

                {/* ===== Filters ===== */}
                <section className="ap-toolbar">
                    <div className="ap-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            placeholder="Search title, description or location..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Search active problems"
                        />
                    </div>

                    <select
                        value={priority}
                        onChange={(event) => {
                            setPriority(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter by priority"
                    >
                        <option value="">All priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter by assignment status"
                    >
                        <option value="">All stages</option>
                        <option value="assigned">Assigned</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                    </select>

                    <button
                        type="button"
                        className="ap-reset-btn"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                </section>

                {/* ===== Work queue ===== */}
                <section className="ap-queue">
                    <div className="ap-queue-head">
                        <div>
                            <h2>Your work queue</h2>
                            <p>
                                {loading
                                    ? "Loading assignments..."
                                    : count === 0
                                        ? "No assignments to show"
                                        : `${to - from + 1} of ${count} assignment${count === 1 ? "" : "s"} shown`}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="ap-refresh-btn"
                            onClick={loadProblems}
                            disabled={loading}
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="ap-error" role="alert">
                            <div>
                                <strong>Unable to load active problems</strong>
                                <p>{error}</p>
                            </div>
                            <button type="button" onClick={loadProblems}>
                                Try again
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="ap-skeleton" aria-busy="true">
                            {[0, 1, 2, 3].map((i) => (
                                <div className="ap-skeleton-row" key={i} />
                            ))}
                        </div>
                    ) : error ? null : problems.length === 0 ? (
                        <div className="ap-empty">
                            <div className="ap-empty-icon">✓</div>
                            <h3>No active problems found</h3>
                            <p>
                                There are no matching active assignments. Try
                                changing your filters or check Available
                                Problems for new work.
                            </p>
                            {(search || priority || statusFilter) && (
                                <button type="button" onClick={resetFilters}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="ap-table" role="table">
                                <div className="ap-thead" role="row">
                                    <span role="columnheader">Problem / Location</span>
                                    <span role="columnheader">Stage</span>
                                    <span role="columnheader">Progress</span>
                                    <span role="columnheader">Reported / Open</span>
                                    <span role="columnheader">Next action</span>
                                </div>

                                {problems.map((problem, index) => {
                                    const stage = stageOf(problem);
                                    const action = actionOf(problem);
                                    const progress =
                                        STAGE_PROGRESS[problem.assignment_status] ?? 0;
                                    const priorityKey = String(
                                        problem.priority || "low"
                                    ).toLowerCase();

                                    return (
                                        <div
                                            className={`ap-row ${problem.is_escalated ? "is-escalated" : ""}`}
                                            role="row"
                                            key={problem.assignment_id}
                                            style={{ "--i": index }}
                                        >
                                            <div className="ap-cell ap-cell--main" role="cell">
                                                <strong>
                                                    {codeOf(problem)} ·{" "}
                                                    {problem.title || "Untitled problem"}
                                                </strong>
                                                <small>
                                                    {problem.location || "Location not specified"}
                                                    {" · "}
                                                    <span className={`ap-priority ap-priority-${priorityKey}`}>
                                                        {problem.priority || "Low"} priority
                                                    </span>
                                                </small>
                                            </div>

                                            <div className="ap-cell" role="cell" data-label="Stage">
                                                <span className={`ap-stage ap-stage-${stage.key}`}>
                                                    {stage.label}
                                                </span>
                                            </div>

                                            <div className="ap-cell" role="cell" data-label="Progress">
                                                <div className="ap-progress">
                                                    <span
                                                        className={`ap-progress-fill ap-progress-fill--${stage.key}`}
                                                        style={{ "--p": `${progress}%` }}
                                                    />
                                                </div>
                                                <small className={`ap-progress-label ap-progress-label--${stage.key}`}>
                                                    {progress}% complete
                                                </small>
                                            </div>

                                            <div className="ap-cell" role="cell" data-label="Reported / Open">
                                                <strong>{shortDate(problem.problem_created_at)}</strong>
                                                <small className={problem.is_escalated ? "ap-late" : "ap-open"}>
                                                    {problem.days_open ?? 0} days open
                                                </small>
                                            </div>

                                            <div className="ap-cell" role="cell">
                                                <button
                                                    type="button"
                                                    className={`ap-act ap-act--${action.tone}`}
                                                    onClick={() => openDetails(problem)}
                                                >
                                                    {action.label}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="ap-pagination">
                                <span>
                                    Showing {from}–{to} of {count} records
                                </span>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => current - 1)}
                                        disabled={page <= 1 || loading}
                                    >
                                        ← Prev
                                    </button>

                                    {pageNumbers.map((n) => (
                                        <button
                                            type="button"
                                            key={n}
                                            className={n === page ? "is-current" : ""}
                                            aria-current={n === page ? "page" : undefined}
                                            onClick={() => setPage(n)}
                                            disabled={loading}
                                        >
                                            {n}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => current + 1)}
                                        disabled={page >= totalPages || loading}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* ===== Snapshot ===== */}
                {!loading && !error && count > 0 && (
                    <section className="ap-snapshot">
                        <span className="ap-snap-orb ap-snap-orb--1" aria-hidden="true" />
                        <span className="ap-snap-orb ap-snap-orb--2" aria-hidden="true" />

                        <div className="ap-snap-copy">
                            <h2>Performance snapshot</h2>
                            <span className="ap-live-pill ap-live-pill--soft">
                                <i aria-hidden="true" />
                                Active organization member
                            </span>
                            <p className="ap-snap-line">
                                {count} active · {awaiting} awaiting acceptance ·{" "}
                                {escalatedList.length} escalated
                            </p>
                            <p className="ap-snap-note">
                                Thank you for keeping your community moving.
                                Every update matters.
                            </p>
                            <div className="ap-snap-chips">
                                <span className="ap-chip ap-chip--teal">
                                    {inProgress} in progress
                                </span>
                                {escalatedList.length > 0 && (
                                    <span className="ap-chip ap-chip--amber">
                                        {escalatedList.length} need attention
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="ap-snap-btn"
                            onClick={loadProblems}
                        >
                            Refresh snapshot
                        </button>
                    </section>
                )}

                {/* ===== Notice ===== */}
                {firstEscalated && (
                    <div className="ap-notice" role="status">
                        <strong>Escalated work requires a recovery update</strong>
                        <p>
                            {codeOf(firstEscalated)} is escalated. Provide a
                            reason and revised expected date so the
                            administrator can keep the community informed.
                        </p>
                    </div>
                )}

                <footer className="ap-footer">
                    <span>
                        Progress is derived from assignment status and is a
                        guide only.
                    </span>
                    <span>CivicSolve · Community • Action • Impact</span>
                </footer>
            </div>
        </main>
    );
}

export default ActiveProblems;