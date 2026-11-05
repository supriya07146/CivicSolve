import React, { useCallback, useEffect, useState } from "react";

import {
    getDuplicateProblemSuggestions,
    reviewDuplicateProblemSuggestion,
} from "../../services/api";

import "../../styles/admin/DuplicateProblemReview.css";

function getProblemValue(problem, keys, fallback = "Not available") {
    for (const key of keys) {
        const value = problem?.[key];

        if (value && typeof value === "object") {
            const nestedValue =
                value.name ||
                value.category_name ||
                value.title ||
                value.label;

            if (nestedValue) return nestedValue;
        }

        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    return fallback;
}

function getProblemCategory(problem) {
    return getProblemValue(
        problem,
        ["category_name", "category", "category_details"]
    );
}

function ProblemComparison({ title, problem }) {
    return (
        <div className="dpr-report-card">
            <div className="dpr-report-heading">
                <span>{title}</span>
                <span className="dpr-report-id">
                    #{problem?.id ?? "N/A"}
                </span>
            </div>

            <h4>
                {getProblemValue(problem, ["title", "problem_title"])}
            </h4>

            <div className="dpr-report-meta">
                <div>
                    <span>Category</span>
                    <strong>{getProblemCategory(problem)}</strong>
                </div>

                <div>
                    <span>Location</span>
                    <strong>
                        {getProblemValue(
                            problem,
                            ["location", "address", "area"]
                        )}
                    </strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>
                        {getProblemValue(problem, ["status"])}
                    </strong>
                </div>
            </div>

            <div className="dpr-description">
                <span>Description</span>
                <p>
                    {getProblemValue(
                        problem,
                        ["description", "problem_description"]
                    )}
                </p>
            </div>
        </div>
    );
}

function DuplicateProblemReview({ onClose }) {
    const [suggestions, setSuggestions] = useState([]);
    const [filter, setFilter] = useState("pending");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingId, setProcessingId] = useState(null);
    const [notice, setNotice] = useState("");

    const loadSuggestions = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            setNotice("");

            const response = await getDuplicateProblemSuggestions({
                status: filter,
            });

            setSuggestions(response?.suggestions || []);
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to load duplicate suggestions."
            );
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        loadSuggestions();
    }, [loadSuggestions]);

    const handleReview = async (suggestionId, reviewStatus) => {
        const actionText =
            reviewStatus === "accepted"
                ? "mark these reports as similar"
                : "mark these reports as not duplicates";

        const confirmed = window.confirm(
            `Are you sure you want to ${actionText}? ` +
            "The original problem records will remain unchanged."
        );

        if (!confirmed) return;

        try {
            setProcessingId(suggestionId);
            setError("");
            setNotice("");

            const response = await reviewDuplicateProblemSuggestion(
                suggestionId,
                reviewStatus
            );

            setNotice(
                response?.message ||
                "Duplicate suggestion reviewed successfully."
            );

            await loadSuggestions();
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to review this suggestion."
            );
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <section className="dpr-section">
            <header className="dpr-panel-header">
                <div className="dpr-panel-title">
                    <span className="dpr-panel-icon">✦</span>
                    <div>
                        <h2>AI Duplicate Analysis</h2>
                        <p>Reports the AI thinks may describe the same problem</p>
                    </div>
                </div>

                <div className="dpr-header-actions">
                    <button
                        type="button"
                        className="dpr-refresh"
                        onClick={loadSuggestions}
                        disabled={loading}
                    >
                        <span className={loading ? "dpr-spin" : ""}>↻</span> Refresh
                    </button>

                    <button
                        type="button"
                        className="dpr-close"
                        onClick={onClose}
                        aria-label="Close duplicate review"
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            </header>

            <div className="dpr-panel-body">

            <div className="dpr-filter-row">
                {["pending", "accepted", "rejected"].map((status) => (
                    <button
                        type="button"
                        key={status}
                        className={`dpr-filter ${filter === status ? "active" : ""
                            }`}
                        onClick={() => setFilter(status)}
                    >
                        {status === "pending"
                            ? "Pending Review"
                            : status === "accepted"
                                ? "Marked Similar"
                                : "Rejected"}
                    </button>
                ))}
            </div>

            {notice && (
                <div className="dpr-notice" role="status">
                    {notice}
                </div>
            )}

            {error && (
                <div className="dpr-error" role="alert">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="dpr-state">
                    Loading duplicate suggestions...
                </div>
            ) : suggestions.length === 0 ? (
                <div className="dpr-empty">
                    <div className="dpr-empty-icon">✓</div>
                    <h3>No {filter} suggestions</h3>
                    <p>
                        There are currently no suggestions in this category.
                    </p>
                </div>
            ) : (
                <div className="dpr-list">
                    {suggestions.map((suggestion, index) => {
                        const isPending =
                            suggestion.review_status === "pending";

                        const score = Number(
                            suggestion.similarity_score
                        );

                        return (
                            <article
                                className="dpr-suggestion"
                                key={suggestion.id}
                                style={{ "--i": index }}
                            >
                                <div className="dpr-suggestion-top">
                                    <div>
                                        <span className="dpr-suggestion-label">
                                            SUGGESTION #{suggestion.id}
                                        </span>

                                        <h3>
                                            Potentially related reports
                                        </h3>
                                    </div>

                                    <div className="dpr-score">
                                        <strong>
                                            {Number.isFinite(score)
                                                ? `${score.toFixed(1)}%`
                                                : "N/A"}
                                        </strong>
                                        <span>AI similarity score</span>
                                    </div>
                                </div>

                                <div className="dpr-comparison">
                                    <ProblemComparison
                                        title="New Report"
                                        problem={suggestion.new_problem}
                                    />

                                    <div className="dpr-compare-icon">
                                        ↔
                                    </div>

                                    <ProblemComparison
                                        title="Existing Report"
                                        problem={suggestion.similar_problem}
                                    />
                                </div>

                                <div className="dpr-ai-reason">
                                    <strong>
                                        <span>✦</span> AI Explanation
                                    </strong>
                                    <p>
                                        {suggestion.ai_reason ||
                                            "No explanation was provided."}
                                    </p>
                                </div>

                                <div className="dpr-suggestion-footer">
                                    <div className="dpr-review-status">
                                        Status:
                                        <strong
                                            className={`status-${suggestion.review_status}`}
                                        >
                                            {suggestion.review_status
                                                ?.replace("_", " ")}
                                        </strong>
                                    </div>

                                    {isPending ? (
                                        <div className="dpr-actions">
                                            <button
                                                type="button"
                                                className="dpr-reject"
                                                disabled={
                                                    processingId === suggestion.id
                                                }
                                                onClick={() =>
                                                    handleReview(
                                                        suggestion.id,
                                                        "rejected"
                                                    )
                                                }
                                            >
                                                Not a Duplicate
                                            </button>

                                            <button
                                                type="button"
                                                className="dpr-accept"
                                                disabled={
                                                    processingId === suggestion.id
                                                }
                                                onClick={() =>
                                                    handleReview(
                                                        suggestion.id,
                                                        "accepted"
                                                    )
                                                }
                                            >
                                                {processingId === suggestion.id
                                                    ? "Processing..."
                                                    : "Mark as Similar"}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="dpr-reviewed">
                                            Reviewed
                                        </span>
                                    )}
                                </div>

                                {suggestion.reviewed_at && (
                                    <div className="dpr-reviewed-date">
                                        Reviewed on{" "}
                                        {new Date(
                                            suggestion.reviewed_at
                                        ).toLocaleString()}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            <div className="dpr-disclaimer">
                <strong>Important:</strong> AI suggestions are only
                recommendations. Marking reports as similar does not merge,
                delete, or modify either original report.
            </div>
            </div>
        </section>
    );
}

export default DuplicateProblemReview;