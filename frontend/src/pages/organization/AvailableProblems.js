import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Link } from "react-router-dom";
import "../../styles/organization/AvailableProblems.css";

/* ------------------------------------------------------------------ */
/*  Config – adjust these to match your router / API                   */
/* ------------------------------------------------------------------ */
const DASHBOARD_API = "http://127.0.0.1:8000/api/organization/dashboard/";
const PROFILE_ROUTE = "/organization/profile";
const DASHBOARD_ROUTE = "/organization/dashboard";
const PAGE_SIZE = 3;

const FALLBACK_REASON =
    "Matches your registered expertise and service location. Evidence and history available in the report.";

const getToken = () => localStorage.getItem("access_token");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const normalize = (value) =>
    String(value || "").toLowerCase().replaceAll("_", " ").trim();

const labelOf = (value) => {
    if (!value) return "";
    if (typeof value === "object") return value.name || value.title || "";
    return String(value);
};

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

const getPriority = (problem) => normalize(problem.priority || "medium");


const getProblemId = (problem) =>
    problem.problem_id ||
    problem.problem?.problem_id ||
    problem.problem?.id ||
    problem.id ||
    problem.problem_code;


const getCategory = (problem) => labelOf(problem.category) || "General";

const getArea = (problem) =>
    labelOf(
        problem.area_name ||
        problem.area ||
        problem.ward ||
        problem.neighborhood ||
        problem.neighbourhood ||
        problem.location
    );

const getDistanceKm = (problem) => {
    const raw = problem.distance_km ?? problem.distance;
    const n = Number(raw);
    return raw !== null && raw !== undefined && raw !== "" && Number.isFinite(n)
        ? n
        : null;
};

const getExpected = (problem) =>
    problem.expected_resolution_date ||
    problem.expected_date ||
    problem.due_date ||
    "";

// Shows the badge unless the API explicitly says the issue isn't verified.
const isVerified = (problem) => {
    if (problem.is_verified !== undefined) return Boolean(problem.is_verified);
    if (problem.verified !== undefined) return Boolean(problem.verified);
    if (problem.verification_status)
        return normalize(problem.verification_status) === "verified";
    return true;
};

const TONES = ["teal", "amber", "violet", "blue"];

const getTone = (category, index) => {
    const c = normalize(category);
    if (c.includes("road")) return "teal";
    if (c.includes("light")) return "amber";
    if (c.includes("water") || c.includes("drain")) return "blue";
    if (c.includes("waste") || c.includes("garbage") || c.includes("sanit"))
        return "violet";
    return TONES[index % TONES.length];
};

const getKind = (category) => {
    const c = normalize(category);
    if (c.includes("road")) return "road";
    if (c.includes("light")) return "light";
    if (c.includes("water") || c.includes("drain")) return "water";
    if (c.includes("waste") || c.includes("garbage") || c.includes("sanit"))
        return "waste";
    return "pin";
};

const pickNumber = (...values) => {
    for (const v of values) {
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
};

const getPageList = (total, current) => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const sorted = [...new Set([1, total, current - 1, current, current + 1])]
        .filter((p) => p >= 1 && p <= total)
        .sort((a, b) => a - b);

    const out = [];
    sorted.forEach((p, i) => {
        if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
        out.push(p);
    });
    return out;
};

/* Count-up for the sidebar numbers (skips animation if the user prefers
   reduced motion). */
function useCountUp(target, duration = 900) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (target === null || target === undefined) return undefined;

        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduce) {
            setValue(target);
            return undefined;
        }

        let raf;
        const start = performance.now();

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            setValue(target * (1 - Math.pow(1 - t, 3)));
            if (t < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return value;
}

/* ------------------------------------------------------------------ */
/*  Illustrations (browse / match / scan themed)                       */
/* ------------------------------------------------------------------ */

/* calm line-art illustration: city outline, road and three marked locations */
function HeroIllustration() {
    return (
        <svg className="ap-scene" viewBox="0 0 340 150" aria-hidden="true">
            <g fill="none" stroke="#7be8d0" strokeOpacity="0.22">
                <rect x="2" y="2" width="336" height="146" rx="14" />
                <path d="M2 100H338" />
            </g>

            {/* buildings (outline only) */}
            <g fill="rgba(31,214,176,0.07)" stroke="#7be8d0" strokeOpacity="0.45" strokeWidth="1.4">
                <rect x="28" y="62" width="34" height="38" rx="2" />
                <rect x="68" y="44" width="40" height="56" rx="2" />
                <rect x="114" y="70" width="30" height="30" rx="2" />
                <rect x="206" y="52" width="36" height="48" rx="2" />
                <rect x="248" y="72" width="30" height="28" rx="2" />
                <rect x="284" y="58" width="32" height="42" rx="2" />
            </g>
            <g fill="#b9fbea" fillOpacity="0.55" className="ap-win-group">
                <rect x="78" y="54" width="5" height="5" rx="1" />
                <rect x="92" y="54" width="5" height="5" rx="1" />
                <rect x="78" y="68" width="5" height="5" rx="1" />
                <rect x="216" y="62" width="5" height="5" rx="1" />
                <rect x="228" y="76" width="5" height="5" rx="1" />
            </g>

            {/* road */}
            <path d="M2 118H338" stroke="#7be8d0" strokeOpacity="0.35" strokeWidth="1.4" />
            <path className="ap-road" d="M2 132H338" stroke="#7be8d0" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="8 8" />

            {/* slow truck on the road */}
            <g className="ap-truck">
                <rect x="0" y="107" width="16" height="9" rx="2" fill="#f5b04c" />
                <rect x="16" y="109" width="8" height="7" rx="2" fill="#ffd98a" />
                <circle cx="5" cy="117" r="2.6" fill="#06202b" stroke="#fff" strokeWidth="0.9" />
                <circle cx="19" cy="117" r="2.6" fill="#06202b" stroke="#fff" strokeWidth="0.9" />
            </g>

            {/* three marked locations */}
            {[
                { x: 88, y: 36, c: "#5ce0b6", d: "0s" },
                { x: 175, y: 60, c: "#ffc971", d: "1.3s" },
                { x: 262, y: 48, c: "#8fb4ff", d: "2.6s" },
            ].map((p) => (
                <g key={p.x} transform={`translate(${p.x} ${p.y})`}>
                    <circle className="ap-pin-ring" r="9" fill="none" stroke={p.c} strokeWidth="1.2" style={{ animationDelay: p.d }} />
                    <g className="ap-pin-bob" style={{ animationDelay: p.d }}>
                        <path d="M0 8 C -6 2 -8 -2 -8 -5 A8 8 0 0 1 8 -5 C 8 -2 6 2 0 8 Z" fill={p.c} />
                        <circle cy="-5" r="2.6" fill="#0a2236" />
                    </g>
                </g>
            ))}
        </svg>
    );
}

/* small animated category icon for each card */
function CategoryIcon({ kind }) {
    const p = { viewBox: "0 0 48 48", className: `ap-ic ap-ic-${kind}`, "aria-hidden": true };

    if (kind === "road")
        return (
            <svg {...p}>
                <path d="M17 42 L21 7 M31 42 L27 7" />
                <line className="ap-ic-lane" x1="24" y1="42" x2="24" y2="8" strokeDasharray="5 6" />
            </svg>
        );
    if (kind === "light")
        return (
            <svg {...p}>
                <g className="ap-ic-glow">
                    <path d="M24 3v4M8 12l3 3M40 12l-3 3M4 26h4M40 26h4" />
                </g>
                <circle cx="24" cy="22" r="9" />
                <path d="M20 34h8M21 39h6" />
            </svg>
        );
    if (kind === "water")
        return (
            <svg {...p}>
                <path className="ap-ic-drop" d="M24 6 C24 6 12 19 12 27 a12 12 0 0 0 24 0 C36 19 24 6 24 6Z" />
                <path className="ap-ic-wave" d="M4 43q5-4 10 0t10 0 10 0 10 0" />
            </svg>
        );
    if (kind === "waste")
        return (
            <svg {...p}>
                <g className="ap-ic-lid">
                    <path d="M12 13h24M20 13V9h8v4" />
                </g>
                <path d="M15 17l2 24h14l2-24" />
                <path d="M21 23v12M27 23v12" />
            </svg>
        );
    return (
        <svg {...p}>
            <path className="ap-ic-pin" d="M24 42C15 31 12 26 12 20a12 12 0 0 1 24 0c0 6-3 11-12 22Z" />
            <circle cx="24" cy="20" r="4" />
        </svg>
    );
}

function ServiceMap({ address }) {
    return (
        <div className="ap-map">
            <svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect width="300" height="170" fill="#e6f3f0" />

                {/* blocks */}
                <g fill="#f4faf8">
                    <rect x="112" y="12" width="64" height="40" rx="6" />
                    <rect x="204" y="112" width="84" height="48" rx="6" />
                    <rect x="14" y="116" width="70" height="42" rx="6" />
                    <rect x="112" y="116" width="64" height="42" rx="6" />
                </g>

                {/* park */}
                <rect x="14" y="16" width="84" height="64" rx="12" fill="#cde9db" />
                <g fill="#a9d6bf">
                    <circle cx="34" cy="40" r="7" />
                    <circle cx="52" cy="58" r="9" />
                    <circle cx="76" cy="36" r="6" />
                </g>
                <text x="30" y="72" fontSize="8" fontWeight="600" fill="#4f8a74">Willow Park</text>

                {/* roads */}
                <path d="M0 98 H300" stroke="#fff" strokeWidth="14" />
                <path d="M190 0 V170" stroke="#fff" strokeWidth="12" />
                <path d="M100 0 V170" stroke="#fff" strokeWidth="6" opacity="0.8" />
                <text x="118" y="101" fontSize="7" fill="#8aa6a2">Maple Avenue</text>

                {/* coverage area */}
                <circle
                    className="ap-coverage"
                    cx="226"
                    cy="58"
                    r="46"
                    fill="rgba(15,181,154,0.09)"
                    stroke="#0fb59a"
                    strokeWidth="1.4"
                    strokeDasharray="5 6"
                />

                {/* pin */}
                <g transform="translate(226 58)">
                    <circle className="ap-map-ripple" r="14" fill="none" stroke="#0fb59a" strokeWidth="2" />
                    <circle className="ap-map-ripple ap-map-ripple-2" r="14" fill="none" stroke="#0fb59a" strokeWidth="2" />
                    <g className="ap-map-pin">
                        <circle r="13" fill="#0fb59a" stroke="#fff" strokeWidth="3" />
                        <path d="M0 6 C -5 1 -5 -2 -5 -3 A5 5 0 0 1 5 -3 C 5 -2 5 1 0 6 Z" fill="#fff" />
                        <circle cy="-3" r="1.8" fill="#0fb59a" />
                    </g>
                </g>
            </svg>

            <span className="ap-map-address">
                <i />
                {address} · Illustrative map
            </span>
        </div>
    );
}

function EmptyArt() {
    return (
        <svg className="ap-empty-art" viewBox="0 0 220 160" aria-hidden="true">
            <ellipse cx="110" cy="144" rx="70" ry="8" fill="#d8ece7" />
            <g className="ap-empty-board">
                <rect x="58" y="22" width="84" height="112" rx="12" fill="#fff" stroke="#cfe5df" strokeWidth="2" />
                <rect x="84" y="14" width="32" height="16" rx="6" fill="#0fb59a" />
                <g fill="#dcebe8">
                    <rect x="74" y="50" width="52" height="6" rx="3" />
                    <rect x="74" y="68" width="40" height="6" rx="3" />
                    <rect x="74" y="86" width="48" height="6" rx="3" />
                </g>
                <circle cx="124" cy="112" r="10" fill="#e2f8f1" />
                <path d="M119 112 l4 4 l8 -9" stroke="#0fb59a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="ap-empty-lens">
                <circle cx="152" cy="92" r="20" fill="rgba(15,181,154,0.1)" stroke="#0a8f7b" strokeWidth="5" />
                <path d="M166 107 L184 126" stroke="#0a8f7b" strokeWidth="7" strokeLinecap="round" />
            </g>
            <g className="ap-empty-spark" fill="#f2b44d">
                <path d="M40 40 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" />
            </g>
            <g className="ap-empty-spark ap-empty-spark-2" fill="#6fe0c2">
                <path d="M186 36 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
            </g>
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatRow({ label, value, decimals = 0, suffix = "", tone, loading }) {
    const animated = useCountUp(value);
    const text =
        loading || value === null
            ? "—"
            : `${animated.toFixed(decimals)}${suffix}`;

    return (
        <div className="ap-stat-row">
            <span>{label}</span>
            <strong className={`ap-num-${tone}`}>{text}</strong>
        </div>
    );
}

function ProblemCard({ problem, index, interested, onToggleInterest }) {
    const id = getProblemId(problem);
    const priority = getPriority(problem);
    const category = getCategory(problem);
    const area = getArea(problem);
    const distance = getDistanceKm(problem);
    const expected = formatDate(getExpected(problem));
    const tone = getTone(category, index);

    const metaParts = [
        category,
        area,
        distance !== null ? `${distance.toFixed(1)} km` : "",
    ].filter(Boolean);

    return (
        <article
            className={`ap-card ap-tone-${tone}`}
            style={{ "--ap-i": index }}
        >
            <div className="ap-card-icon">
                <CategoryIcon kind={getKind(category)} />
            </div>

            <div className="ap-card-main">
                <div className="ap-card-meta-line">
                    <span className="ap-code">
                        {problem.problem_code ||
                            `#${problem.assignment_id || id || "—"}`}
                    </span>
                    <span className="ap-meta-text">{metaParts.join(" · ")}</span>
                </div>

                <h3>{problem.title || "Community problem"}</h3>

                <div className="ap-badges">
                    {isVerified(problem) && (
                        <span className="ap-badge ap-badge-verified">
                            <i />
                            Verified
                        </span>
                    )}

                    <span
                        className={`ap-badge ap-badge-${priority.replaceAll(" ", "-")}`}
                    >
                        <i />
                        {priority} priority
                    </span>

                    {expected && (
                        <span className="ap-expected">Expected: {expected}</span>
                    )}
                </div>

                <p className="ap-card-text">
                    {problem.match_reason || problem.description || FALLBACK_REASON}
                </p>
            </div>


            <div className="ap-card-actions">
                <Link
                    className="ap-btn ap-btn-solid"
                    to={`/organization/problems/${id}/details`}
                >
                    View full report
                </Link>

                {id ? (
                    <Link
                        className="ap-btn ap-btn-ghost"
                        to={`/organization/problems/${id}/accept`}
                    >
                        ✓ Accept Problem
                    </Link>
                ) : (
                    <button
                        type="button"
                        className="ap-btn ap-btn-ghost"
                        disabled
                        title="Problem ID is unavailable"
                    >
                        Accept Problem
                    </button>
                )}

                <button
                    type="button"
                    className={`ap-btn ap-btn-ghost ${interested ? "is-on" : ""}`}
                    onClick={() => onToggleInterest(id)}
                    aria-pressed={interested}
                >
                    {interested ? "✓ Interest noted" : "Express interest"}
                </button>
            </div>


        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
function AvailableProblems() {
    const [problems, setProblems] = useState([]);
    const [meta, setMeta] = useState({ organization: null, stats: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [area, setArea] = useState("all");
    const [sort, setSort] = useState("priority");
    const [page, setPage] = useState(1);

    const [interested, setInterested] = useState(() => new Set());
    const [toast, setToast] = useState("");
    const toastTimer = useRef(null);

    const loadProblems = useCallback(async (signal) => {
        setLoading(true);
        setError("");

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Your session has expired. Please log in again.");
            }

            const response = await fetch(DASHBOARD_API, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                signal,
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(
                    body.detail ||
                    body.message ||
                    `Unable to load assignments (${response.status}).`
                );
            }

            const data = await response.json();

            setProblems(
                Array.isArray(data.next_assignments) ? data.next_assignments : []
            );

            const summary = data.stats || data.summary || data.metrics || {};

            setMeta({
                organization: data.organization || null,
                stats: {
                    active: pickNumber(
                        summary.active_assignments,
                        summary.active,
                        data.active_assignments
                    ),
                    resolved: pickNumber(
                        summary.resolved_this_month,
                        summary.resolved,
                        data.resolved_this_month
                    ),
                    avgDays: pickNumber(
                        summary.avg_resolution_days,
                        summary.average_resolution_days,
                        data.avg_resolution_days
                    ),
                },
            });
        } catch (err) {
            if (err.name !== "AbortError") {
                setError(err.message || "Unable to connect to the server.");
            }
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadProblems(controller.signal);
        return () => controller.abort();
    }, [loadProblems, reloadKey]);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    useEffect(() => {
        setPage(1);
    }, [search, category, area, sort]);

    /* ---------- derived data ---------- */
    const categories = useMemo(
        () => [...new Set(problems.map(getCategory))].filter(Boolean),
        [problems]
    );

    const areas = useMemo(
        () => [...new Set(problems.map(getArea))].filter(Boolean),
        [problems]
    );

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        const list = problems.filter((problem) => {
            const text = [
                problem.title,
                problem.description,
                problem.problem_code,
                getArea(problem),
                getCategory(problem),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                (!query || text.includes(query)) &&
                (category === "all" || getCategory(problem) === category) &&
                (area === "all" || getArea(problem) === area)
            );
        });

        const time = (v) => {
            const t = new Date(v).getTime();
            return Number.isNaN(t) ? null : t;
        };

        return [...list].sort((a, b) => {
            if (sort === "newest") {
                return (
                    (time(b.assigned_at || b.created_at) || 0) -
                    (time(a.assigned_at || a.created_at) || 0)
                );
            }

            if (sort === "nearest") {
                return (
                    (getDistanceKm(a) ?? Infinity) - (getDistanceKm(b) ?? Infinity)
                );
            }

            if (sort === "due") {
                return (
                    (time(getExpected(a)) ?? Infinity) -
                    (time(getExpected(b)) ?? Infinity)
                );
            }

            const byPriority =
                (PRIORITY_RANK[getPriority(a)] ?? 9) -
                (PRIORITY_RANK[getPriority(b)] ?? 9);

            return (
                byPriority ||
                (time(getExpected(a)) ?? Infinity) -
                (time(getExpected(b)) ?? Infinity)
            );
        });
    }, [problems, search, category, area, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    const filtersActive =
        search.trim() !== "" || category !== "all" || area !== "all";

    const clearFilters = () => {
        setSearch("");
        setCategory("all");
        setArea("all");
        setSort("priority");
    };

    const toggleInterest = (id) => {
        // TODO: call your "express interest" endpoint here. For now this only
        // updates the UI so the flow can be styled and tested.
        const wasOn = interested.has(id);

        setInterested((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

        clearTimeout(toastTimer.current);

        if (!wasOn) {
            setToast("Interest noted. An administrator confirms any assignment.");
            toastTimer.current = setTimeout(() => setToast(""), 3200);
        } else {
            setToast("");
        }
    };

    const org = meta.organization || {};
    const orgName = org.name || org.organization_name || "Your organization";

    const coverageCategories =
        (Array.isArray(org.categories) && org.categories.map(labelOf).filter(Boolean)) ||
        [];
    const coverageAreas =
        (Array.isArray(org.service_areas) && org.service_areas.map(labelOf).filter(Boolean)) ||
        [];

    const categoryText = (coverageCategories.length ? coverageCategories : categories)
        .slice(0, 3)
        .join(" & ");
    const areaText = (coverageAreas.length ? coverageAreas : areas)
        .slice(0, 4)
        .join(" · ");

    /* ---------- render ---------- */
    return (
        <div className="ap-page">
            {/* ===== Hero ===== */}
            <header className="ap-hero">
                <div className="ap-wrap ap-hero-inner">
                    <div className="ap-hero-copy">
                        <Link to={DASHBOARD_ROUTE} className="ap-backlink">
                            <span aria-hidden="true">←</span> Back to Dashboard 
                        </Link>
                        <br></br>
                        <span className="ap-eyebrow">Organization workspace · 04</span>
                        <h1>Available Problems</h1>
                        <p>Verified issues that match your service categories and neighborhoods.</p>
                    </div>

                    <div className="ap-hero-right">
                        <HeroIllustration />
                    </div>
                </div>
            </header>

            {/* ===== Advisory banner ===== */}
            <div className="ap-banner" role="note">
                <div className="ap-wrap ap-banner-inner">
                    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                        <circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M6.4 10.3l2.5 2.5 4.7-5.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="ap-banner-text">
                        <span aria-hidden="true">✦</span>{" "}
                        <strong>Matching support · Advisory only</strong> — Matches use
                        your profile expertise. A human administrator confirms
                        assignment; browsing does not create responsibility.
                    </span>
                </div>
            </div>

            <div className="ap-wrap ap-body">
                {/* ===== Toolbar ===== */}
                <div className="ap-toolbar">
                    <label className="ap-search">
                        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search verified problems..."
                            aria-label="Search verified problems"
                        />
                    </label>

                    <div className="ap-chips">
                        <label className={`ap-chip ${category !== "all" ? "is-active" : ""}`}>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                aria-label="Filter by category"
                            >
                                <option value="all">All categories</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </label>

                        <label className={`ap-chip ${area !== "all" ? "is-active" : ""}`}>
                            <select
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                aria-label="Filter by service area"
                            >
                                <option value="all">Service area</option>
                                {areas.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </label>

                        <label className="ap-chip">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                aria-label="Sort problems"
                            >
                                <option value="priority">Priority first</option>
                                <option value="newest">Newest first</option>
                                <option value="nearest">Nearest first</option>
                                <option value="due">Due soonest</option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* ===== Main layout ===== */}
                <div className="ap-layout">
                    <main className="ap-main">
                        <div className="ap-section-head">
                            <div className="ap-section-title">
                                <div>
                                    <h2>Matched Problems</h2>
                                    <p aria-live="polite">
                                        {loading
                                            ? "Scanning your service area..."
                                            : `${filtered.length} verified ${filtered.length === 1 ? "issue" : "issues"
                                            } in your service area`}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="ap-viewall"
                                onClick={clearFilters}
                                disabled={loading || !filtersActive}
                            >
                                View all →
                            </button>
                        </div>

                        {error && (
                            <div className="ap-alert" role="alert">
                                <span className="ap-alert-icon">!</span>
                                <div>
                                    <strong>Couldn't load problems</strong>
                                    <p>{error}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReloadKey((k) => k + 1)}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="ap-list">
                                {[1, 2, 3].map((n) => (
                                    <div className="ap-skeleton" key={n}>
                                        <div className="ap-sk-icon" />
                                        <div className="ap-sk-main">
                                            <span />
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                        <div className="ap-sk-actions">
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !error && filtered.length === 0 ? (
                            <div className="ap-empty">
                                <EmptyArt />
                                <h3>
                                    {problems.length === 0
                                        ? "No matched problems yet"
                                        : "No problems match these filters"}
                                </h3>
                                <p>
                                    {problems.length === 0
                                        ? "When an administrator matches an issue to your expertise and service area, it will appear here."
                                        : "Try a different search, or clear the filters to see every matched problem."}
                                </p>
                                {problems.length > 0 && (
                                    <button
                                        type="button"
                                        className="ap-btn ap-btn-ghost ap-empty-btn"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : !error ? (
                            <>
                                <div className="ap-list" key={`page-${currentPage}`}>
                                    {visible.map((problem, i) => {
                                        const id = getProblemId(problem);
                                        return (
                                            <ProblemCard
                                                key={id || `${problem.title}-${i}`}
                                                problem={problem}
                                                index={i}
                                                interested={interested.has(id)}
                                                onToggleInterest={toggleInterest}
                                            />
                                        );
                                    })}
                                </div>

                                <nav className="ap-pager" aria-label="Pagination">
                                    <span className="ap-pager-info">
                                        Showing {startIndex + 1}–{startIndex + visible.length} of{" "}
                                        {filtered.length} records
                                    </span>

                                    <div className="ap-pager-controls">
                                        <button
                                            type="button"
                                            className="ap-page-step"
                                            onClick={() => setPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            ← Prev
                                        </button>

                                        {getPageList(totalPages, currentPage).map((p) =>
                                            typeof p === "string" ? (
                                                <span className="ap-page-gap" key={p}>…</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    key={p}
                                                    className={`ap-page-num ${p === currentPage ? "is-current" : ""}`}
                                                    onClick={() => setPage(p)}
                                                    aria-current={p === currentPage ? "page" : undefined}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}

                                        <button
                                            type="button"
                                            className="ap-page-step"
                                            onClick={() => setPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </nav>
                            </>
                        ) : null}
                    </main>

                    {/* ===== Sidebar ===== */}
                    <aside className="ap-aside">
                        <section className="ap-panel">
                            <div className="ap-panel-head">
                                <h3>Your service area</h3>
                                <span className="ap-check" aria-hidden="true">✓</span>
                            </div>

                            <ServiceMap address={org.address || "Your registered area"} />

                            <div className="ap-coverage-info">
                                <strong>
                                    <i />
                                    {categoryText || "No categories set"}
                                </strong>
                                <span>{areaText || "No service areas set"}</span>
                            </div>

                            <Link to={PROFILE_ROUTE} className="ap-dark-btn">
                                Edit service coverage →
                            </Link>
                        </section>

                        <section className="ap-panel ap-panel-dark">
                            <div className="ap-panel-head">
                                <span className="ap-bolt" aria-hidden="true">⚡</span>
                                <h3>How responsibility works</h3>
                            </div>

                            <ol className="ap-steps">
                                <li>
                                    <span className="ap-step-n">1</span>
                                    Review the full report
                                </li>
                                <li>
                                    <span className="ap-step-n">2</span>
                                    Admin assigns the issue
                                </li>
                                <li>
                                    <span className="ap-step-n">3</span>
                                    Authorized member accepts &amp; proposes solution
                                </li>
                            </ol>
                        </section>

                        <section className="ap-panel">
                            <h3 className="ap-org-title">{orgName}</h3>

                            <div className="ap-stat-list">
                                <StatRow
                                    label="Active assignments"
                                    value={meta.stats.active ?? null}
                                    tone="teal"
                                    loading={loading}
                                />
                                <StatRow
                                    label="Resolved this month"
                                    value={meta.stats.resolved ?? null}
                                    tone="violet"
                                    loading={loading}
                                />
                                <StatRow
                                    label="Avg. resolution time"
                                    value={meta.stats.avgDays ?? null}
                                    decimals={1}
                                    suffix="d"
                                    tone="amber"
                                    loading={loading}
                                />
                            </div>

                            <Link to={DASHBOARD_ROUTE} className="ap-outline-btn">
                                View org dashboard →
                            </Link>
                        </section>
                    </aside>
                </div>

                <footer className="ap-footer">
                    <span>CivicSolve · Not a government agency</span>
                    <nav aria-label="Footer">
                        <a href="/privacy">Privacy</a>
                        <a href="/terms">Terms</a>
                        <a href="/accessibility">Accessibility</a>
                        <a href="/help">Help</a>
                    </nav>
                </footer>
            </div>

            <div className={`ap-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
                {toast}
            </div>
        </div>
    );
}

export default AvailableProblems;