
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    getOrganizationSolutions,
    submitOrganizationSolution,
    getOrganizationSolutionDetails,
    uploadOrganizationSolutionEvidence,
    getOrganizationDashboard,
} from "../../services/api";
import "../../styles/organization/Solutions.css";
import { useToast } from "../../components/toast/ToastContext";

const STATUS_LABELS = {
    pending: "Under Review",
    approved: "Approved",
    changes_requested: "Changes Requested",
    rejected: "Rejected",
};

const STATUS_CLASSES = {
    pending: "pending",
    approved: "approved",
    changes_requested: "changes",
    rejected: "rejected",
};

const initialForm = {
    assignment_id: "",
    title: "",
    description: "",
    proposed_action: "",
};

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleString();
}

export default function Solutions() {
    const { showToast } = useToast();

    const [solutions, setSolutions] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [selectedSolution, setSelectedSolution] = useState(null);
    const [evidenceType, setEvidenceType] = useState("after");
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [evidenceCaption, setEvidenceCaption] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // Load assignments that are accepted or currently in progress.
    const loadEligibleAssignments = useCallback(async () => {
        setAssignmentsLoading(true);

        try {
            const data = await getOrganizationDashboard();

            const availableAssignments = (
                data.next_assignments || []
            ).filter((item) =>
                ["accepted", "in_progress"].includes(
                    item.assignment_status
                )
            );

            setAssignments(availableAssignments);
        } catch (err) {
            showToast(
                "error",
                "Loading Failed",
                err.message || "Unable to load your assignments."
            );
        } finally {
            setAssignmentsLoading(false);
        }
    }, [showToast]);

    // Load submitted solutions.
    const loadSolutions = useCallback(async () => {
        setLoading(true);

        try {
            const data = await getOrganizationSolutions();

            setSolutions(
                Array.isArray(data.results) ? data.results : []
            );
        } catch (err) {
            showToast(
                "error",
                "Loading Failed",
                err.message || "Unable to load solutions."
            );
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadSolutions();
        loadEligibleAssignments();
    }, [loadSolutions, loadEligibleAssignments]);

    // Search and status filtering.
    const filteredSolutions = useMemo(() => {
        const term = search.trim().toLowerCase();

        return solutions.filter((solution) => {
            const matchesSearch =
                !term ||
                String(solution.title || "").toLowerCase().includes(term) ||
                String(solution.problem_title || "")
                    .toLowerCase()
                    .includes(term) ||
                String(solution.description || "")
                    .toLowerCase()
                    .includes(term) ||
                String(solution.problem_id || "").includes(term);

            const matchesStatus =
                statusFilter === "all" ||
                solution.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [solutions, search, statusFilter]);

    // Solution statistics.
    const stats = useMemo(
        () => ({
            total: solutions.length,
            pending: solutions.filter(
                (item) => item.status === "pending"
            ).length,
            approved: solutions.filter(
                (item) => item.status === "approved"
            ).length,
            changes: solutions.filter(
                (item) => item.status === "changes_requested"
            ).length,
        }),
        [solutions]
    );

    const updateField = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // Submit a solution.
    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.assignment_id || Number(form.assignment_id) < 1) {
            showToast(
                "warning",
                "Missing Information",
                "Please select an accepted or in-progress assignment."
            );
            return;
        }

        if (form.title.trim().length < 5) {
            showToast(
                "warning",
                "Missing Information",
                "The solution title must contain at least 5 characters."
            );
            return;
        }

        if (form.description.trim().length < 10) {
            showToast(
                "warning",
                "Missing Information",
                "Please provide a description of at least 10 characters."
            );
            return;
        }

        setSubmitting(true);

        try {
            const data = await submitOrganizationSolution(form);

            setForm(initialForm);
            setShowForm(false);
            setSuccess("");

            showToast(
                "success",
                "Solution Submitted",
                data.message ||
                    "Your solution has been submitted successfully."
            );

            await loadSolutions();
        } catch (err) {
            showToast(
                "error",
                "Submission Failed",
                err.message || "Unable to submit the solution."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Open solution details and its evidence gallery.
    const openDetails = async (solutionId) => {
        setError("");
        setSuccess("");

        try {
            const data =
                await getOrganizationSolutionDetails(solutionId);

            setSelectedSolution(data);
            setEvidenceType("after");
            setEvidenceFile(null);
            setEvidenceCaption("");
        } catch (err) {
            showToast(
                "error",
                "Loading Failed",
                err.message || "Unable to load solution details."
            );
        }
    };

    // Upload evidence for the selected solution.
    const handleEvidenceUpload = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!selectedSolution || !evidenceFile) {
            showToast(
                "warning",
                "Missing Information",
                "Please choose an image to upload."
            );
            return;
        }

        if (evidenceFile.size > 5 * 1024 * 1024) {
            showToast(
                "warning",
                "File Too Large",
                "Image size must not exceed 5 MB."
            );
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(evidenceFile.type)) {
            showToast(
                "warning",
                "Invalid Evidence",
                "Please upload a JPEG, PNG, or WebP image."
            );
            return;
        }

        setUploading(true);

        try {
            await uploadOrganizationSolutionEvidence(
                selectedSolution.id,
                {
                    evidence_type: evidenceType,
                    file: evidenceFile,
                    caption: evidenceCaption,
                }
            );

            setSuccess("");

            showToast(
                "success",
                "Evidence Uploaded",
                "Your evidence image has been uploaded successfully."
            );

            setEvidenceFile(null);
            setEvidenceCaption("");

            await openDetails(selectedSolution.id);
            await loadSolutions();
        } catch (err) {
            showToast(
                "error",
                "Upload Failed",
                err.message || "Unable to upload evidence."
            );
        } finally {
            setUploading(false);
        }
    };

    const closeDetails = () => {
        setSelectedSolution(null);
        setEvidenceFile(null);
        setEvidenceCaption("");
    };

    return (
        <main className="org-solutions-page">
            <section className="os-hero">
                <span
                    className="os-orb os-orb-1"
                    aria-hidden="true"
                />
                <span
                    className="os-orb os-orb-2"
                    aria-hidden="true"
                />
                <span
                    className="os-hero-grid"
                    aria-hidden="true"
                />

                <div className="os-hero-copy">
                    <div className="os-hero-top">
                        <Link
                            className="os-back-link"
                            to="/organization/dashboard"
                        >
                            ← Back to Dashboard
                        </Link>

                        <span
                            className="os-hero-divider"
                            aria-hidden="true"
                        />

                        <span className="os-eyebrow">
                            ORGANIZATION WORKSPACE
                        </span>
                    </div>

                    <h1>Solutions &amp; Evidence</h1>

                    <p>
                        Submit completed work, track review decisions, and
                        attach photographic evidence to support your solution.
                    </p>

                    <button
                        className="os-primary-button os-hero-button"
                        type="button"
                        onClick={() => {
                            setShowForm((value) => !value);
                            setError("");
                            setSuccess("");
                        }}
                    >
                        {showForm ? "Close Form" : "+ Submit Solution"}
                    </button>
                </div>

                <div className="os-hero-art" aria-hidden="true">
                    <svg
                        viewBox="0 0 340 260"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient
                                id="osCard"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                            >
                                <stop offset="0" stopColor="#ffffff" />
                                <stop offset="1" stopColor="#dff5f0" />
                            </linearGradient>

                            <linearGradient
                                id="osPhoto"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0" stopColor="#7fe3d0" />
                                <stop offset="1" stopColor="#1b8f8a" />
                            </linearGradient>
                        </defs>

                        <circle
                            className="os-art-glow"
                            cx="170"
                            cy="130"
                            r="105"
                            fill="rgba(100,225,200,0.14)"
                        />

                        <g className="os-art-float">
                            <rect
                                x="95"
                                y="28"
                                width="150"
                                height="196"
                                rx="16"
                                fill="url(#osCard)"
                            />

                            <rect
                                x="132"
                                y="18"
                                width="76"
                                height="22"
                                rx="8"
                                fill="#10243a"
                            />

                            <circle
                                cx="170"
                                cy="29"
                                r="4"
                                fill="#64e1c8"
                            />

                            <rect
                                x="140"
                                y="64"
                                width="85"
                                height="8"
                                rx="4"
                                fill="#c9d9e2"
                            />

                            <rect
                                x="140"
                                y="104"
                                width="70"
                                height="8"
                                rx="4"
                                fill="#c9d9e2"
                            />

                            <rect
                                x="140"
                                y="144"
                                width="80"
                                height="8"
                                rx="4"
                                fill="#c9d9e2"
                            />

                            <circle
                                cx="118"
                                cy="68"
                                r="11"
                                fill="#0d967f"
                            />

                            <path
                                className="os-art-check os-check-1"
                                d="M112 68 l5 5 l9 -10"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            <circle
                                cx="118"
                                cy="108"
                                r="11"
                                fill="#0d967f"
                            />

                            <path
                                className="os-art-check os-check-2"
                                d="M112 108 l5 5 l9 -10"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            <circle
                                cx="118"
                                cy="148"
                                r="11"
                                fill="#0d967f"
                            />

                            <path
                                className="os-art-check os-check-3"
                                d="M112 148 l5 5 l9 -10"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            <rect
                                x="118"
                                y="182"
                                width="104"
                                height="22"
                                rx="11"
                                fill="#e5f7f3"
                            />

                            <rect
                                className="os-art-progress"
                                x="118"
                                y="182"
                                width="104"
                                height="22"
                                rx="11"
                                fill="#0d967f"
                            />
                        </g>

                        <g className="os-art-float os-art-float-delay">
                            <g transform="rotate(8 275 170)">
                                <rect
                                    x="228"
                                    y="120"
                                    width="86"
                                    height="76"
                                    rx="12"
                                    fill="#ffffff"
                                />

                                <rect
                                    x="236"
                                    y="128"
                                    width="70"
                                    height="46"
                                    rx="8"
                                    fill="url(#osPhoto)"
                                />

                                <circle
                                    cx="288"
                                    cy="142"
                                    r="6"
                                    fill="#fff6c9"
                                />

                                <path
                                    d="M236 174 l18 -22 l14 14 l10 -10 l28 18 z"
                                    fill="#0f6d6b"
                                />

                                <rect
                                    x="236"
                                    y="180"
                                    width="40"
                                    height="6"
                                    rx="3"
                                    fill="#c9d9e2"
                                />
                            </g>
                        </g>

                        <g className="os-art-float os-art-float-slow">
                            <path
                                d="M52 78 l30 -12 l30 12 v30 c0 22 -14 36 -30 44 c-16 -8 -30 -22 -30 -44 z"
                                fill="#64e1c8"
                            />

                            <path
                                className="os-art-check os-check-4"
                                d="M68 106 l10 10 l18 -22"
                                fill="none"
                                stroke="#10243a"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        <g className="os-art-spark" fill="#ffffff">
                            <circle cx="40" cy="190" r="4" />
                            <circle cx="300" cy="60" r="3" />
                            <circle cx="205" cy="12" r="3" />
                        </g>
                    </svg>
                </div>
            </section>

            {error && (
                <div
                    className="os-alert os-alert-error"
                    role="alert"
                >
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}

            {success && (
                <div
                    className="os-alert os-alert-success"
                    role="status"
                >
                    <span>{success}</span>

                    <button
                        type="button"
                        onClick={() => setSuccess("")}
                        aria-label="Dismiss message"
                    >
                        ×
                    </button>
                </div>
            )}

            <section
                className="os-stat-grid"
                aria-label="Solution statistics"
            >
                <article className="os-stat-card">
                    <span className="os-stat-icon">▤</span>
                    <div>
                        <p>Total Solutions</p>
                        <strong>{stats.total}</strong>
                    </div>
                </article>

                <article className="os-stat-card">
                    <span className="os-stat-icon os-icon-amber">◷</span>
                    <div>
                        <p>Under Review</p>
                        <strong>{stats.pending}</strong>
                    </div>
                </article>

                <article className="os-stat-card">
                    <span className="os-stat-icon os-icon-green">✓</span>
                    <div>
                        <p>Approved</p>
                        <strong>{stats.approved}</strong>
                    </div>
                </article>

                <article className="os-stat-card">
                    <span className="os-stat-icon os-icon-purple">↻</span>
                    <div>
                        <p>Changes Requested</p>
                        <strong>{stats.changes}</strong>
                    </div>
                </article>
            </section>

            {showForm && (
                <section className="os-panel os-submit-panel">
                    <div className="os-panel-heading">
                        <div>
                            <span className="os-eyebrow">
                                NEW SUBMISSION
                            </span>

                            <h2>Submit a solution</h2>

                            <p>
                                The assignment must belong to your
                                organization and be accepted or in progress.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="os-form">
                        <div className="os-field">
                            <label htmlFor="assignment_id">
                                Assigned problem *
                            </label>

                            <select
                                id="assignment_id"
                                name="assignment_id"
                                value={form.assignment_id}
                                onChange={updateField}
                                required
                                disabled={assignmentsLoading}
                            >
                                <option value="">
                                    {assignmentsLoading
                                        ? "Loading assignments..."
                                        : "Select an accepted assignment"}
                                </option>

                                {assignments.map((assignment) => (
                                    <option
                                        key={assignment.assignment_id}
                                        value={assignment.assignment_id}
                                    >
                                        {assignment.title} — Assignment #
                                        {assignment.assignment_id}
                                    </option>
                                ))}
                            </select>

                            <small>
                                Only accepted or in-progress assignments can
                                receive a solution.
                            </small>

                            {!assignmentsLoading &&
                                assignments.length === 0 && (
                                    <small>
                                        No eligible assignments found. Accept
                                        an assigned problem first.
                                    </small>
                                )}
                        </div>

                        <div className="os-field">
                            <label htmlFor="title">
                                Solution title *
                            </label>

                            <input
                                id="title"
                                name="title"
                                value={form.title}
                                onChange={updateField}
                                placeholder="e.g. Streetlight repair completed"
                                minLength="5"
                                maxLength="200"
                                required
                            />
                        </div>

                        <div className="os-field os-field-full">
                            <label htmlFor="description">
                                Work completed *
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={updateField}
                                placeholder="Describe the work completed and how the issue was addressed..."
                                rows="4"
                                minLength="10"
                                required
                            />
                        </div>

                        <div className="os-field os-field-full">
                            <label htmlFor="proposed_action">
                                Actions taken
                            </label>

                            <textarea
                                id="proposed_action"
                                name="proposed_action"
                                value={form.proposed_action}
                                onChange={updateField}
                                placeholder="Mention repairs, materials, inspections, or follow-up actions..."
                                rows="3"
                            />
                        </div>

                        <div className="os-form-footer">
                            <p>
                                Submission status will initially be Under
                                Review.
                            </p>

                            <button
                                className="os-primary-button"
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Submitting..."
                                    : "Submit for Review"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="os-panel">
                <div className="os-list-heading">
                    <div>
                        <span className="os-eyebrow">YOUR RECORDS</span>
                        <h2>Submitted solutions</h2>
                    </div>

                    <button
                        className="os-secondary-button"
                        type="button"
                        onClick={loadSolutions}
                        disabled={loading}
                    >
                        ↻ Refresh
                    </button>
                </div>

                <div className="os-filters">
                    <div className="os-search">
                        <span aria-hidden="true">⌕</span>

                        <input
                            aria-label="Search solutions"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search title, problem, or ID..."
                        />
                    </div>

                    <select
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                    >
                        <option value="all">All statuses</option>
                        <option value="pending">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="changes_requested">
                            Changes Requested
                        </option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                {loading ? (
                    <div className="os-empty-state">
                        <div className="os-spinner" />
                        <p>Loading your solutions...</p>
                    </div>
                ) : filteredSolutions.length === 0 ? (
                    <div className="os-empty-state">
                        <div className="os-empty-icon">▤</div>

                        <h3>
                            {solutions.length
                                ? "No matching solutions"
                                : "No solutions submitted yet"}
                        </h3>

                        <p>
                            {solutions.length
                                ? "Try changing your search or status filter."
                                : "Once you submit a solution for an assigned problem, it will appear here."}
                        </p>

                        {!solutions.length && (
                            <button
                                className="os-primary-button"
                                type="button"
                                onClick={() => setShowForm(true)}
                            >
                                Submit your first solution
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="os-table-wrap">
                        <table className="os-table">
                            <thead>
                                <tr>
                                    <th>Solution</th>
                                    <th>Problem</th>
                                    <th>Assignment</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredSolutions.map((solution) => (
                                    <tr key={solution.id}>
                                        <td>
                                            <div className="os-solution-cell">
                                                <span className="os-solution-symbol">
                                                    ✓
                                                </span>

                                                <div>
                                                    <strong>
                                                        {solution.title}
                                                    </strong>

                                                    <small>
                                                        Solution #{solution.id}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="os-problem-name">
                                                {solution.problem_title ||
                                                    `Problem #${solution.problem_id}`}
                                            </span>

                                            <small className="os-muted">
                                                ID: {solution.problem_id}
                                            </small>
                                        </td>

                                        <td>
                                            #{solution.assignment_id ?? "—"}
                                        </td>

                                        <td>
                                            <span
                                                className={`os-status os-status-${STATUS_CLASSES[solution.status] || "default"}`}
                                            >
                                                {STATUS_LABELS[
                                                    solution.status
                                                ] ||
                                                    solution.status ||
                                                    "Unknown"}
                                            </span>
                                        </td>

                                        <td>
                                            {formatDate(solution.created_at)}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="os-view-button"
                                                onClick={() =>
                                                    openDetails(solution.id)
                                                }
                                            >
                                                View details →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedSolution && (
                <div
                    className="os-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDetails();
                        }
                    }}
                >
                    <section
                        className="os-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="os-modal-title"
                    >
                        <div className="os-modal-header">
                            <div>
                                <span className="os-eyebrow">
                                    SOLUTION #{selectedSolution.id}
                                </span>

                                <h2 id="os-modal-title">
                                    {selectedSolution.title}
                                </h2>
                            </div>

                            <button
                                className="os-modal-close"
                                type="button"
                                onClick={closeDetails}
                                aria-label="Close details"
                            >
                                ×
                            </button>
                        </div>

                        <div className="os-modal-body">
                            <div className="os-detail-status-row">
                                <span
                                    className={`os-status os-status-${STATUS_CLASSES[selectedSolution.status] || "default"}`}
                                >
                                    {STATUS_LABELS[
                                        selectedSolution.status
                                    ] || selectedSolution.status}
                                </span>

                                <span className="os-muted">
                                    Submitted{" "}
                                    {formatDate(selectedSolution.created_at)}
                                </span>
                            </div>

                            <div className="os-detail-block">
                                <h3>Work completed</h3>

                                <p>
                                    {selectedSolution.description ||
                                        "No description provided."}
                                </p>
                            </div>

                            <div className="os-detail-block">
                                <h3>Actions taken</h3>

                                <p>
                                    {selectedSolution.proposed_action ||
                                        "No additional actions provided."}
                                </p>
                            </div>

                            {selectedSolution.admin_review_notes && (
                                <div className="os-review-note">
                                    <strong>Admin review notes</strong>
                                    <p>
                                        {selectedSolution.admin_review_notes}
                                    </p>
                                </div>
                            )}

                            <div className="os-detail-block">
                                <h3>Evidence gallery</h3>

                                {selectedSolution.evidence?.length ? (
                                    <div className="os-evidence-grid">
                                        {selectedSolution.evidence.map(
                                            (item) => (
                                                <article
                                                    className="os-evidence-card"
                                                    key={item.id}
                                                >
                                                    {item.file ? (
                                                        <a
                                                            href={item.file}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <img
                                                                src={item.file}
                                                                alt={
                                                                    item.caption ||
                                                                    `${item.evidence_type} evidence`
                                                                }
                                                            />
                                                        </a>
                                                    ) : (
                                                        <div className="os-evidence-placeholder">
                                                            Image unavailable
                                                        </div>
                                                    )}

                                                    <div>
                                                        <span className="os-evidence-type">
                                                            {item.evidence_type ===
                                                            "before"
                                                                ? "Before"
                                                                : "After"}
                                                        </span>

                                                        <p>
                                                            {item.caption ||
                                                                "No caption"}
                                                        </p>
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="os-muted">
                                        No evidence images uploaded yet.
                                    </p>
                                )}
                            </div>

                            {!["approved", "rejected"].includes(
                                selectedSolution.status
                            ) && (
                                <form
                                    className="os-evidence-form"
                                    onSubmit={handleEvidenceUpload}
                                >
                                    <h3>Upload evidence image</h3>

                                    <div className="os-evidence-form-grid">
                                        <div className="os-field">
                                            <label htmlFor="evidence_type">
                                                Evidence type
                                            </label>

                                            <select
                                                id="evidence_type"
                                                value={evidenceType}
                                                onChange={(event) =>
                                                    setEvidenceType(
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                <option value="before">
                                                    Before work
                                                </option>
                                                <option value="after">
                                                    After work
                                                </option>
                                            </select>
                                        </div>

                                        <div className="os-field">
                                            <label htmlFor="evidence_file">
                                                Image (max 5 MB)
                                            </label>

                                            <input
                                                id="evidence_file"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(event) => {
                                                    const file =
                                                        event.target.files?.[0] ||
                                                        null;

                                                    if (!file) {
                                                        setEvidenceFile(null);
                                                        return;
                                                    }

                                                    const allowedTypes = [
                                                        "image/jpeg",
                                                        "image/png",
                                                        "image/webp",
                                                    ];

                                                    if (
                                                        !allowedTypes.includes(
                                                            file.type
                                                        )
                                                    ) {
                                                        showToast(
                                                            "warning",
                                                            "Invalid Evidence",
                                                            "Please select a JPEG, PNG, or WebP image."
                                                        );

                                                        event.target.value = "";
                                                        setEvidenceFile(null);
                                                        return;
                                                    }

                                                    if (
                                                        file.size >
                                                        5 * 1024 * 1024
                                                    ) {
                                                        showToast(
                                                            "warning",
                                                            "File Too Large",
                                                            "Image size must not exceed 5 MB."
                                                        );

                                                        event.target.value = "";
                                                        setEvidenceFile(null);
                                                        return;
                                                    }

                                                    setEvidenceFile(file);

                                                    showToast(
                                                        "success",
                                                        "Evidence Selected",
                                                        "Your image is ready to upload."
                                                    );
                                                }}
                                            />
                                        </div>

                                        <div className="os-field os-field-full">
                                            <label htmlFor="evidence_caption">
                                                Caption (optional)
                                            </label>

                                            <input
                                                id="evidence_caption"
                                                value={evidenceCaption}
                                                onChange={(event) =>
                                                    setEvidenceCaption(
                                                        event.target.value
                                                    )
                                                }
                                                maxLength="500"
                                                placeholder="Describe what the image shows"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="os-primary-button"
                                        type="submit"
                                        disabled={
                                            uploading || !evidenceFile
                                        }
                                    >
                                        {uploading
                                            ? "Uploading..."
                                            : "Upload Evidence"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
