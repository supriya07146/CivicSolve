import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAdminCitizens } from "../../services/api";

import "../../styles/admin/UserManagement.css";


const PAGE_SIZE = 10;


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

/* the API returns { citizens, count, total_pages }; also accept DRF-style { results } */
function normalise(res, pageSize) {
    const rows = res.citizens || res.results || [];
    const count = res.count ?? rows.length;
    const pages = res.total_pages || Math.max(1, Math.ceil(count / pageSize));
    return { rows, count, pages };
}

function getInitials(name) {
    if (!name) return "C";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("");
}

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function accountState(c) {
    if (!c.email_verified) {
        return { key: "pending", label: "Verification pending", icon: "◔" };
    }
    if (!c.is_active) {
        return { key: "restricted", label: "Restricted · Review", icon: "✕" };
    }
    return { key: "active", label: "Active · Email verified", icon: "✓" };
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


/* ---------- small pieces ---------- */

function StatCard({ label, value, note, tone, delay }) {
    const shown = useCountUp(value);

    return (
        <div className={`um-stat um-stat-${tone}`} style={{ "--d": delay }}>
            <span className="um-stat-label">{label}</span>
            <strong className="um-stat-value">{shown.toLocaleString("en-IN")}</strong>
            <span className="um-stat-note"><i />{note}</span>
        </div>
    );
}

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
    </svg>
);

const InfoIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
    </svg>
);


/* =========================================================
   PAGE
   ========================================================= */

function UserManagement() {

    const navigate = useNavigate();

    /* list */
    const [citizens, setCitizens] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    /* filters */
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [verifiedFilter, setVerifiedFilter] = useState("");
    const [ordering, setOrdering] = useState("-created_at");
    const [page, setPage] = useState(1);

    /* whole-platform counts for the stat cards */
    const [summary, setSummary] = useState({ active: 0, inactive: 0 });

    const [toast, setToast] = useState(null);
    const requestId = useRef(0);


    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3200);
    };


    /* ----- stat cards: real totals (not just the current page) ----- */
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [active, inactive] = await Promise.all([
                    getAdminCitizens({ status: "active", page_size: 1 }),
                    getAdminCitizens({ status: "inactive", page_size: 1 }),
                ]);

                if (!cancelled) {
                    setSummary({
                        active: active.count ?? 0,
                        inactive: inactive.count ?? 0,
                    });
                }
            } catch {
                /* the list below shows any connection / auth error */
            }
        })();

        return () => { cancelled = true; };
    }, [reloadKey]);


    /* ----- debounce the search box ----- */
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 350);

        return () => clearTimeout(t);
    }, [search]);


    /* ----- load the table ----- */
    useEffect(() => {
        const id = ++requestId.current;

        setLoading(true);
        setError("");

        getAdminCitizens({
            search: debouncedSearch,
            status: statusFilter,
            email_verified: verifiedFilter,
            ordering,
            page,
            page_size: PAGE_SIZE,
        })
            .then((res) => {
                if (id !== requestId.current) return;

                const n = normalise(res, PAGE_SIZE);
                setCitizens(n.rows);
                setTotalCount(n.count);
                setTotalPages(n.pages);
            })
            .catch((err) => {
                if (id !== requestId.current) return;
                setError(err.message || "Unable to load citizens.");
            })
            .finally(() => {
                if (id === requestId.current) setLoading(false);
            });

    }, [debouncedSearch, statusFilter, verifiedFilter, ordering, page, reloadKey]);


    /* ----- export (triggered by the header's "Export user directory" button) ----- */
    const exportDirectory = async () => {
        try {
            showToast("success", "Preparing export...");

            const rows = [];
            let p = 1;
            let pages = 1;

            do {
                const res = await getAdminCitizens({
                    search: debouncedSearch,
                    status: statusFilter,
                    email_verified: verifiedFilter,
                    ordering,
                    page: p,
                    page_size: 100,
                });
                const n = normalise(res, 100);
                rows.push(...n.rows);
                pages = n.pages;
                p += 1;
            } while (p <= pages && p <= 50);

            const header = ["ID", "Name", "Email", "Phone", "Location",
                "Account status", "Email verified", "Registered"];

            const lines = [header.map(csvCell).join(",")].concat(
                rows.map((c) => [
                    c.id, c.full_name, c.email, c.phone, c.location,
                    accountState(c).label,
                    c.email_verified ? "Yes" : "No",
                    c.created_at,
                ].map(csvCell).join(","))
            );

            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `civicsolve-users-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            showToast("success", `Exported ${rows.length} accounts.`);

        } catch (err) {
            showToast("error", err.message || "Export failed.");
        }
    };

    const exportRef = useRef(exportDirectory);
    exportRef.current = exportDirectory;

    useEffect(() => {
        const handler = () => exportRef.current();
        window.addEventListener("admin:export-users", handler);
        return () => window.removeEventListener("admin:export-users", handler);
    }, []);


    /* ----- handlers ----- */
    const changeFilter = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("");
        setVerifiedFilter("");
        setOrdering("-created_at");
        setPage(1);
    };

    const goToProfile = (id) => navigate(`/admin/users/${id}`);

    const hasFilters = Boolean(search || statusFilter || verifiedFilter);


    /* ----- derived ----- */
    const total = summary.active + summary.inactive;
    const activePct = total ? Math.round((summary.active / total) * 100) : 0;

    const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, totalCount);


    return (
        <div className="um-page">

            <div className="um-container">

                {/* ===== stat cards ===== */}
                <section className="um-stat-grid">
                    <StatCard tone="teal" label="COMMUNITY ACCOUNTS" value={total}
                        note="Registered citizens" delay="0s" />
                    <StatCard tone="amber" label="ACTIVE ACCOUNTS" value={summary.active}
                        note={`${activePct}% of registered members`} delay="0.08s" />
                    <StatCard tone="solid" label="ACCOUNTS NEEDING REVIEW" value={summary.inactive}
                        note="Inactive or unverified accounts" delay="0.16s" />
                </section>


                {/* ===== filters ===== */}
                <section className="um-card um-filter-card" style={{ "--d": "0.2s" }}>

                    <label className="um-search">
                        <SearchIcon />
                        <input
                            type="text"
                            placeholder="Search name, email, phone or location"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search citizens"
                        />
                    </label>

                    <select value={verifiedFilter} onChange={changeFilter(setVerifiedFilter)}
                        aria-label="Filter by verification">
                        <option value="">All verification</option>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                    </select>

                    <select value={statusFilter} onChange={changeFilter(setStatusFilter)}
                        aria-label="Filter by account state">
                        <option value="">All account states</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <select value={ordering} onChange={changeFilter(setOrdering)}
                        aria-label="Sort order">
                        <option value="-created_at">Newest first</option>
                        <option value="created_at">Oldest first</option>
                    </select>

                    {hasFilters && (
                        <button type="button" className="um-clear" onClick={clearFilters}>
                            Clear
                        </button>
                    )}

                </section>


                {/* ===== user directory ===== */}
                <section className="um-card um-directory" style={{ "--d": "0.28s" }}>

                    <div className="um-card-head">
                        <div>
                            <h2>User directory</h2>
                            <p>
                                {loading
                                    ? "Loading accounts..."
                                    : `Showing ${from}–${to} of ${totalCount.toLocaleString("en-IN")} registered accounts`}
                            </p>
                        </div>

                        <button type="button" className="um-outline-btn" onClick={clearFilters}>
                            View all →
                        </button>
                    </div>


                    <div className="um-table-wrap">

                        {loading ? (

                            <div className="um-state">
                                <div className="um-loader" />
                                <p>Loading citizen registry...</p>
                            </div>

                        ) : error ? (

                            <div className="um-state um-state-error">
                                <div className="um-state-icon">!</div>
                                <strong>Unable to load registry</strong>
                                <p>{error}</p>
                                <button type="button" className="um-retry"
                                    onClick={() => setReloadKey((k) => k + 1)}>
                                    Try again
                                </button>
                            </div>

                        ) : citizens.length === 0 ? (

                            <div className="um-state">
                                <div className="um-state-icon">C</div>
                                <strong>No citizens found</strong>
                                <p>No citizen records match the current search or filters.</p>
                            </div>

                        ) : (

                            <table className="um-table">

                                <thead>
                                    <tr>
                                        <th>NAME / CONTACT</th>
                                        <th>ROLE</th>
                                        <th>ACCOUNT STATUS</th>
                                        <th>JOINED</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {citizens.map((c) => {
                                        const state = accountState(c);

                                        return (
                                            <tr key={c.id}>

                                                <td className="um-td-name">
                                                    <div className="um-person">
                                                        <span className="um-avatar">{getInitials(c.full_name)}</span>
                                                        <div>
                                                            <strong>{c.full_name || "Unnamed citizen"}</strong>
                                                            <small>{c.email}</small>
                                                            {c.phone && <small>{c.phone}</small>}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td data-label="Role">
                                                    <span className="um-pill um-pill-teal">Community User</span>
                                                </td>

                                                <td data-label="Account status">
                                                    <span className={`um-pill um-state-${state.key}`}>
                                                        <b>{state.icon}</b> {state.label}
                                                    </span>
                                                </td>

                                                <td data-label="Joined">
                                                    <span className="um-date">{formatDate(c.created_at)}</span>
                                                </td>

                                                <td data-label="Actions">
                                                    <div className="um-actions">
                                                        <button type="button" className="um-link"
                                                            onClick={() => goToProfile(c.id)}>
                                                            View
                                                        </button>

                                                        {state.key === "restricted" ? (
                                                            <button type="button" className="um-link um-link-danger"
                                                                onClick={() => goToProfile(c.id)}>
                                                                Review restriction →
                                                            </button>
                                                        ) : (
                                                            <button type="button" className="um-link"
                                                                onClick={() => goToProfile(c.id)}>
                                                                Manage →
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>

                            </table>

                        )}

                    </div>


                    {!loading && !error && citizens.length > 0 && (

                        <div className="um-pagination">

                            <span>
                                Showing {from}–{to} of {totalCount.toLocaleString("en-IN")} records
                            </span>

                            <nav aria-label="Pagination">

                                <button type="button" className="um-page-btn"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                                    ← Previous
                                </button>

                                {pageWindow(page, totalPages).map((p) =>
                                    typeof p === "string" ? (
                                        <span key={p} className="um-gap">…</span>
                                    ) : (
                                        <button key={p} type="button"
                                            className={`um-page-num ${p === page ? "active" : ""}`}
                                            aria-current={p === page ? "page" : undefined}
                                            onClick={() => setPage(p)}>
                                            {p}
                                        </button>
                                    )
                                )}

                                <button type="button" className="um-page-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>
                                    Next →
                                </button>

                            </nav>

                        </div>

                    )}

                </section>


                {/* ===== bottom info cards ===== */}
                <section className="um-bottom-grid">

                    <div className="um-note" style={{ "--d": "0.36s" }}>
                        <span className="um-note-icon"><InfoIcon /></span>
                        <div>
                            <h3>Account actions are recorded</h3>
                            <p>
                                Restrictions require a reason and review. Role changes, account
                                restoration and sensitive-data access are recorded in the audit history.
                            </p>
                        </div>
                    </div>

                    <div className="um-activity" style={{ "--d": "0.44s" }}>
                        <span className="um-activity-eyebrow"><i />ADMIN ACTIVITY</span>
                        <h3>
                            {summary.inactive} account{summary.inactive === 1 ? "" : "s"} need review
                            {" · "}
                            {summary.active.toLocaleString("en-IN")} active
                        </h3>
                        <p>All account actions are logged in the audit trail for accountability.</p>
                        <div className="um-chips">
                            <span className="um-chip um-chip-teal">🔒 Secure access</span>
                            <span className="um-chip um-chip-amber">⚡ Audit logging on</span>
                        </div>
                    </div>

                </section>

            </div>


            {toast && (
                <div className={`um-toast um-toast-${toast.type}`} role="status">
                    {toast.text}
                </div>
            )}

        </div>
    );
}

export default UserManagement;