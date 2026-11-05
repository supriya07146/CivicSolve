import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminOrganizations,
    getAdminOrganization,
    approveAdminOrganization,
    rejectAdminOrganization,
    suspendAdminOrganization,
} from "../../services/api";

import "../../styles/admin/OrganizationManagement.css";


const PAGE_SIZE = 10;

/* where the header's "+ Add Organization" button should go */
const ADD_ORGANIZATION_ROUTE = "/admin/organizations/new";

const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, suspended: 0, rejected: 0 };

const STATUS_META = {
    pending_verification: { key: "pending", label: "Pending", icon: "◔" },
    approved: { key: "approved", label: "Approved", icon: "✓" },
    suspended: { key: "suspended", label: "Suspended", icon: "!" },
    rejected: { key: "rejected", label: "Rejected", icon: "✕" },
};

const CHECKLIST = [
    "Identity and registration details match the application.",
    "Member authorization and service scope are confirmed.",
];


/* ---------- helpers ---------- */

const statusMeta = (status) =>
    STATUS_META[status] || { key: "rejected", label: status || "Unknown", icon: "?" };

const orgType = (o) => o.organization_type_display || o.organization_type || "—";

function formatDate(date) {
    if (!date) return "—";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fileName(url) {
    if (!url) return "Document";
    const clean = url.split("?")[0];
    try {
        return decodeURIComponent(clean.substring(clean.lastIndexOf("/") + 1)) || "Document";
    } catch {
        return "Document";
    }
}

function extension(url) {
    if (!url) return "";
    const clean = url.split("?")[0].toLowerCase();
    return clean.substring(clean.lastIndexOf(".") + 1);
}

/* supports an optional `documents` array, falls back to the single document_url */
function getDocuments(org) {
    if (!org) return [];

    if (Array.isArray(org.documents) && org.documents.length) {
        return org.documents.map((d, i) => ({
            id: d.id ?? i,
            name: d.name || fileName(d.url || d.document_url),
            url: d.url || d.document_url,
            uploaded: d.uploaded_at || d.created_at,
        }));
    }

    if (org.document_url) {
        return [{
            id: "primary",
            name: fileName(org.document_url),
            url: org.document_url,
            uploaded: org.document_uploaded_at || org.created_at,
        }];
    }

    return [];
}

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

function StatCard({ label, value, note, tone, delay, active, onClick }) {
    const shown = useCountUp(value);

    return (
        <button
            type="button"
            className={`om-stat om-stat-${tone} ${active ? "is-active" : ""}`}
            style={{ "--d": delay }}
            onClick={onClick}
            aria-pressed={active}
        >
            <span className="om-stat-label">{label}</span>
            <strong className="om-stat-value">{shown.toLocaleString("en-IN")}</strong>
            <span className="om-stat-note"><i />{note}</span>
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

const FileIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
        <path d="M14 3v5h5" />
    </svg>
);


/* =========================================================
   PAGE
   ========================================================= */

function OrganizationManagement() {

    const navigate = useNavigate();

    /* list */
    const [organizations, setOrganizations] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    /* filters */
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [page, setPage] = useState(1);

    /* review */
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [checks, setChecks] = useState([false, false]);
    const [notes, setNotes] = useState("");
    const [previewId, setPreviewId] = useState(null);
    const [showSuspend, setShowSuspend] = useState(false);

    const [toast, setToast] = useState(null);
    const requestId = useRef(0);
    const reviewRef = useRef(null);

    const adminName = (() => {
        try {
            return JSON.parse(localStorage.getItem("admin") || "{}").full_name || "Administrator";
        } catch {
            return "Administrator";
        }
    })();


    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3200);
    };


    /* ----- debounce search ----- */
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);


    /* ----- load list ----- */
    useEffect(() => {
        const id = ++requestId.current;

        setLoading(true);
        setError("");

        getAdminOrganizations({ status: statusFilter, search: debouncedSearch })
            .then((res) => {
                if (id !== requestId.current) return;
                setOrganizations(res.organizations || []);
                setSummary(res.summary || EMPTY_SUMMARY);
            })
            .catch((err) => {
                if (id !== requestId.current) return;
                setError(err.message || "Unable to load organizations.");
            })
            .finally(() => {
                if (id === requestId.current) setLoading(false);
            });

    }, [statusFilter, debouncedSearch, reloadKey]);


    /* ----- header button: "+ Add Organization" ----- */
    useEffect(() => {
        const handler = () => navigate(ADD_ORGANIZATION_ROUTE);
        window.addEventListener("admin:add-organization", handler);
        return () => window.removeEventListener("admin:add-organization", handler);
    }, [navigate]);


    /* ----- derived ----- */
    const categoryOptions = useMemo(() => {
        const set = new Set();
        organizations.forEach((o) => (o.categories || []).forEach((c) => set.add(c)));
        return [...set].sort();
    }, [organizations]);

    const filtered = useMemo(
        () => categoryFilter
            ? organizations.filter((o) => (o.categories || []).includes(categoryFilter))
            : organizations,
        [organizations, categoryFilter]
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const to = Math.min(safePage * PAGE_SIZE, filtered.length);

    const pending = useMemo(
        () => organizations.filter((o) => o.status === "pending_verification"),
        [organizations]
    );

    const documents = getDocuments(selected);
    const allChecked = checks.every(Boolean);
    const hasFilters = Boolean(search || statusFilter || categoryFilter);


    /* ----- handlers ----- */
    const changeFilter = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("");
        setCategoryFilter("");
        setPage(1);
    };

    const resetReview = () => {
        setChecks([false, false]);
        setNotes("");
        setPreviewId(null);
    };

    const selectOrganization = useCallback(async (org) => {
        try {
            setDetailLoading(true);
            resetReview();

            const res = await getAdminOrganization(org.id);
            setSelected(res.organization);

            setTimeout(() => {
                reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 60);

        } catch (err) {
            showToast("error", err.message || "Unable to load organization details.");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const runAction = async (action, successText, failText) => {
        if (!selected) return;

        try {
            setActionLoading(true);
            await action();
            showToast("success", successText);
            setSelected(null);
            resetReview();
            setReloadKey((k) => k + 1);
        } catch (err) {
            showToast("error", err.message || failText);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = () => {
        if (!allChecked) {
            showToast("error", "Confirm both verification checks before approving.");
            return;
        }
        runAction(
            () => approveAdminOrganization(selected.id),
            "Organization approved.",
            "Unable to approve organization."
        );
    };

    const handleReject = () => {
        if (!notes.trim()) {
            showToast("error", "Add a rejection reason in the reviewer notes.");
            return;
        }
        /* notes go as a 2nd argument; ignored until the API accepts a reason */
        runAction(
            () => rejectAdminOrganization(selected.id, notes.trim()),
            "Organization rejected.",
            "Unable to reject organization."
        );
    };

    const handleSuspend = () => {
        setShowSuspend(false);
        runAction(
            () => suspendAdminOrganization(selected.id),
            "Organization suspended.",
            "Unable to suspend organization."
        );
    };

    const exportDirectory = () => {
        const header = ["ID", "Organization", "Email", "Type", "Categories", "Service area", "Status"];
        const lines = [header.map(csvCell).join(",")].concat(
            filtered.map((o) => [
                o.id, o.organization_name, o.email, orgType(o),
                (o.categories || []).join("; "), o.service_area, statusMeta(o.status).label,
            ].map(csvCell).join(","))
        );

        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `civicsolve-organizations-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast("success", `Exported ${filtered.length} organizations.`);
    };

    const renderPreview = (doc) => {
        const ext = extension(doc.url);
        if (["jpg", "jpeg", "png"].includes(ext)) return <img src={doc.url} alt={doc.name} />;
        if (ext === "pdf") return <iframe src={doc.url} title={doc.name} />;
        return <p>Preview is not available for this file type.</p>;
    };

    const statCards = [
        { value: "", tone: "teal", label: "ALL ORGANIZATIONS", count: summary.total, note: "Registered organizations" },
        { value: "pending_verification", tone: "amber", label: "PENDING REVIEW", count: summary.pending, note: "Awaiting human approval" },
        { value: "approved", tone: "solid", label: "APPROVED", count: summary.approved, note: "Verified service teams" },
        { value: "rejected", tone: "red", label: "REJECTED", count: summary.rejected, note: "Did not pass verification" },
    ];


    return (
        <div className="om-page">

            <div className="om-container">

                {/* ===== stat cards ===== */}
                <section className="om-stat-grid" aria-label="Filter by verification state">
                    {statCards.map((c, i) => (
                        <StatCard
                            key={c.label}
                            tone={c.tone}
                            label={c.label}
                            value={c.count}
                            note={c.note}
                            delay={`${i * 0.08}s`}
                            active={statusFilter === c.value && c.value !== ""}
                            onClick={() => { setStatusFilter(c.value); setPage(1); }}
                        />
                    ))}
                </section>


                {/* ===== filters ===== */}
                <section className="om-card om-filter-card" style={{ "--d": "0.05s" }}>

                    <label className="om-search">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search organization or contact"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search organizations"
                        />
                    </label>

                    <select value={categoryFilter} onChange={changeFilter(setCategoryFilter)}
                        aria-label="Filter by category">
                        <option value="">All categories</option>
                        {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select value={statusFilter} onChange={changeFilter(setStatusFilter)}
                        aria-label="Filter by verification state">
                        <option value="">All verification states</option>
                        <option value="pending_verification">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                    </select>

                    {hasFilters && (
                        <button type="button" className="om-clear" onClick={clearFilters}>Clear</button>
                    )}

                </section>


                {/* ===== organization directory ===== */}
                <section className="om-card om-directory" style={{ "--d": "0.12s" }}>

                    <div className="om-card-head">
                        <div>
                            <h2>Organization directory</h2>
                            <p>
                                {loading
                                    ? "Loading organizations..."
                                    : `${summary.total.toLocaleString("en-IN")} registered organizations across all areas`}
                            </p>
                        </div>

                        <button type="button" className="om-outline-btn" onClick={exportDirectory}
                            disabled={loading || filtered.length === 0}>
                            Export list →
                        </button>
                    </div>


                    <div className="om-table-wrap">

                        {loading ? (

                            <div className="om-state">
                                <div className="om-loader" />
                                <p>Loading organization registry...</p>
                            </div>

                        ) : error ? (

                            <div className="om-state om-state-error">
                                <div className="om-state-icon">!</div>
                                <strong>Unable to load organizations</strong>
                                <p>{error}</p>
                                <button type="button" className="om-retry"
                                    onClick={() => setReloadKey((k) => k + 1)}>
                                    Try again
                                </button>
                            </div>

                        ) : rows.length === 0 ? (

                            <div className="om-state">
                                <div className="om-state-icon">O</div>
                                <strong>No organizations found</strong>
                                <p>No organizations match the current search or filters.</p>
                            </div>

                        ) : (

                            <table className="om-table">

                                <thead>
                                    <tr>
                                        <th>ORGANIZATION / CONTACT</th>
                                        <th>EXPERTISE</th>
                                        <th>SERVICE AREA</th>
                                        <th>VERIFICATION</th>
                                        <th>MANAGE</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map((o) => {
                                        const st = statusMeta(o.status);
                                        const isPending = st.key === "pending";

                                        return (
                                            <tr
                                                key={o.id}
                                                className={[
                                                    isPending ? "is-pending" : "",
                                                    selected?.id === o.id ? "is-selected" : "",
                                                ].join(" ")}
                                                onClick={() => selectOrganization(o)}
                                            >

                                                <td className="om-td-name">
                                                    <strong>
                                                        {o.organization_name}
                                                        {o.contact_name ? ` · ${o.contact_name}` : ""}
                                                    </strong>
                                                    <small>
                                                        {(o.categories || []).join(" · ") || o.email || "—"}
                                                    </small>
                                                </td>

                                                <td data-label="Expertise">{orgType(o)}</td>

                                                <td data-label="Service area">{o.service_area || "—"}</td>

                                                <td data-label="Verification">
                                                    <span className={`om-pill om-state-${st.key}`}>
                                                        <b>{st.icon}</b> {st.label}
                                                    </span>
                                                </td>

                                                <td data-label="Manage">
                                                    <button type="button" className="om-link"
                                                        onClick={(e) => { e.stopPropagation(); selectOrganization(o); }}>
                                                        {isPending ? "Review documents →" : "View & manage →"}
                                                    </button>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>

                        )}

                    </div>


                    {!loading && !error && rows.length > 0 && (
                        <div className="om-pagination">

                            <span>
                                Showing {from}–{to} of {filtered.length.toLocaleString("en-IN")} records
                            </span>

                            <nav aria-label="Pagination">

                                <button type="button" className="om-page-btn"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(safePage - 1)}>
                                    ← Previous
                                </button>

                                {pageWindow(safePage, totalPages).map((p) =>
                                    typeof p === "string" ? (
                                        <span key={p} className="om-gap">…</span>
                                    ) : (
                                        <button key={p} type="button"
                                            className={`om-page-num ${p === safePage ? "active" : ""}`}
                                            aria-current={p === safePage ? "page" : undefined}
                                            onClick={() => setPage(p)}>
                                            {p}
                                        </button>
                                    )
                                )}

                                <button type="button" className="om-page-btn"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(safePage + 1)}>
                                    Next →
                                </button>

                            </nav>

                        </div>
                    )}

                </section>


                {/* ===== review + sidebar ===== */}
                <div className="om-lower">

                    <div className="om-lower-main">

                        <section className="om-card om-review" ref={reviewRef} style={{ "--d": "0.2s" }}>

                            {detailLoading ? (

                                <div className="om-state">
                                    <div className="om-loader" />
                                    <p>Loading application...</p>
                                </div>

                            ) : !selected ? (

                                <div className="om-state">
                                    <div className="om-state-icon"><FileIcon /></div>
                                    <strong>Application review</strong>
                                    <p>
                                        Select an organization from the directory to review its
                                        documents and registration details.
                                    </p>
                                </div>

                            ) : (

                                <>
                                    <div className="om-card-head">
                                        <div>
                                            <h2>Application review</h2>
                                            <p>{selected.organization_name}</p>
                                        </div>

                                        <div className="om-head-right">
                                            <span className={`om-pill om-state-${statusMeta(selected.status).key}`}>
                                                <b>{statusMeta(selected.status).icon}</b>{" "}
                                                {selected.status === "pending_verification"
                                                    ? "Pending verification"
                                                    : statusMeta(selected.status).label}
                                            </span>
                                            <button type="button" className="om-close" aria-label="Close review"
                                                onClick={() => { setSelected(null); resetReview(); }}>
                                                ×
                                            </button>
                                        </div>
                                    </div>


                                    <div className="om-member">
                                        <strong>
                                            Responsible member: {selected.contact_name || selected.organization_name}
                                        </strong>
                                        <span>
                                            Contact: {selected.email || "—"}
                                            {selected.phone ? ` · ${selected.phone}` : ""}
                                        </span>
                                    </div>


                                    <div className="om-docs">

                                        <div className="om-docs-head">
                                            <span>VERIFICATION DOCUMENT</span>
                                            <span>UPLOADED</span>
                                            <span>REVIEW</span>
                                        </div>

                                        {documents.length === 0 ? (
                                            <p className="om-docs-empty">
                                                This organization did not provide a verification document.
                                            </p>
                                        ) : documents.map((doc) => (
                                            <div key={doc.id} className="om-doc">

                                                <div className="om-doc-row">
                                                    <span className="om-doc-name">
                                                        <i><FileIcon /></i>{doc.name}
                                                    </span>
                                                    <span className="om-doc-date">{formatDate(doc.uploaded)}</span>
                                                    <span className="om-doc-links">
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                            Open document →
                                                        </a>
                                                        <button type="button" className="om-link"
                                                            onClick={() => setPreviewId(previewId === doc.id ? null : doc.id)}>
                                                            {previewId === doc.id ? "Hide preview" : "Preview"}
                                                        </button>
                                                    </span>
                                                </div>

                                                {previewId === doc.id && (
                                                    <div className="om-preview">{renderPreview(doc)}</div>
                                                )}

                                            </div>
                                        ))}

                                    </div>


                                    <dl className="om-details">
                                        <div><dt>Expertise</dt><dd>{orgType(selected)}</dd></div>
                                        <div>
                                            <dt>City / state</dt>
                                            <dd>{[selected.city, selected.state].filter(Boolean).join(", ") || "—"}</dd>
                                        </div>
                                        <div><dt>Service area</dt><dd>{selected.service_area || "—"}</dd></div>
                                        <div><dt>Address</dt><dd>{selected.address || "—"}</dd></div>
                                        <div className="om-details-wide">
                                            <dt>Categories handled</dt>
                                            <dd>
                                                {(selected.categories || []).length
                                                    ? selected.categories.map((c) => (
                                                        <span key={c} className="om-tag">{c}</span>
                                                    ))
                                                    : "No categories provided"}
                                            </dd>
                                        </div>
                                        <div className="om-details-wide">
                                            <dt>Description</dt>
                                            <dd>{selected.description || "No description provided."}</dd>
                                        </div>
                                    </dl>


                                    <div className="om-checks">
                                        {CHECKLIST.map((text, i) => (
                                            <label key={text} className={`om-check ${checks[i] ? "checked" : ""}`}>
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


                                    <label className="om-notes">
                                        <span>REVIEWER NOTES / REJECTION REASON</span>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add notes for the record. Required when rejecting."
                                        />
                                    </label>


                                    <div className="om-actions">

                                        {selected.status !== "approved" && (
                                            <button type="button" className="om-btn om-btn-primary"
                                                onClick={handleApprove}
                                                disabled={actionLoading || !allChecked}
                                                title={allChecked ? "" : "Complete both checks to approve"}>
                                                {actionLoading ? "Processing..." : "Approve organization"}
                                            </button>
                                        )}

                                        {selected.status !== "rejected" && (
                                            <button type="button" className="om-btn om-btn-outline"
                                                onClick={handleReject} disabled={actionLoading}>
                                                Reject with reason
                                            </button>
                                        )}

                                        {selected.status !== "suspended" && selected.status !== "rejected" && (
                                            <button type="button" className="om-btn om-btn-warn"
                                                onClick={() => setShowSuspend(true)} disabled={actionLoading}>
                                                Suspend
                                            </button>
                                        )}

                                    </div>
                                </>

                            )}

                        </section>


                        <section className="om-insight" style={{ "--d": "0.3s" }}>
                            <span className="om-insight-eyebrow"><i />REVIEWER INSIGHT</span>
                            <h3>
                                {summary.pending} pending application{summary.pending === 1 ? "" : "s"} require
                                {summary.pending === 1 ? "s" : ""} attention this week.
                            </h3>
                            <p>Timely review helps community teams respond to reported problems faster.</p>
                            <div className="om-chips">
                                <span className="om-chip om-chip-teal">{summary.pending} Pending</span>
                                <span className="om-chip om-chip-amber">{summary.suspended} Suspended</span>
                            </div>
                        </section>

                    </div>


                    <aside className="om-side">

                        <section className="om-card om-side-card" style={{ "--d": "0.24s" }}>
                            <div className="om-side-head">
                                <h2>Verification standard</h2>
                                <span className="om-badge om-badge-amber">!</span>
                            </div>
                            <div className="om-callout">
                                <strong>Human approval required</strong>
                                <p>Documents must be reviewed before responsibility can be accepted.</p>
                            </div>
                            <p className="om-muted">
                                Approval enables assignments in the registered categories and locations.
                                The platform badge does not represent government accreditation.
                            </p>
                            <p className="om-reviewer">
                                Reviewer: {adminName} · All decisions are recorded.
                            </p>
                        </section>


                        <section className="om-card om-side-card" style={{ "--d": "0.3s" }}>
                            <div className="om-side-head">
                                <h2>Notifications</h2>
                                <span className="om-badge om-badge-teal">{pending.length}</span>
                            </div>

                            {pending.length === 0 ? (
                                <p className="om-muted om-muted-flush">No applications are waiting for review.</p>
                            ) : pending.slice(0, 3).map((o, i) => (
                                <div key={o.id} className={`om-notice ${i === 0 ? "new" : ""}`}>
                                    <div className="om-notice-top">
                                        <strong><i />New application received</strong>
                                        <button type="button" className="om-link" onClick={() => selectOrganization(o)}>
                                            View →
                                        </button>
                                    </div>
                                    <p>{o.organization_name} · Awaiting review.</p>
                                </div>
                            ))}
                        </section>


                        <section className="om-card om-side-card" style={{ "--d": "0.36s" }}>
                            <h2>Quick Actions</h2>
                            <div className="om-quick">
                                <button type="button" onClick={() => navigate(ADD_ORGANIZATION_ROUTE)}>
                                    <span className="om-quick-icon">+</span>Add new organization
                                </button>
                                <button type="button"
                                    onClick={() => { setStatusFilter("pending_verification"); setPage(1); }}>
                                    <span className="om-quick-icon dark">✓</span>Review pending applications
                                </button>
                                <button type="button" onClick={clearFilters}>
                                    <span className="om-quick-icon light">⌖</span>Browse service areas
                                </button>
                            </div>
                        </section>

                    </aside>

                </div>

            </div>


            {showSuspend && (
                <div className="om-overlay" role="dialog" aria-modal="true">
                    <div className="om-modal">
                        <h2>Suspend organization?</h2>
                        <p>
                            <strong>{selected?.organization_name}</strong> will be temporarily prevented
                            from operating on CivicSolve. You can approve it again later.
                        </p>
                        <div className="om-modal-actions">
                            <button type="button" className="om-btn om-btn-outline"
                                onClick={() => setShowSuspend(false)}>
                                Cancel
                            </button>
                            <button type="button" className="om-btn om-btn-danger"
                                onClick={handleSuspend} disabled={actionLoading}>
                                Suspend organization
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`om-toast om-toast-${toast.type}`} role="status">{toast.text}</div>
            )}

        </div>
    );
}

export default OrganizationManagement;