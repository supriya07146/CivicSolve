import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    getAdminAssignments,
    getAdminProblems,
    getAdminOrganizations,
    createAdminAssignment,
} from "../../services/api";
import "../../styles/admin/AssignmentManagement.css";

/* ------------------------------------------------------------------ */
/*  Constants & small helpers                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
    ["", "All statuses"],
    ["assigned", "Assigned"],
    ["accepted", "Accepted"],
    ["in_progress", "In Progress"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
];

const CLOSED_PROBLEM = ["resolved", "rejected", "closed", "cancelled"];
const ASSIGNED_PROBLEM = ["assigned", "accepted", "in_progress"];

const TEAM_FILTERS = [
    ["all", "All verified teams"],
    ["expertise", "Matching expertise"],
    ["coverage", "Covers this area"],
    ["capacity", "Has available crews"],
];

const label = (value) =>
    String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const date = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "—";

const toInputDate = (value, fallbackDays = 7) => {
    const d = value ? new Date(value) : null;
    if (d && !isNaN(d)) return d.toISOString().slice(0, 10);
    const f = new Date();
    f.setDate(f.getDate() + fallbackDays);
    return f.toISOString().slice(0, 10);
};

const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const toList = (v) => {
    if (!v) return [];
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(v))
        return v
            .map((x) => (typeof x === "string" ? x : x?.name || x?.title || ""))
            .filter(Boolean);
    return [];
};

const same = (a, b) =>
    !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/* ------------------------------------------------------------------ */
/*  Normalizers — the ONLY place that knows your API field names.      */
/*  If your serializers use different keys, change them here.          */
/* ------------------------------------------------------------------ */

const normalizeProblem = (p) => {
    const cat = p.category_name || p.category?.name || (typeof p.category === "string" ? p.category : "");
    return {
        id: p.id,
        code: p.problem_code || p.reference || `CS-${p.id}`,
        title: p.title || `Problem #${p.id}`,
        category: cat,
        status: p.status,
        priority: p.priority || p.priority_level || "",
        location: p.location || p.address || "",
        area: p.ward || p.area || p.zone || "",
        reporter: p.reporter_name || p.reported_by_name || p.user_name || "",
        expected: p.expected_date || p.expected_completion || "",
    };
};

const normalizeTeam = (o) => ({
    id: o.id,
    name: o.organization_name || o.name || `Organization #${o.id}`,
    expertise: toList(o.expertise ?? o.categories ?? o.service_categories),
    areas: toList(o.coverage_areas ?? o.service_areas ?? o.wards),
    availableCrews: num(o.available_crews),
    activeIssues: num(o.active_issues ?? o.active_assignments),
    onTimeRate: num(o.on_time_rate),
    avgResolution: num(o.avg_resolution_days ?? o.avg_resolution),
    verified: o.is_verified ?? (o.status ? o.status === "approved" : true),
});

/* Rule-based ranking (expertise > coverage > capacity > track record).  */
/* Swap this for a score coming from your backend if you build one.      */
const scoreTeam = (team, problem) => {
    const expertise = team.expertise.some((e) => same(e, problem.category));
    const coverage = team.areas.some((a) => same(a, problem.area));
    const noCrew = team.availableCrews === 0;

    let score = 0;
    if (expertise) score += 40;
    if (coverage) score += 25;
    if (team.availableCrews !== null) score += Math.min(team.availableCrews, 3) * 5;
    if (team.onTimeRate !== null) score += team.onTimeRate / 10;
    if (team.activeIssues !== null) score -= Math.min(team.activeIssues, 10);
    if (noCrew) score -= 100;

    return { score, expertise, coverage, noCrew };
};

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

function Metric({ value, text, tone }) {
    return (
        <div className="am-metric">
            <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
            <span>{text}</span>
        </div>
    );
}

function TeamCard({ team, selected, suggested, onSelect }) {
    const { noCrew } = team.match;

    const crewTone = team.availableCrews === 0 ? "red" : team.availableCrews === 1 ? "amber" : "";
    const rateTone = team.onTimeRate !== null && team.onTimeRate < 80 ? "red" : team.onTimeRate !== null && team.onTimeRate >= 90 ? "green" : "";

    return (
        <article className={`am-team ${selected ? "is-selected" : ""} ${noCrew ? "is-risk" : ""}`}>
            <div className="am-team-top">
                <h3>{team.name}</h3>
                <div className="am-team-badges">
                    {suggested && <span className="am-badge am-badge-ai">✦ AI suggested match</span>}
                    {team.verified && <span className="am-badge am-badge-verified">● Platform verified</span>}
                </div>
            </div>

            <div className="am-team-body">
                <div>
                    <div className="am-chips">
                        {team.expertise.map((e) => (
                            <span key={e} className={`am-chip ${team.problemCategory && same(e, team.problemCategory) ? "chip-match" : ""}`}>
                                {e}
                            </span>
                        ))}
                        {team.areas.map((a) => (
                            <span key={a} className={`am-chip chip-area ${team.problemArea && same(a, team.problemArea) ? "chip-area-match" : ""}`}>
                                {a} {team.problemArea && same(a, team.problemArea) ? "✓" : ""}
                            </span>
                        ))}
                        {!team.expertise.length && !team.areas.length && (
                            <span className="am-chip">No expertise data</span>
                        )}
                    </div>

                    <div className="am-metrics">
                        <Metric value={team.availableCrews ?? "—"} text="Available crews" tone={crewTone} />
                        <Metric value={team.activeIssues ?? "—"} text="Active issues" />
                        <Metric value={team.onTimeRate !== null ? `${team.onTimeRate}%` : "—"} text="On-time rate" tone={rateTone} />
                        <Metric value={team.avgResolution !== null ? `${team.avgResolution}d` : "—"} text="Avg resolution" />
                    </div>
                </div>

                <button
                    type="button"
                    className={`am-select-btn ${selected ? "is-on" : ""}`}
                    disabled={noCrew}
                    onClick={onSelect}
                >
                    {selected ? "Selected ✓" : "Select team"}
                </button>
            </div>

            {noCrew && (
                <p className="am-risk">
                    <i /> No available crews — high workload risk
                </p>
            )}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function AssignmentManagement() {
    /* register */
    const [assignments, setAssignments] = useState([]);
    const [summary, setSummary] = useState({});
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    /* workspace */
    const [problems, setProblems] = useState([]);
    const [teams, setTeams] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [problemId, setProblemId] = useState("");
    const [orgId, setOrgId] = useState("");
    const [expected, setExpected] = useState("");
    const [notes, setNotes] = useState("");
    const [reviewed, setReviewed] = useState(false);
    const [reassignReason, setReassignReason] = useState("");
    const [teamFilter, setTeamFilter] = useState("all");
    const [filterOpen, setFilterOpen] = useState(false);

    /* feedback */
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    const pageRef = useRef(null);
    const confirmRef = useRef(null);
    const filterRef = useRef(null);

    /* ---------------- data loading ---------------- */

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminAssignments({
                status: statusFilter,
                search: search.trim(),
            });
            setAssignments(result.assignments || []);
            setSummary(result.summary || {});
        } catch (err) {
            setError(err.message || "Could not load assignments.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    const loadOptions = useCallback(async () => {
        setOptionsLoading(true);
        try {
            const [problemResult, organizationResult] = await Promise.all([
                getAdminProblems(),
                getAdminOrganizations({ status: "approved" }),
            ]);

            setProblems((problemResult.problems || problemResult.results || []).map(normalizeProblem));
            setTeams(
                (organizationResult.organizations || organizationResult.results || []).map(normalizeTeam)
            );
        } catch {
            /* the register still works if the workspace options fail */
        } finally {
            setOptionsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    /* ---------------- derived data ---------------- */

    const openProblems = useMemo(() => {
        const rank = (p) => (p.status === "verified" ? 0 : ASSIGNED_PROBLEM.includes(p.status) ? 2 : 1);
        return problems
            .filter((p) => !CLOSED_PROBLEM.includes(p.status))
            .sort((a, b) => rank(a) - rank(b));
    }, [problems]);

    const problem = useMemo(
        () => openProblems.find((p) => String(p.id) === String(problemId)) || null,
        [openProblems, problemId]
    );

    const isAssigned = !!problem && ASSIGNED_PROBLEM.includes(problem.status);

    const rankedTeams = useMemo(() => {
        if (!problem) return [];
        return teams
            .map((t) => ({
                ...t,
                problemCategory: problem.category,
                problemArea: problem.area,
                match: scoreTeam(t, problem),
            }))
            .sort((a, b) => b.match.score - a.match.score);
    }, [teams, problem]);

    const suggested = useMemo(() => {
        const top = rankedTeams[0];
        return top && !top.match.noCrew ? top : null;
    }, [rankedTeams]);

    const visibleTeams = useMemo(() => {
        return rankedTeams.filter((t) => {
            if (teamFilter === "expertise") return t.match.expertise;
            if (teamFilter === "coverage") return t.match.coverage;
            if (teamFilter === "capacity") return !t.match.noCrew;
            return true;
        });
    }, [rankedTeams, teamFilter]);

    const selectedTeam = rankedTeams.find((t) => String(t.id) === String(orgId)) || null;

    /* ---------------- effects ---------------- */

    /* default to the first problem awaiting assignment */
    useEffect(() => {
        if (!problemId && openProblems.length) {
            setProblemId(String(openProblems[0].id));
        }
    }, [openProblems, problemId]);

    /* when the problem (or ranking) changes, pre-select the suggested team */
    useEffect(() => {
        if (!problem) return;
        setOrgId(suggested ? String(suggested.id) : "");
        setExpected(toInputDate(problem.expected));
        setReviewed(false);
        setReassignReason("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem?.id, suggested?.id]);

    /* close the filter menu on outside click */
    useEffect(() => {
        const onDown = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    /* header's "+ New Assignment" button dispatches this event */
    useEffect(() => {
        const onNew = () => {
            setError("");
            setMessage("");
            setNotes("");
            setReviewed(false);
            setReassignReason("");
            const next = openProblems.find((p) => !ASSIGNED_PROBLEM.includes(p.status));
            if (next) setProblemId(String(next.id));
            pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        window.addEventListener("admin:new-assignment", onNew);
        return () => window.removeEventListener("admin:new-assignment", onNew);
    }, [openProblems]);

    /* ---------------- actions ---------------- */

    const payload = () => ({
        problem: Number(problem.id),
        organization: Number(orgId),
        notes: notes.trim(),
        expected_completion: expected || null,
    });

    const submitAssignment = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!problem || !orgId) return setError("Select a problem and a team first.");
        if (!reviewed) return setError("Please confirm you reviewed expertise, location and capacity.");

        setSaving(true);
        try {
            await createAdminAssignment(payload());
            setMessage(`${problem.code} assigned to ${selectedTeam?.name || "the selected team"}.`);
            setNotes("");
            setReviewed(false);
            await Promise.all([loadAssignments(), loadOptions()]);
        } catch (err) {
            setError(err.message || "Could not create assignment.");
        } finally {
            setSaving(false);
        }
    };

    const submitReassignment = async () => {
        setError("");
        setMessage("");

        if (!problem || !isAssigned) return;
        if (!orgId) return setError("Select the new team first.");
        if (!reassignReason.trim()) return setError("Please record why this problem is being reassigned.");

        setSaving(true);
        try {
            /* NOTE: backend must accept these two extra fields (see notes) */
            await createAdminAssignment({
                ...payload(),
                is_reassignment: true,
                reassignment_reason: reassignReason.trim(),
            });
            setMessage(`${problem.code} reassigned to ${selectedTeam?.name || "the selected team"}.`);
            setReassignReason("");
            await Promise.all([loadAssignments(), loadOptions()]);
        } catch (err) {
            setError(err.message || "Could not reassign this problem.");
        } finally {
            setSaving(false);
        }
    };

    const jumpToConfirm = () =>
        confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    /* ---------------- render helpers ---------------- */

    const stats = [
        ["Total", summary.total ?? 0],
        ["Assigned", summary.assigned ?? 0],
        ["Accepted", summary.accepted ?? 0],
        ["In progress", summary.in_progress ?? 0],
        ["Completed", summary.completed ?? 0],
        ["Cancelled", summary.cancelled ?? 0],
    ];

    const problemMeta = problem
        ? [
            problem.location,
            problem.area,
            problem.reporter && `Reported by ${problem.reporter}`,
        ].filter(Boolean).join(" · ")
        : "";

    const suggestionReason = suggested
        ? [
            suggested.match.expertise && `${problem.category} expertise`,
            suggested.match.coverage && `${problem.area} coverage`,
            suggested.availableCrews > 0 && "current capacity",
        ].filter(Boolean)
        : [];

    const reasonText =
        suggestionReason.length > 1
            ? `${suggestionReason.slice(0, -1).join(", ")} and ${suggestionReason.slice(-1)}`
            : suggestionReason[0] || "its overall availability";

    /* ---------------- render ---------------- */

    return (
        <div className="assignment-page" ref={pageRef}>

            {/* suggestion strip — full width, like the dashboard alert */}
            {problem && suggested && !isAssigned && (
                <div className="am-banner">
                    <div className="am-container am-banner-inner">
                        <span className="am-banner-icon">✓</span>
                        <p>
                            AI suggested match ready — {problem.code} · {suggested.name} is recommended for {problem.title}.{" "}
                            <button type="button" onClick={jumpToConfirm}>
                                Review the match and confirm assignment →
                            </button>
                        </p>
                    </div>
                </div>
            )}

            <div className="am-container">

            {message && <div className="am-success" role="status">{message}</div>}
            {error && <div className="am-error" role="alert">{error}</div>}

            {/* selected problem */}
            <section className="am-problem-card">
                {optionsLoading ? (
                    <p className="am-muted">Loading problems…</p>
                ) : !problem ? (
                    <p className="am-muted">No open problems are available to assign. Check that the problem API is available.</p>
                ) : (
                    <>
                        <div className="am-problem-main">
                            <div className="am-tags">
                                <span className="am-tag tag-code">
                                    {[problem.code, problem.category, problem.status === "verified" ? "Verified" : label(problem.status)]
                                        .filter(Boolean).join(" · ")}
                                </span>
                                <span className={`am-tag ${isAssigned ? "tag-done" : "tag-wait"}`}>
                                    {isAssigned ? "● Assigned" : "◔ Awaiting Assignment"}
                                </span>
                                {problem.priority && (
                                    <span className="am-tag tag-priority">{label(problem.priority)} Priority</span>
                                )}
                            </div>
                            <h2>{problem.title}</h2>
                            {problemMeta && <p className="am-problem-meta">{problemMeta}</p>}
                            <ul className="am-problem-facts">
                                {problem.status === "verified" && <li>Reviewer confirmed</li>}
                                <li>{isAssigned ? "Already assigned" : "Awaiting assignment"}</li>
                                {problem.expected && <li>Expected: {date(problem.expected)}</li>}
                            </ul>
                        </div>

                        <label className="am-problem-switch">
                            <span>Change problem</span>
                            <select value={problemId} onChange={(e) => setProblemId(e.target.value)}>
                                {openProblems.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.code} · {p.title} ({label(p.status)})
                                    </option>
                                ))}
                            </select>
                        </label>
                    </>
                )}
            </section>

            {/* smart matching note */}
            {problem && (
                <section className="am-smart">
                    <span className="am-smart-icon">✦</span>
                    <div>
                        <strong>Smart matching · AI suggestion, not assignment</strong>
                        <p>
                            {suggested
                                ? `${suggested.name} is suggested for ${reasonText}. The administrator makes the final decision.`
                                : "No team has available crews for this problem right now. Review the list and choose manually — the administrator makes the final decision."}
                        </p>
                    </div>
                </section>
            )}

            {/* workspace */}
            <div className="am-layout">

                <section className="am-teams">
                    <div className="am-teams-head">
                        <div>
                            <h2>Available teams</h2>
                            <p>
                                {visibleTeams.length} verified team{visibleTeams.length === 1 ? "" : "s"} matched to this problem
                            </p>
                        </div>

                        <div className="am-filter-wrap" ref={filterRef}>
                            <button type="button" className="am-filter-btn" onClick={() => setFilterOpen((o) => !o)}>
                                Filter teams ▾
                            </button>
                            {filterOpen && (
                                <div className="am-filter-menu">
                                    {TEAM_FILTERS.map(([value, text]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={teamFilter === value ? "on" : ""}
                                            onClick={() => { setTeamFilter(value); setFilterOpen(false); }}
                                        >
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {optionsLoading ? (
                        <div className="am-empty">Loading teams…</div>
                    ) : visibleTeams.length === 0 ? (
                        <div className="am-empty">
                            No teams match this filter. Check the organization API response and ensure an organization is approved.
                        </div>
                    ) : (
                        visibleTeams.map((team) => (
                            <TeamCard
                                key={team.id}
                                team={team}
                                selected={String(team.id) === String(orgId)}
                                suggested={suggested && suggested.id === team.id}
                                onSelect={() => setOrgId(String(team.id))}
                            />
                        ))
                    )}
                </section>

                <aside className="am-side">

                    {/* confirm */}
                    <form className="am-confirm" onSubmit={submitAssignment} ref={confirmRef}>
                        <h2><span className="am-confirm-icon">✓</span> Confirm assignment</h2>

                        <div className="am-field">
                            <label htmlFor="am-org">Selected organization *</label>
                            <select id="am-org" required value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                                <option value="">Select an organization</option>
                                {rankedTeams.map((t) => (
                                    <option key={t.id} value={t.id} disabled={t.match.noCrew}>
                                        {t.name}{t.match.noCrew ? " (no crews)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="am-field">
                            <label htmlFor="am-date">Expected completion *</label>
                            <input id="am-date" type="date" required value={expected}
                                onChange={(e) => setExpected(e.target.value)} />
                        </div>

                        <div className="am-field">
                            <label htmlFor="am-notes">Assignment notes</label>
                            <textarea id="am-notes" rows="3" value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Instructions or additional information for the organization..." />
                        </div>

                        <label className="am-check">
                            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
                            <span>I reviewed expertise, location and capacity.</span>
                        </label>

                        <button type="submit" className="am-assign-btn"
                            disabled={saving || !problem || !orgId || isAssigned}>
                            {saving ? "Assigning..." : "Assign problem →"}
                        </button>

                        <p className="am-foot">
                            {isAssigned
                                ? "This problem already has an assignment. Use reassignment below to change the team."
                                : problem
                                    ? `${problem.code} moves from ${label(problem.status)} to Assigned. The responsible member will be notified to accept.`
                                    : ""}
                        </p>
                    </form>

                    {/* reassignment */}
                    <div className="am-reassign">
                        <h2><span className="am-reassign-icon">↻</span> Reassignment controls</h2>
                        <p>For an existing assignment, select a new team and record why ownership is changing.</p>

                        <div className="am-reassign-box">
                            <label htmlFor="am-reason">Reassignment reason</label>
                            <textarea id="am-reason" rows="2" value={reassignReason}
                                onChange={(e) => setReassignReason(e.target.value)}
                                placeholder="Required only for reassignment" />
                        </div>

                        <button type="button" className="am-reassign-btn"
                            disabled={saving || !isAssigned}
                            onClick={submitReassignment}>
                            Reassign existing problem
                        </button>
                    </div>

                </aside>
            </div>

            {/* register */}
            <section className="am-register">
                <div className="am-register-head">
                    <div>
                        <h2>Assignment register</h2>
                        <p>Track which organizations are responsible for each problem.</p>
                    </div>
                    <button type="button" className="am-ghost-btn" onClick={loadAssignments} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                <div className="am-stats">
                    {stats.map(([title, value]) => (
                        <div className="am-stat-card" key={title}>
                            <span>{title}</span>
                            <strong>{value}</strong>
                        </div>
                    ))}
                </div>

                <div className="am-filters">
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search problem or organization..." aria-label="Search assignments" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter assignment status">
                        {STATUSES.map(([value, text]) => (
                            <option key={value} value={value}>{text}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="am-empty">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                    <div className="am-empty">No assignments found for these filters.</div>
                ) : (
                    <div className="am-table-wrap">
                        <table className="am-table">
                            <thead>
                                <tr>
                                    <th>Problem</th>
                                    <th>Organization</th>
                                    <th>Location</th>
                                    <th>Assigned date</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.problem_title || `Problem #${item.problem}`}</strong>
                                            <small>Reference: {item.problem_code || "—"}</small>
                                        </td>
                                        <td>
                                            <strong>{item.organization_name || `Organization #${item.organization}`}</strong>
                                            <small>{item.organization_email || ""}</small>
                                        </td>
                                        <td>{item.problem_location || "—"}</td>
                                        <td>{date(item.assigned_at)}</td>
                                        <td>
                                            <span className={`am-status am-status-${item.status}`}>
                                                {item.status_display || label(item.status)}
                                            </span>
                                        </td>
                                        <td className="am-notes-cell">{item.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            </div>{/* /am-container */}
        </div>
    );
}

export default AssignmentManagement;