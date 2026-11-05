import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    getAdminComplaints,
    getAdminComplaint,
    reviewAdminComplaint,
} from "../../services/api";

import "../../styles/admin/Complaints.css";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "under_review", label: "Under Review" },
    { value: "investigating", label: "Investigating" },
    { value: "resolved", label: "Resolved" },
    { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS = [
    { value: "all", label: "All complaint types" },
    { value: "problem", label: "Problem complaints" },
    { value: "organization", label: "Organization complaints" },
];

const REVIEW_STATUSES = STATUS_OPTIONS.filter((status) =>
    ["under_review", "investigating", "resolved", "rejected"].includes(status.value)
);

const DECISION_LABELS = {
    under_review: "Move to under review",
    investigating: "Start investigation",
    resolved: "Mark as resolved",
    rejected: "Reject complaint",
};

const getComplaintCode = (complaint) => complaint?.complaint_code;

const getStatusLabel = (status) => {
    const option = STATUS_OPTIONS.find((item) => item.value === status);
    return option?.label || String(status || "Unknown");
};

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatShortDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getTargetLabel = (complaint) => {
    if (complaint.target_type === "organization") {
        return complaint.target_organization_name || "Organization complaint";
    }
    return complaint.problem_title || "Community problem";
};

const getErrorMessage = (error) =>
    error?.message || "Something went wrong. Please try again.";

const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

const toClass = (status) => String(status || "unknown").replace(/_/g, "-");

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Complaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("under_review");
    const [investigationNotes, setInvestigationNotes] = useState("");
    const [resolutionNotes, setResolutionNotes] = useState("");

    const [updating, setUpdating] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const decisionRef = useRef(null);
    const queueRef = useRef(null);
    const autoSelected = useRef(false);

    /* ---------------- data loading ---------------- */

    const fetchComplaints = useCallback(async () => {
        setLoading(true);

        try {
            const params = {};

            if (statusFilter !== "all") params.status = statusFilter;
            if (search.trim()) params.search = search.trim();

            const response = await getAdminComplaints(params);

            const results = Array.isArray(response)
                ? response
                : response?.results || response?.complaints || [];

            const list = Array.isArray(results) ? results : [];
            setComplaints(list);
            return list;
        } catch (err) {
            setError(getErrorMessage(err));
            return [];
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    /* ---------------- derived data ---------------- */

    const stats = useMemo(() => {
        const count = (fn) => complaints.filter(fn).length;

        return {
            total: complaints.length,
            open: count((c) => !["resolved", "rejected"].includes(c.status)),
            pending: count((c) => c.status === "pending"),
            reviewing: count((c) => ["under_review", "investigating"].includes(c.status)),
            resolved: count((c) => c.status === "resolved"),
        };
    }, [complaints]);

    const visibleComplaints = useMemo(() => {
        const list = complaints.filter(
            (c) => typeFilter === "all" || c.target_type === typeFilter
        );

        return list.sort((a, b) => {
            const diff = new Date(a.created_at || 0) - new Date(b.created_at || 0);
            return sortOrder === "oldest" ? diff : -diff;
        });
    }, [complaints, typeFilter, sortOrder]);

    const pendingList = useMemo(
        () => complaints.filter((c) => c.status === "pending"),
        [complaints]
    );

    const firstPending = pendingList[0] || null;

    /* ---------------- selection ---------------- */

    const applyDetails = useCallback((details) => {
        setSelectedComplaint(details);
        setSelectedStatus(
            REVIEW_STATUSES.some((item) => item.value === details.status)
                ? details.status
                : "under_review"
        );
        setInvestigationNotes(details.admin_investigation_notes || "");
        setResolutionNotes(details.resolution_notes || "");
    }, []);

    const openComplaint = useCallback(
        async (complaint) => {
            const code = getComplaintCode(complaint);

            if (!code) {
                setError("Complaint reference is missing.");
                return;
            }

            setError("");
            setSuccessMessage("");

            /* show the row data straight away, then enrich from the detail API */
            applyDetails(complaint);
            setLoadingDetails(true);

            try {
                const response = await getAdminComplaint(code);
                const details = response?.complaint || response;
                applyDetails({ ...complaint, ...details });
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoadingDetails(false);
            }
        },
        [applyDetails]
    );

    /* open the first complaint awaiting a decision, once */
    useEffect(() => {
        if (!autoSelected.current && complaints.length) {
            autoSelected.current = true;
            openComplaint(firstPending || complaints[0]);
        }
    }, [complaints, firstPending, openComplaint]);

    const jumpToDecision = (complaint) => {
        if (complaint) openComplaint(complaint);
        setTimeout(() => {
            decisionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
    };

    const handleReset = () => {
        if (selectedComplaint) applyDetails(selectedComplaint);
        setError("");
    };

    /* ---------------- actions ---------------- */

    const handleStatusUpdate = async (event) => {
        event.preventDefault();

        if (!selectedComplaint) return;

        const code = getComplaintCode(selectedComplaint);

        if (!code) {
            setError("Complaint reference is missing.");
            return;
        }

        if (selectedStatus === "resolved" && !resolutionNotes.trim()) {
            setError("Enter resolution notes before resolving the complaint.");
            return;
        }

        setUpdating(true);
        setError("");
        setSuccessMessage("");

        try {
            const response = await reviewAdminComplaint(code, {
                status: selectedStatus,
                admin_investigation_notes: investigationNotes,
                resolution_notes: resolutionNotes,
            });

            const updated = response?.complaint || response;

            setSelectedComplaint((previous) => (previous ? { ...previous, ...updated } : previous));
            setSuccessMessage(`Complaint ${code} updated successfully.`);

            await fetchComplaints();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUpdating(false);
        }
    };

    const browseAll = () => {
        setSearch("");
        setStatusFilter("all");
        setTypeFilter("all");
        queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const showPending = () => {
        setStatusFilter("pending");
        queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleExport = () => {
        const rows = [
            ["Code", "Title", "Type", "Related item", "Submitted", "Status"],
            ...visibleComplaints.map((c) => [
                getComplaintCode(c),
                c.title || "",
                c.target_type === "organization" ? "Organization" : "Problem",
                getTargetLabel(c),
                formatShortDate(c.created_at),
                getStatusLabel(c.status),
            ]),
        ];

        const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "civicsolve-complaints.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    /* ---------------- render ---------------- */

    const selectedCode = getComplaintCode(selectedComplaint);

    return (
        <div className="complaints-page">

            {/* decision strip — full width, like the dashboard alert */}
            {pendingList.length > 0 && (
                <div className="cmp-banner">
                    <div className="cmp-container cmp-banner-inner">
                        <span className="cmp-banner-icon">!</span>
                        <p>
                            {firstPending
                                ? `${getComplaintCode(firstPending)} requires your decision — ${firstPending.title || "Untitled complaint"} is pending review. `
                                : "Complaints require your decision. "}
                            {pendingList.length > 1 && `${pendingList.length} complaints are waiting. `}
                            <button type="button" onClick={() => jumpToDecision(firstPending)}>
                                Review now →
                            </button>
                        </p>
                    </div>
                </div>
            )}

            <div className="cmp-container">

                {error && (
                    <div className="cmp-error" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
                    </div>
                )}

                {successMessage && (
                    <div className="cmp-success" role="status">
                        <span>{successMessage}</span>
                        <button type="button" onClick={() => setSuccessMessage("")} aria-label="Dismiss message">×</button>
                    </div>
                )}

                {/* stat cards */}
                <div className="cmp-stats">
                    <div className="cmp-stat cmp-stat-teal">
                        <span>Open</span>
                        <strong>{stats.open}</strong>
                        <em>● Active complaints</em>
                    </div>

                    <div className="cmp-stat cmp-stat-amber">
                        <span>Pending</span>
                        <strong>{stats.pending}</strong>
                        <em>● Needs your decision</em>
                    </div>

                    <div className="cmp-stat cmp-stat-solid">
                        <span>Under review / investigating</span>
                        <strong>{stats.reviewing}</strong>
                        <em>● Awaiting resolution</em>
                    </div>

                    <div className="cmp-stat cmp-stat-indigo">
                        <span>Resolved</span>
                        <strong>{stats.resolved}</strong>
                        <em>● Of {stats.total} complaints</em>
                    </div>
                </div>

                {/* search + filters */}
                <div className="cmp-filterbar" ref={queueRef}>
                    <div className="cmp-search">
                        <span aria-hidden="true">⌕</span>
                        <input type="search" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search complaint ID or issue"
                            aria-label="Search complaints" />
                    </div>

                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        aria-label="Filter by complaint type">
                        {TYPE_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by status">
                        {STATUS_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>

                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                        aria-label="Sort by date">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>

                {/* review queue */}
                <section className="cmp-card cmp-queue">
                    <div className="cmp-card-head">
                        <div>
                            <h2>Review queue</h2>
                            <p>
                                {visibleComplaints.length} complaint{visibleComplaints.length === 1 ? "" : "s"} awaiting admin action
                            </p>
                        </div>
                        <button type="button" className="cmp-ghost-btn" onClick={handleExport}
                            disabled={!visibleComplaints.length}>
                            Export →
                        </button>
                    </div>

                    {loading ? (
                        <div className="cmp-empty">Loading complaints...</div>
                    ) : visibleComplaints.length === 0 ? (
                        <div className="cmp-empty">
                            <strong>No complaints found</strong>
                            <span>Try another search or filter.</span>
                        </div>
                    ) : (
                        <div className="cmp-table-wrap">
                            <table className="cmp-table">
                                <thead>
                                    <tr>
                                        <th>Complaint / Linked issue</th>
                                        <th>Type</th>
                                        <th>Submitted</th>
                                        <th>Review status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleComplaints.map((complaint) => {
                                        const code = getComplaintCode(complaint);
                                        const status = complaint.status || "unknown";
                                        const isOrg = complaint.target_type === "organization";

                                        return (
                                            <tr key={code}
                                                className={code === selectedCode ? "is-selected" : ""}>
                                                <td>
                                                    <strong>
                                                        {code || "—"} · {getTargetLabel(complaint)}
                                                    </strong>
                                                    <small>{complaint.title || "Untitled complaint"}</small>
                                                </td>

                                                <td>
                                                    <span className={`cmp-type ${isOrg ? "type-org" : "type-problem"}`}>
                                                        {isOrg ? "Organization" : "Problem"}
                                                    </span>
                                                </td>

                                                <td>{formatShortDate(complaint.created_at)}</td>

                                                <td>
                                                    <span className={`cmp-status cmp-status-${toClass(status)}`}>
                                                        {getStatusLabel(status)}
                                                    </span>
                                                </td>

                                                <td>
                                                    <button type="button"
                                                        className="cmp-review-btn"
                                                        disabled={loadingDetails}
                                                        onClick={() => jumpToDecision(complaint)}>
                                                        Review →
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* selected complaint + decision */}
                <div className="cmp-layout">

                    <div className="cmp-main">
                        {selectedComplaint ? (
                            <section className="cmp-card cmp-selected">
                                <div className="cmp-selected-head">
                                    <h2>Selected complaint · {selectedCode}</h2>
                                    <span className={`cmp-chip cmp-status-${toClass(selectedComplaint.status)}`}>
                                        {getStatusLabel(selectedComplaint.status)}
                                    </span>
                                </div>

                                <div className="cmp-title-block">
                                    <strong>{selectedComplaint.title || "Untitled complaint"}</strong>
                                    <span>
                                        Submitted {formatDate(selectedComplaint.created_at)} · Linked {getTargetLabel(selectedComplaint)}
                                    </span>
                                </div>

                                <blockquote className="cmp-quote">
                                    {selectedComplaint.description || "No description provided."}
                                </blockquote>

                                <div className="cmp-meta">
                                    <div>
                                        <span>Complaint target</span>
                                        <strong>
                                            {selectedComplaint.target_type === "organization" ? "Organization" : "Problem"}
                                        </strong>
                                    </div>
                                    <div>
                                        <span>Related item</span>
                                        <strong>{getTargetLabel(selectedComplaint)}</strong>
                                    </div>
                                    <div>
                                        <span>Current status</span>
                                        <strong>{getStatusLabel(selectedComplaint.status)}</strong>
                                    </div>
                                </div>

                                <div className="cmp-note">
                                    <strong>Review with the issue record</strong>
                                    <p>
                                        Check the latest evidence and organization update before deciding. Keep the
                                        complainant informed and do not expose private contact details.
                                    </p>
                                </div>
                            </section>
                        ) : (
                            <section className="cmp-card cmp-selected">
                                <div className="cmp-empty">
                                    {loading ? "Loading complaints..." : "Select a complaint from the queue to review it."}
                                </div>
                            </section>
                        )}

                        <section className="cmp-summary">
                            <strong>Admin review summary</strong>
                            <h3>
                                {stats.open} open · {stats.pending} pending · {stats.resolved} resolved
                            </h3>
                            <p>
                                Your decisions keep this platform fair. Every review is recorded with investigation
                                and resolution notes.
                            </p>
                        </section>
                    </div>

                    <aside className="cmp-side">

                        {/* decision */}
                        <form className="cmp-decision" onSubmit={handleStatusUpdate} ref={decisionRef}>
                            <h2>Record a fair decision</h2>

                            <div className="cmp-field">
                                <label htmlFor="complaint-status">Resolution action</label>
                                <select id="complaint-status" value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    disabled={updating || !selectedComplaint}>
                                    {REVIEW_STATUSES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {DECISION_LABELS[item.value] || item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="cmp-field">
                                <label htmlFor="investigation-notes">Investigation notes</label>
                                <textarea id="investigation-notes" rows="3" maxLength={10000}
                                    value={investigationNotes}
                                    onChange={(e) => setInvestigationNotes(e.target.value)}
                                    placeholder="Record investigation findings..."
                                    disabled={updating || !selectedComplaint} />
                            </div>

                            <div className="cmp-field">
                                <label htmlFor="resolution-notes">
                                    Reason / resolution notes{selectedStatus === "resolved" ? " *" : ""}
                                </label>
                                <textarea id="resolution-notes" rows="3" maxLength={10000}
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe the resolution, if applicable..."
                                    disabled={updating || !selectedComplaint} />
                            </div>

                            <div className="cmp-actions">
                                <button type="submit" className="cmp-primary-btn"
                                    disabled={updating || !selectedComplaint}>
                                    {updating ? "Saving..." : "Record decision"}
                                </button>
                                <button type="button" className="cmp-text-btn"
                                    onClick={handleReset} disabled={updating || !selectedComplaint}>
                                    Reset
                                </button>
                            </div>

                            <p className="cmp-foot">
                                Resolving requires resolution notes. Decisions are saved to the complaint record.
                            </p>
                        </form>

                        {/* needs decision */}
                        <section className="cmp-mini">
                            <div className="cmp-mini-head">
                                <h2>Needs decision</h2>
                                <span className="cmp-badge">{pendingList.length}</span>
                            </div>

                            {pendingList.length === 0 ? (
                                <p className="cmp-mini-empty">No pending complaints right now.</p>
                            ) : (
                                pendingList.slice(0, 3).map((complaint) => (
                                    <div className="cmp-mini-item" key={getComplaintCode(complaint)}>
                                        <div>
                                            <strong>{complaint.title || "Untitled complaint"}</strong>
                                            <small>
                                                {getComplaintCode(complaint)} · {formatShortDate(complaint.created_at)}
                                            </small>
                                        </div>
                                        <button type="button" onClick={() => jumpToDecision(complaint)}>
                                            Review →
                                        </button>
                                    </div>
                                ))
                            )}
                        </section>

                        {/* quick actions */}
                        <section className="cmp-mini">
                            <h2>Quick actions</h2>

                            <button type="button" className="cmp-quick" onClick={fetchComplaints} disabled={loading}>
                                <span className="cmp-quick-icon">↻</span>
                                {loading ? "Loading..." : "Refresh complaints"}
                            </button>

                            <button type="button" className="cmp-quick" onClick={showPending}>
                                <span className="cmp-quick-icon cmp-quick-dark">◷</span>
                                Show pending complaints
                            </button>

                            <button type="button" className="cmp-quick" onClick={browseAll}>
                                <span className="cmp-quick-icon cmp-quick-light">▤</span>
                                Browse all complaints
                            </button>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default Complaints;