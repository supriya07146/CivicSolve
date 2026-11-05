import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    getAdminSolutions,
    createAdminSolution,
    reviewAdminSolution,
} from "../../services/api";
import "../../styles/admin/SolutionManagement.css";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const STATUS_LABELS = {
    pending: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    changes_requested: "Changes Requested",
};

const STATUS_ICONS = {
    pending: "◔",
    approved: "✓",
    rejected: "✕",
    changes_requested: "↻",
};

const DECISIONS = [
    ["approved", "Approve proposal"],
    ["changes_requested", "Request changes"],
    ["rejected", "Reject proposal"],
];

const EMPTY_SUMMARY = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
};

const EMPTY_FORM = {
    problem: "",
    title: "",
    description: "",
    proposed_action: "",
};

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-IN");
}

const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function SolutionManagement() {
    const [solutions, setSolutions] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [orgFilter, setOrgFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const [selectedId, setSelectedId] = useState(null);
    const [decision, setDecision] = useState("approved");
    const [reviewNotes, setReviewNotes] = useState("");

    const pageRef = useRef(null);
    const reviewRef = useRef(null);

    /* ---------------- data loading ---------------- */

    const loadSolutions = useCallback(async () => {
        setLoading(true);

        try {
            const result = await getAdminSolutions({
                search: search.trim(),
                status: statusFilter,
            });

            const list = result.solutions || [];
            setSolutions(list);
            setSummary(result.summary || EMPTY_SUMMARY);
            return list;
        } catch (err) {
            setError(err.message || "Unable to load solutions.");
            return [];
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        loadSolutions();
    }, [loadSolutions]);

    /* ---------------- derived data ---------------- */

    const organizations = useMemo(() => {
        const names = new Set(solutions.map((s) => s.organization_name).filter(Boolean));
        if (orgFilter) names.add(orgFilter);
        return [...names].sort();
    }, [solutions, orgFilter]);

    const visibleSolutions = useMemo(() => {
        const list = solutions.filter(
            (s) => !orgFilter || s.organization_name === orgFilter
        );

        return list.sort((a, b) => {
            const diff = new Date(a.created_at || 0) - new Date(b.created_at || 0);
            return sortOrder === "oldest" ? diff : -diff;
        });
    }, [solutions, orgFilter, sortOrder]);

    const selected = useMemo(
        () => solutions.find((s) => s.id === selectedId) || null,
        [solutions, selectedId]
    );

    const firstPending = useMemo(
        () => solutions.find((s) => s.status === "pending") || null,
        [solutions]
    );

    /* ---------------- selection ---------------- */

    const selectSolution = useCallback((solution) => {
        setSelectedId(solution.id);
        setReviewNotes(solution.admin_review_notes || "");
        setDecision("approved");
    }, []);

    /* default to the first proposal awaiting review */
    useEffect(() => {
        if (!selected && solutions.length) {
            selectSolution(firstPending || solutions[0]);
        }
    }, [selected, solutions, firstPending, selectSolution]);

    const jumpToReview = (solution) => {
        if (solution) selectSolution(solution);
        setError("");
        setMessage("");
        setTimeout(() => {
            reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
    };

    const handleBannerClick = () => {
        if (firstPending) jumpToReview(firstPending);
        else setStatusFilter("pending");
    };

    /* header's "+ New Review" button dispatches this event */
    useEffect(() => {
        const onNew = () => {
            setShowCreateForm(true);
            setError("");
            setMessage("");
            pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        window.addEventListener("admin:new-solution", onNew);
        return () => window.removeEventListener("admin:new-solution", onNew);
    }, []);

    /* ---------------- actions ---------------- */

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateSolution = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setSubmitting(true);

        try {
            const result = await createAdminSolution({
                problem: Number(form.problem),
                title: form.title.trim(),
                description: form.description.trim(),
                proposed_action: form.proposed_action.trim(),
            });

            setMessage(result.message || "Solution created successfully.");
            setForm(EMPTY_FORM);
            setShowCreateForm(false);
            await loadSolutions();
        } catch (err) {
            setError(err.message || "Unable to create the solution.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async () => {
        if (!selected) return;

        setError("");
        setMessage("");
        setReviewing(true);

        try {
            const result = await reviewAdminSolution(selected.id, {
                status: decision,
                admin_review_notes: reviewNotes.trim(),
            });

            setMessage(result.message || "Solution review updated.");

            const list = await loadSolutions();
            const fresh = list.find((s) => s.id === selected.id);
            if (fresh) selectSolution(fresh);
        } catch (err) {
            setError(err.message || "Unable to update the solution review.");
        } finally {
            setReviewing(false);
        }
    };

    const handleExport = () => {
        const rows = [
            ["ID", "Solution", "Problem", "Organization", "Status", "Submitted"],
            ...visibleSolutions.map((s) => [
                s.id,
                s.title,
                s.problem_title || `Problem #${s.problem}`,
                s.organization_name || "Admin submission",
                STATUS_LABELS[s.status] || s.status,
                formatDate(s.created_at),
            ]),
        ];

        const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "civicsolve-solutions.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    /* ---------------- render ---------------- */

    return (
        <div className="solution-page" ref={pageRef}>

            {/* review strip — full width, like the dashboard alert */}
            {summary.pending > 0 && (
                <div className="sol-banner">
                    <div className="sol-container sol-banner-inner">
                        <span className="sol-banner-icon">✓</span>
                        <p>
                            ✦ {summary.pending} proposal{summary.pending === 1 ? " requires" : "s require"} human approval
                            {firstPending
                                ? ` — ${firstPending.problem_title || `Problem #${firstPending.problem}`} is pending your review. `
                                : ". "}
                            <button type="button" onClick={handleBannerClick}>
                                Action required →
                            </button>
                        </p>
                    </div>
                </div>
            )}

            <div className="sol-container">

                {message && (
                    <div className="sol-success" role="status">
                        <span>{message}</span>
                        <button type="button" onClick={() => setMessage("")} aria-label="Dismiss">×</button>
                    </div>
                )}
                {error && (
                    <div className="sol-error" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button>
                    </div>
                )}

                {/* stat cards */}
                <div className="sol-stats">
                    <div className="sol-stat sol-stat-teal">
                        <span>Proposals for review</span>
                        <strong>{summary.pending ?? 0}</strong>
                        <em>● Human approval required</em>
                    </div>

                    <div className="sol-stat sol-stat-amber">
                        <span>Changes requested</span>
                        <strong>{summary.changes_requested ?? 0}</strong>
                        <em>● Waiting for organizations</em>
                    </div>

                    <div className="sol-stat sol-stat-solid">
                        <span>Approved solutions</span>
                        <strong>{summary.approved ?? 0}</strong>
                        <em>● {summary.rejected ?? 0} rejected · {summary.total ?? 0} total</em>
                    </div>
                </div>

                {/* create form */}
                {showCreateForm && (
                    <section className="sol-card sol-create">
                        <div className="sol-card-head">
                            <div>
                                <h2>Create a solution</h2>
                                <p>Submit a proposed solution for an existing problem.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateSolution}>
                            <div className="sol-form-grid">
                                <div className="sol-field">
                                    <label htmlFor="sol-problem">Problem ID *</label>
                                    <input id="sol-problem" type="number" name="problem" min="1" required
                                        value={form.problem} onChange={handleFormChange}
                                        placeholder="Enter existing problem ID" />
                                </div>

                                <div className="sol-field">
                                    <label htmlFor="sol-title">Solution title *</label>
                                    <input id="sol-title" type="text" name="title" maxLength="200" required
                                        value={form.title} onChange={handleFormChange}
                                        placeholder="Enter solution title" />
                                </div>
                            </div>

                            <div className="sol-field">
                                <label htmlFor="sol-desc">Description *</label>
                                <textarea id="sol-desc" name="description" rows="4" required
                                    value={form.description} onChange={handleFormChange}
                                    placeholder="Describe the proposed solution" />
                            </div>

                            <div className="sol-field">
                                <label htmlFor="sol-action">Proposed action</label>
                                <textarea id="sol-action" name="proposed_action" rows="3"
                                    value={form.proposed_action} onChange={handleFormChange}
                                    placeholder="Describe the steps to address the problem" />
                            </div>

                            <div className="sol-form-actions">
                                <button type="button" className="sol-secondary-btn"
                                    onClick={() => setShowCreateForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sol-primary-btn" disabled={submitting}>
                                    {submitting ? "Creating..." : "Create solution"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* search + filters */}
                <div className="sol-filterbar">
                    <div className="sol-search">
                        <span aria-hidden="true">⌕</span>
                        <input type="search" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title, problem or location"
                            aria-label="Search solutions" />
                    </div>

                    <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
                        aria-label="Filter by organization">
                        <option value="">All organizations</option>
                        {organizations.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by review state">
                        <option value="">Review state</option>
                        <option value="pending">Pending Review</option>
                        <option value="approved">Approved</option>
                        <option value="changes_requested">Changes Requested</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                        aria-label="Sort by submitted date">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>

                {/* oversight table */}
                <section className="sol-card sol-oversight">
                    <div className="sol-card-head">
                        <div>
                            <h2>Solution oversight</h2>
                            <p>{visibleSolutions.length} record{visibleSolutions.length === 1 ? "" : "s"} tracked</p>
                        </div>
                        <div className="sol-head-actions">
                            <button type="button" className="sol-ghost-btn"
                                onClick={() => { setShowCreateForm((o) => !o); setError(""); setMessage(""); }}>
                                {showCreateForm ? "Close form" : "+ New solution"}
                            </button>
                            <button type="button" className="sol-ghost-btn" onClick={handleExport}
                                disabled={!visibleSolutions.length}>
                                Export →
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="sol-empty">Loading solutions...</div>
                    ) : visibleSolutions.length === 0 ? (
                        <div className="sol-empty">
                            <strong>No solutions found</strong>
                            <span>Try another search or filter.</span>
                        </div>
                    ) : (
                        <div className="sol-table-wrap">
                            <table className="sol-table">
                                <thead>
                                    <tr>
                                        <th>Problem / Organization</th>
                                        <th>Solution</th>
                                        <th>Solution state</th>
                                        <th>Submitted</th>
                                        <th>Review</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleSolutions.map((solution) => (
                                        <tr key={solution.id}
                                            className={solution.id === selectedId ? "is-selected" : ""}>
                                            <td>
                                                <strong>
                                                    {solution.problem_title || `Problem #${solution.problem}`}
                                                    {" · "}
                                                    {solution.organization_name || "Admin submission"}
                                                </strong>
                                                <small>Solution ID: {solution.id}</small>
                                            </td>

                                            <td className="sol-title-cell">{solution.title}</td>

                                            <td>
                                                <span className={`sol-status sol-status-${solution.status}`}>
                                                    {STATUS_ICONS[solution.status] || "•"}{" "}
                                                    {STATUS_LABELS[solution.status] || solution.status}
                                                </span>
                                            </td>

                                            <td>{formatDate(solution.created_at)}</td>

                                            <td>
                                                <button type="button"
                                                    className={`sol-link sol-link-${solution.status}`}
                                                    onClick={() => jumpToReview(solution)}>
                                                    {solution.status === "pending" ? "Review proposal →" : "View details →"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* details + review action */}
                {selected && (
                    <div className="sol-bottom">

                        <section className="sol-card sol-detail">
                            <div className="sol-detail-head">
                                <div>
                                    <h2>Solution details · #{selected.id}</h2>
                                    <p>{selected.problem_title || `Problem #${selected.problem}`}</p>
                                </div>
                                <span className={`sol-chip sol-chip-${selected.status}`}>
                                    {STATUS_ICONS[selected.status]} {STATUS_LABELS[selected.status] || selected.status}
                                </span>
                            </div>

                            <div className="sol-detail-body">
                                <h3>{selected.title}</h3>
                                <p className="sol-detail-meta">
                                    Submitted by {selected.organization_name || "Admin"} · {formatDateTime(selected.created_at)}
                                </p>

                                <div className="sol-detail-block">
                                    <span>Description</span>
                                    <p>{selected.description || "No description provided."}</p>
                                </div>

                                <div className="sol-detail-block">
                                    <span>Proposed action</span>
                                    <p>{selected.proposed_action || "No proposed action provided."}</p>
                                </div>

                                {selected.reviewed_at && (
                                    <p className="sol-reviewed">
                                        ✓ Last reviewed: {formatDateTime(selected.reviewed_at)}
                                    </p>
                                )}
                            </div>
                        </section>

                        <aside className="sol-review" ref={reviewRef}>
                            <h2>Review action</h2>
                            <p className="sol-review-sub">
                                #{selected.id} · {selected.problem_title || `Problem #${selected.problem}`}
                            </p>

                            <div className="sol-dark-field">
                                <label htmlFor="sol-decision">Review decision</label>
                                <select id="sol-decision" value={decision}
                                    onChange={(e) => setDecision(e.target.value)}>
                                    {DECISIONS.map(([value, text]) => (
                                        <option key={value} value={value}>{text}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="sol-dark-field">
                                <label htmlFor="sol-notes">Review notes</label>
                                <textarea id="sol-notes" rows="3" maxLength={5000}
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Enter feedback for the organization..." />
                            </div>

                            <button type="button" className="sol-record-btn"
                                disabled={reviewing} onClick={handleReview}>
                                {reviewing ? "Saving..." : "Record review decision"}
                            </button>

                            <div className="sol-review-note">
                                <strong>Human approval required</strong>
                                <p>
                                    Approving marks the solution as approved. Requesting changes or rejecting
                                    sends your review notes back to the organization.
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SolutionManagement;