import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrganizationResolvedProblems } from "../../services/api";
import "../../styles/organization/ResolvedProblems.css";

const PAGE_SIZE = 6;

function formatDate(value, includeTime = false) {
    if (!value) return "Not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleString("en-IN", includeTime
        ? {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
        : {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
}

const prettyStatus = (value) =>
    String(value || "resolved")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

/* status colour: verified -> purple, awaiting/pending -> amber, else green */
function statusTone(value) {
    const v = String(value || "").toLowerCase();
    if (v.includes("verif")) return "verified";
    if (v.includes("await") || v.includes("pending")) return "waiting";
    return "done";
}

function codeOf(problem) {
    return problem?.problem_code
        ? String(problem.problem_code).slice(0, 10)
        : `#${problem?.problem_id ?? ""}`;
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

/* hero illustration: an "impact network". A check badge sits at the
   centre of a slowly turning orbit; fixed community points around it
   light up one by one as the work reaches them. */
function ResolvedArt() {
    const nodes = [
        [46, 34],
        [274, 34],
        [46, 96],
        [274, 96],
    ];

    return (
        <svg className="rp-art" viewBox="0 0 320 130" aria-hidden="true">
            <rect className="rp-art-frame" x="1" y="1" width="318" height="128" rx="14" />

            {/* links from the centre to each community point */}
            {nodes.map(([x, y], i) => (
                <line
                    key={`l-${i}`}
                    className="rp-art-link"
                    x1="160"
                    y1="65"
                    x2={x}
                    y2={y}
                />
            ))}

            {/* turning orbits */}
            <circle className="rp-art-orbit" cx="160" cy="65" r="44" />
            <circle className="rp-art-orbit rp-art-orbit--rev" cx="160" cy="65" r="32" />

            {/* pulse */}
            <circle className="rp-art-pulse" cx="160" cy="65" r="24" />

            {/* community points */}
            {nodes.map(([x, y], i) => (
                <g
                    key={`n-${i}`}
                    transform={`translate(${x} ${y})`}
                    style={{ "--d": `${0.9 + i * 0.6}s` }}
                >
                    <circle className="rp-art-node-ring" r="9" />
                    <circle className="rp-art-node" r="9" />
                    <circle className="rp-art-node-dot" r="3.6" />
                </g>
            ))}

            {/* centre badge */}
            <g transform="translate(160 65)">
                <circle className="rp-art-core" r="22" />
                <path
                    className="rp-art-core-check"
                    pathLength="1"
                    d="M-9 1 L-3 7 L10 -7"
                />
            </g>

            {/* sparkles */}
            {[
                [112, 18, 0],
                [212, 114, 1.1],
                [226, 22, 2.2],
                [100, 112, 1.7],
            ].map(([x, y, delay]) => (
                <path
                    key={`s-${x}-${y}`}
                    className="rp-art-spark"
                    d={`M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6} Z`}
                    style={{ animationDelay: `${delay}s` }}
                />
            ))}
        </svg>
    );
}

/* "latest completed work" scene: a street at dusk where the repaired
   lamp switches on and a check badge confirms the work. */
function LampScene() {
    return (
        <svg className="rp-scene" viewBox="0 0 320 210" aria-hidden="true">
            <defs>
                <linearGradient id="rp-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#06182a" />
                    <stop offset="1" stopColor="#15485a" />
                </linearGradient>
                <linearGradient id="rp-cone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffd98a" stopOpacity="0.75" />
                    <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect width="320" height="210" fill="url(#rp-sky)" />

            {/* stars */}
            <g className="rp-scene-stars">
                <circle cx="40" cy="28" r="1.4" />
                <circle cx="96" cy="16" r="1.1" />
                <circle cx="212" cy="30" r="1.3" />
                <circle cx="272" cy="52" r="1.1" />
                <circle cx="150" cy="44" r="1" />
            </g>

            {/* skyline */}
            <g className="rp-scene-city">
                <rect x="14" y="104" width="46" height="70" rx="3" />
                <rect x="66" y="84" width="38" height="90" rx="3" />
                <rect x="206" y="94" width="44" height="80" rx="3" />
                <rect x="256" y="76" width="50" height="98" rx="3" />
            </g>
            <g className="rp-scene-windows">
                <rect className="rp-win" x="24" y="118" width="6" height="8" />
                <rect className="rp-win rp-win--b" x="40" y="132" width="6" height="8" />
                <rect className="rp-win rp-win--c" x="76" y="100" width="6" height="8" />
                <rect className="rp-win" x="90" y="118" width="6" height="8" />
                <rect className="rp-win rp-win--c" x="218" y="110" width="6" height="8" />
                <rect className="rp-win rp-win--b" x="268" y="94" width="6" height="8" />
                <rect className="rp-win" x="286" y="112" width="6" height="8" />
            </g>

            {/* road */}
            <rect x="0" y="170" width="320" height="40" fill="#0b2433" />
            <line className="rp-scene-lane" x1="0" y1="190" x2="320" y2="190" />

            {/* lamp */}
            <polygon className="rp-scene-light" points="150,70 108,172 192,172" fill="url(#rp-cone)" />
            <rect x="148" y="74" width="4" height="98" rx="2" fill="#2c4a5c" />
            <path d="M150 76 Q150 64 164 64" fill="none" stroke="#2c4a5c" strokeWidth="4" strokeLinecap="round" />
            <rect className="rp-scene-lamp" x="158" y="62" width="14" height="6" rx="3" />

            {/* check badge */}
            <g transform="translate(262 40)">
                <circle className="rp-scene-badge-ring" r="19" />
                <circle r="15" fill="#0f9d84" />
                <path
                    className="rp-scene-badge-check"
                    pathLength="1"
                    d="M-6 0.5 L-1.5 5 L7 -4.5"
                />
            </g>
        </svg>
    );
}

function ResolvedProblems() {
    const navigate = useNavigate();

    const [problems, setProblems] = useState([]);
    const [latest, setLatest] = useState(null);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [priority, setPriority] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProblems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getOrganizationResolvedProblems({
                search: search.trim(),
                category: category.trim(),
                priority,
                date_from: dateFrom,
                date_to: dateTo,
                page,
                page_size: PAGE_SIZE,
            });

            setProblems(
                Array.isArray(response.results) ? response.results : []
            );
            setLatest(response.latest_completed || null);
            setCount(Number(response.count) || 0);
            setTotalPages(Math.max(1, Number(response.total_pages) || 1));
        } catch (err) {
            setProblems([]);
            setLatest(null);
            setCount(0);
            setTotalPages(1);
            setError(err.message || "Unable to load resolved problems.");
        } finally {
            setLoading(false);
        }
    }, [search, category, priority, dateFrom, dateTo, page]);

    useEffect(() => {
        loadProblems();
    }, [loadProblems]);

    const resetFilters = () => {
        setSearch("");
        setCategory("");
        setPriority("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    };

    const hasFilters =
        search || category || priority || dateFrom || dateTo;

    const viewDetails = (problem) => {
        if (!problem?.problem_id) return;

        navigate(
            `/organization/problems/${encodeURIComponent(
                problem.problem_id
            )}/details`
        );
    };

    /* ---- summary numbers (this page of results) ---- */
    const highPriority = problems.filter((p) =>
        ["high", "urgent"].includes(String(p.priority || "").toLowerCase())
    ).length;
    const categoriesCovered = new Set(
        problems.map((p) => p.category).filter(Boolean)
    ).size;

    const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, count);

    const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
    const pageNumbers = Array.from(
        { length: Math.min(5, totalPages) },
        (_, i) => windowStart + i
    );

    /* client-side CSV of the rows currently loaded */
    const exportHistory = () => {
        if (!problems.length) return;

        const header = [
            "Code",
            "Title",
            "Category",
            "Location",
            "Priority",
            "Status",
            "Completed",
            "Resolution notes",
        ];

        const rows = problems.map((p) => [
            codeOf(p),
            p.title,
            p.category,
            p.location,
            p.priority,
            prettyStatus(p.problem_status),
            formatDate(p.completed_at || p.resolved_at),
            p.resolution_notes || p.notes || "",
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\n");

        const url = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "completion-history.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="rp-page">
            {/* ===== Hero ===== */}
            <header className="rp-hero">
                <span className="rp-orb rp-orb--1" aria-hidden="true" />
                <span className="rp-orb rp-orb--2" aria-hidden="true" />
                <span className="rp-orb rp-orb--3" aria-hidden="true" />

                <div className="rp-hero-copy">
                    <span className="rp-eyebrow">
                        ORGANIZATION WORKSPACE / COMPLETION HISTORY
                    </span>
                    <h1>Resolved Problems</h1>
                    <p>
                        Review completed assignments, track your impact, and
                        revisit the resolution details of community problems.
                    </p>

                    <div className="rp-hero-actions">
                        <button
                            type="button"
                            className="rp-export-btn"
                            onClick={exportHistory}
                            disabled={!problems.length}
                        >
                            Export completion history
                        </button>

                        <span className="rp-live-pill">
                            <i aria-hidden="true" />
                            {count} completed
                        </span>
                    </div>
                </div>

                <div className="rp-hero-scene">
                    <ResolvedArt />
                </div>
            </header>

            <div className="rp-body">
                {/* ===== Summary cards ===== */}
                <section className="rp-stats" aria-label="Completion summary">
                    <article className="rp-stat rp-stat--teal">
                        <span className="rp-stat-label">Resolved problems</span>
                        <strong>
                            <CountUp value={count} />
                        </strong>
                        <small>Work completed by your team</small>
                    </article>

                    <article className="rp-stat rp-stat--amber">
                        <span className="rp-stat-label">High priority resolved</span>
                        <strong>
                            <CountUp value={highPriority} />
                        </strong>
                        <small>High or urgent, on this page</small>
                    </article>

                    <article className="rp-stat rp-stat--solid">
                        <span className="rp-stat-label">Categories covered</span>
                        <strong>
                            <CountUp value={categoriesCovered} />
                        </strong>
                        <small>Different problem types, on this page</small>
                    </article>
                </section>

                {/* ===== Filters ===== */}
                <section className="rp-filters">
                    <div className="rp-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            placeholder="Search title, description, location or ID..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Search resolved problems"
                        />
                    </div>

                    <input
                        type="text"
                        className="rp-category-input"
                        placeholder="Category name"
                        value={category}
                        onChange={(event) => {
                            setCategory(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter by category"
                    />

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

                    <label className="rp-date-filter">
                        <span>From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(event) => {
                                setDateFrom(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Completion date from"
                        />
                    </label>

                    <label className="rp-date-filter">
                        <span>To</span>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(event) => {
                                setDateTo(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Completion date to"
                        />
                    </label>

                    <button
                        type="button"
                        className="rp-reset"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                    >
                        Reset
                    </button>
                </section>

                {/* ===== Completion history ===== */}
                <section className="rp-history">
                    <div className="rp-history-head">
                        <div>
                            <h2>Completion history</h2>
                            <p>
                                {loading
                                    ? "Loading completion history..."
                                    : count === 0
                                        ? "No completed assignments to show"
                                        : `${count} resolved problem${count === 1 ? "" : "s"} · Showing ${from}–${to}`}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="rp-refresh"
                            onClick={loadProblems}
                            disabled={loading}
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="rp-error" role="alert">
                            <div>
                                <strong>Unable to load completion history</strong>
                                <p>{error}</p>
                            </div>
                            <button type="button" onClick={loadProblems}>
                                Try again
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="rp-skeleton" aria-busy="true">
                            {[0, 1, 2, 3].map((i) => (
                                <div className="rp-skeleton-row" key={i} />
                            ))}
                        </div>
                    ) : error ? null : problems.length === 0 ? (
                        <div className="rp-empty">
                            <div className="rp-empty-icon">✓</div>
                            <h3>No completed assignments found</h3>
                            <p>
                                Completed work will appear here so your
                                organization can review its history and
                                community impact.
                            </p>
                            {hasFilters && (
                                <button type="button" onClick={resetFilters}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="rp-table" role="table">
                                <div className="rp-thead" role="row">
                                    <span role="columnheader">Problem / Location</span>
                                    <span role="columnheader">Completed</span>
                                    <span role="columnheader">Status</span>
                                    <span role="columnheader">Resolution summary</span>
                                    <span role="columnheader">Details</span>
                                </div>

                                {problems.map((problem, index) => {
                                    const priorityKey = String(
                                        problem.priority || "low"
                                    ).toLowerCase();
                                    const note =
                                        problem.resolution_notes || problem.notes;

                                    return (
                                        <div
                                            className="rp-row"
                                            role="row"
                                            key={problem.assignment_id}
                                            style={{ "--i": index }}
                                        >
                                            <div className="rp-cell rp-cell--main" role="cell">
                                                <strong>
                                                    {codeOf(problem)} ·{" "}
                                                    {problem.title || "Untitled problem"}
                                                </strong>
                                                <small>
                                                    {problem.location || "Location not specified"}
                                                    {" · "}
                                                    <span className={`rp-priority rp-priority-${priorityKey}`}>
                                                        {problem.priority || "Low"} priority
                                                    </span>
                                                </small>
                                            </div>

                                            <div className="rp-cell" role="cell" data-label="Completed">
                                                <strong>
                                                    {formatDate(
                                                        problem.completed_at ||
                                                        problem.resolved_at
                                                    )}
                                                </strong>
                                                <small>Assignment #{problem.assignment_id}</small>
                                            </div>

                                            <div className="rp-cell" role="cell" data-label="Status">
                                                <span className={`rp-status rp-status--${statusTone(problem.problem_status)}`}>
                                                    <i aria-hidden="true">✓</i>
                                                    {prettyStatus(problem.problem_status)}
                                                </span>
                                                <small>{problem.category || "General"}</small>
                                            </div>

                                            <div className="rp-cell" role="cell" data-label="Resolution summary">
                                                <p className="rp-note">
                                                    {note || "No resolution notes recorded."}
                                                </p>
                                            </div>

                                            <div className="rp-cell" role="cell">
                                                <button
                                                    type="button"
                                                    className="rp-view"
                                                    onClick={() => viewDetails(problem)}
                                                >
                                                    View <span aria-hidden="true">→</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="rp-pagination">
                                <span>
                                    Showing {from}–{to} of {count} records
                                </span>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage((current) => Math.max(1, current - 1))
                                        }
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
                                        onClick={() =>
                                            setPage((current) =>
                                                Math.min(totalPages, current + 1)
                                            )
                                        }
                                        disabled={page >= totalPages || loading}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {/* ===== Latest work + accountable outcomes ===== */}
                {!loading && !error && latest && (
                    <div className="rp-lower">
                        <section className="rp-latest">
                            <h2>Latest completed work</h2>

                            <div className="rp-latest-grid">
                                <figure className="rp-latest-art">
                                    <LampScene />
                                    <figcaption>
                                        Completed {formatDate(latest.completed_at)}
                                    </figcaption>
                                </figure>

                                <div className="rp-latest-detail">
                                    <div className="rp-latest-tags">
                                        <span className="rp-chip">{codeOf(latest)}</span>
                                        <span>{latest.category || "General"}</span>
                                    </div>

                                    <h3>{latest.title || "Completed community problem"}</h3>

                                    <p>
                                        {latest.resolution_notes ||
                                            latest.notes ||
                                            "This assignment is marked as completed."}
                                    </p>

                                    <div className="rp-latest-meta">
                                        <div>
                                            <span>Completed</span>
                                            <strong>
                                                {formatDate(latest.completed_at, true)}
                                            </strong>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="rp-latest-button"
                                        onClick={() => viewDetails(latest)}
                                    >
                                        View resolution record <span>→</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        <aside className="rp-outcomes">
                            <span className="rp-outcomes-orb" aria-hidden="true" />

                            <div className="rp-outcomes-head">
                                <span className="rp-outcomes-icon">✓</span>
                                <h2>Accountable outcomes</h2>
                            </div>

                            <p>
                                Resolved is your team’s completion claim.
                                Community verification records the reporting
                                user’s confirmation, and the system then closes
                                the problem.
                            </p>

                            <ol className="rp-steps">
                                <li>
                                    <span className="rp-step-dot rp-step-dot--teal">1</span>
                                    Team marks as Resolved
                                </li>
                                <li>
                                    <span className="rp-step-dot rp-step-dot--amber">2</span>
                                    Reporter is notified
                                </li>
                                <li>
                                    <span className="rp-step-dot rp-step-dot--violet">3</span>
                                    Community confirms &amp; closes
                                </li>
                            </ol>

                            <div className="rp-outcomes-note">
                                Reopening requests are reviewed by an
                                administrator.
                            </div>
                        </aside>
                    </div>
                )}

                <footer className="rp-footer">
                    <span>
                        Summary cards count the rows on the current page.
                    </span>
                    <span>CivicSolve · Community • Action • Impact</span>
                </footer>
            </div>
        </main>
    );
}

export default ResolvedProblems;