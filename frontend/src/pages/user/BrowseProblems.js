import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getBrowseProblems,
    setProblemSupport,
} from "../../services/api";
import "../../styles/user/BrowseProblems.css";

const PAGE_SIZE = 6;

const STATUS_LABELS = {
    open: "Open",
    under_review: "Under Review",
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
};

const PRIORITY_LABELS = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
};

const RADIUS_OPTIONS = [
    { value: "", label: "Any distance" },
    { value: "1", label: "Within 1 km" },
    { value: "2", label: "Within 2 km" },
    { value: "5", label: "Within 5 km" },
    { value: "10", label: "Within 10 km" },
];

const TABS = [
    { value: "nearby", label: "Nearby" },
    { value: "supported", label: "Most supported" },
    { value: "recent", label: "Recently reported" },
];

/* illustrative pin spots on the sidebar map */
const PIN_SPOTS = [
    { x: 58, y: 70 },
    { x: 104, y: 104 },
    { x: 138, y: 62 },
    { x: 196, y: 112 },
    { x: 244, y: 74 },
];

/* =========================================================
   HELPERS
   ========================================================= */

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
}

function normalizeList(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.problems)) return response.problems;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
}

function getCategory(problem) {
    if (typeof problem.category === "string") {
        return problem.category;
    }

    return (
        problem.category_details?.name ||
        problem.category_name ||
        problem.category?.name ||
        "General"
    );
}

function getProblemId(problem) {
    return problem.id ?? problem.problem_id ?? problem.pk;
}

function getImage(problem) {
    const attachment = problem.attachments?.[0];

    if (typeof attachment === "string") return attachment;

    return (
        attachment?.file ||
        attachment?.file_url ||
        problem.image ||
        problem.image_url ||
        problem.thumbnail ||
        ""
    );
}

function shortCode(problem) {
    const code = String(problem.problem_code || problem.id || "");
    return code.length > 13 ? code.slice(0, 8).toUpperCase() : code.toUpperCase();
}

function categoryTone(name) {
    const text = String(name || "general").toLowerCase();
    let sum = 0;

    for (let i = 0; i < text.length; i += 1) sum += text.charCodeAt(i);

    return sum % 5;
}

/* support votes — read whatever field the API provides */
function baseSupport(problem) {
    return Number(
        problem.support_count ??
        problem.supports_count ??
        problem.votes_count ??
        problem.votes ??
        problem.upvotes ??
        0
    ) || 0;
}

function initiallySupported(problem) {
    return Boolean(problem.has_supported ?? problem.user_supported ?? false);
}

function getDistance(problem) {
    const raw = problem.distance_km ?? problem.distance;
    const value = Number(raw);

    if (raw === undefined || raw === null || raw === "" || Number.isNaN(value)) {
        return "";
    }

    return `${value.toFixed(1)} km away`;
}

function pageWindow(current, total) {
    const start = Math.max(1, Math.min(current - 1, total - 2));
    const end = Math.min(total, start + 2);
    const pages = [];

    for (let p = start; p <= end; p += 1) pages.push(p);

    return pages;
}

/* numbers count up smoothly when they change */
function CountUp({ value }) {
    const [shown, setShown] = useState(0);
    const fromRef = useRef(0);

    useEffect(() => {
        const target = Number(value) || 0;
        const reduce =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduce) {
            fromRef.current = target;
            setShown(target);
            return undefined;
        }

        const from = fromRef.current;
        const duration = 750;
        const startTime = performance.now();
        let frame;

        const tick = (now) => {
            const p = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const next = Math.round(from + (target - from) * eased);

            fromRef.current = next;
            setShown(next);

            if (p < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <>{shown}</>;
}


/* =========================================================
   ILLUSTRATIONS
   ========================================================= */

/* one isometric block */
const Iso = ({ x, y, w, h, top, left, right, className }) => (
    <g className={className}>
        <polygon
            points={`${x - w},${y - h + w / 2} ${x},${y - h + w} ${x},${y + w} ${x - w},${y + w / 2}`}
            fill={left}
        />
        <polygon
            points={`${x},${y - h + w} ${x + w},${y - h + w / 2} ${x + w},${y + w / 2} ${x},${y + w}`}
            fill={right}
        />
        <polygon
            points={`${x},${y - h} ${x + w},${y - h + w / 2} ${x},${y - h + w} ${x - w},${y - h + w / 2}`}
            fill={top}
        />
    </g>
);

/* hero: a small isometric neighbourhood with live pins */
const CityArt = () => (
    <svg className="bp-city" viewBox="0 0 360 210" aria-hidden="true">
        <defs>
            <clipPath id="bpGround">
                <polygon points="180,40 340,120 180,200 20,120" />
            </clipPath>
            <linearGradient id="bpGroundFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="1" stopColor="#7ff5e4" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="bpPinGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7ff5e4" />
                <stop offset="1" stopColor="#12b5a0" />
            </linearGradient>
        </defs>

        <circle className="bp-twinkle" cx="30" cy="30" r="1.6" fill="#fff" />
        <circle className="bp-twinkle bp-d2" cx="330" cy="26" r="1.4" fill="#7ff5e4" />
        <circle className="bp-twinkle bp-d3" cx="300" cy="64" r="1.2" fill="#fff" />
        <circle className="bp-twinkle bp-d4" cx="64" cy="70" r="1.2" fill="#fff" />

        {/* drifting clouds */}
        <g className="bp-cloud bp-cloud-1">
            <ellipse cx="60" cy="26" rx="18" ry="5" fill="rgba(255,255,255,0.22)" />
            <ellipse cx="72" cy="22" rx="11" ry="5" fill="rgba(255,255,255,0.22)" />
        </g>
        <g className="bp-cloud bp-cloud-2">
            <ellipse cx="250" cy="14" rx="16" ry="4.5" fill="rgba(255,255,255,0.18)" />
            <ellipse cx="260" cy="11" rx="10" ry="4.5" fill="rgba(255,255,255,0.18)" />
        </g>
        <path className="bp-bird" d="M300 44q4-5 8 0q4-5 8 0" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" />
        <path className="bp-bird bp-bird-2" d="M40 54q3-4 6 0q3-4 6 0" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />

        {/* ground + roads */}
        <polygon points="180,40 340,120 180,200 20,120" fill="url(#bpGroundFill)" stroke="rgba(255,255,255,0.25)" />
        <g clipPath="url(#bpGround)">
            <line x1="0" y1="35" x2="360" y2="215" stroke="rgba(255,255,255,0.2)" strokeWidth="13" />
            <line x1="0" y1="215" x2="360" y2="35" stroke="rgba(255,255,255,0.2)" strokeWidth="13" />
            <line className="bp-road-dash" x1="0" y1="35" x2="360" y2="215" stroke="#7ff5e4" strokeWidth="1.3" strokeDasharray="6 7" opacity="0.7" />
            <line className="bp-road-dash" x1="0" y1="215" x2="360" y2="35" stroke="#7ff5e4" strokeWidth="1.3" strokeDasharray="6 7" opacity="0.7" />
            <polygon points="262,92 306,114 262,136 218,114" fill="rgba(46,213,150,0.28)" />
        </g>

        {/* moving cars */}
        <circle className="bp-car bp-car-a" cx="90" cy="90" r="2.8" fill="#ffd447" />
        <circle className="bp-car bp-car-b" cx="270" cy="82" r="2.8" fill="#8fb4ff" />

        {/* buildings, back to front */}
        <Iso x={180} y={52} w={20} h={50} top="#7ff5e4" left="#1a8f93" right="#0f6d78" className="bp-bld bp-bld-1" />
        <Iso x={120} y={78} w={18} h={34} top="#b8f4ea" left="#2a9ea0" right="#1b7885" className="bp-bld bp-bld-2" />
        <Iso x={238} y={74} w={17} h={30} top="#a9c9ff" left="#4b7cc4" right="#34609f" className="bp-bld bp-bld-3" />
        <Iso x={78} y={102} w={15} h={22} top="#ffe08a" left="#d9a63a" right="#b78624" className="bp-bld bp-bld-4" />
        <Iso x={176} y={112} w={16} h={26} top="#d3c4ff" left="#8a74d8" right="#6b58b5" className="bp-bld bp-bld-5" />
        <Iso x={284} y={108} w={15} h={20} top="#b8f4ea" left="#2a9ea0" right="#1b7885" className="bp-bld bp-bld-6" />
        <Iso x={130} y={138} w={14} h={18} top="#ffb7c8" left="#d9708b" right="#b45570" className="bp-bld bp-bld-7" />
        <Iso x={226} y={140} w={14} h={24} top="#7ff5e4" left="#1a8f93" right="#0f6d78" className="bp-bld bp-bld-8" />

        {/* blinking windows */}
        <rect className="bp-window" x="172" y="22" width="3" height="3" fill="#fff6b0" />
        <rect className="bp-window bp-window-2" x="184" y="30" width="3" height="3" fill="#fff6b0" />
        <rect className="bp-window bp-window-3" x="116" y="56" width="3" height="3" fill="#fff6b0" />
        <rect className="bp-window bp-window-2" x="240" y="56" width="3" height="3" fill="#fff6b0" />

        {/* trees */}
        <circle cx="52" cy="124" r="5" fill="#35d49a" />
        <circle cx="314" cy="130" r="5" fill="#35d49a" />
        <circle cx="262" cy="118" r="4" fill="#5ee6b0" />
        <circle cx="180" cy="168" r="4.5" fill="#35d49a" />

        {/* live pins */}
        <g className="bp-pin bp-pin-1">
            <ellipse className="bp-pin-ring" cx="180" cy="40" rx="11" ry="4" fill="none" stroke="#7ff5e4" strokeWidth="1.3" />
            <path d="M180 36 C180 36 170 24 170 16 a10 10 0 0 1 20 0 C190 24 180 36 180 36z" fill="url(#bpPinGrad)" />
            <circle cx="180" cy="16" r="3.6" fill="#06162a" />
        </g>
        <g className="bp-pin bp-pin-2">
            <ellipse className="bp-pin-ring bp-pin-ring-2" cx="120" cy="64" rx="9" ry="3.4" fill="none" stroke="#ffc15a" strokeWidth="1.2" />
            <path d="M120 60 C120 60 112 50 112 44 a8 8 0 0 1 16 0 C128 50 120 60 120 60z" fill="#ffc15a" />
            <circle cx="120" cy="44" r="2.8" fill="#06162a" />
        </g>
        <g className="bp-pin bp-pin-3">
            <ellipse className="bp-pin-ring bp-pin-ring-3" cx="238" cy="62" rx="9" ry="3.4" fill="none" stroke="#8fb4ff" strokeWidth="1.2" />
            <path d="M238 58 C238 58 230 48 230 42 a8 8 0 0 1 16 0 C246 48 238 58 238 58z" fill="#8fb4ff" />
            <circle cx="238" cy="42" r="2.8" fill="#06162a" />
        </g>

        {/* support badge */}
        <g className="bp-art-badge">
            <rect x="262" y="22" width="78" height="26" rx="13" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" />
            <circle cx="276" cy="35" r="8" fill="#7ff5e4" />
            <path d="M276 39v-8m0 0l-3.4 3.4m3.4-3.4l3.4 3.4" fill="none" stroke="#06162a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="290" y="29" width="40" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
            <rect x="290" y="36" width="26" height="3.5" rx="1.75" fill="rgba(255,255,255,0.4)" />
        </g>
    </svg>
);

/* sidebar: illustrative neighbourhood map */
const MapArt = ({ pins, hoverId, onPick, onHover }) => (
    <svg className="bp-map-art" viewBox="0 0 300 190" role="img" aria-label="Illustrative map of nearby reports">
        <rect width="300" height="190" fill="#e6f4f1" />
        <polygon points="196,0 238,0 300,150 300,190 262,190" fill="#cfe7ee" />
        <rect x="12" y="22" width="72" height="56" rx="10" fill="#cfe9d8" />
        <rect x="104" y="36" width="190" height="14" fill="#ffffff" />
        <rect x="104" y="108" width="190" height="14" fill="#ffffff" />
        <rect x="150" y="14" width="14" height="170" fill="#ffffff" />
        <rect x="232" y="14" width="12" height="170" fill="#ffffff" opacity="0.9" />
        <line className="bp-road-dash" x1="104" y1="43" x2="294" y2="43" stroke="#cfdede" strokeDasharray="5 6" />
        <line className="bp-road-dash" x1="104" y1="115" x2="294" y2="115" stroke="#cfdede" strokeDasharray="5 6" />
        <text x="22" y="54" fontSize="8" fill="#7da596">Willow</text>
        <text x="108" y="132" fontSize="8" fill="#9ab0b0">Maple Avenue</text>

        <circle className="bp-car bp-car-map" cx="110" cy="43" r="3" fill="#12b5a0" />

        {pins.map((pin, index) => {
            const active = hoverId !== null && String(hoverId) === String(pin.id);

            return (
                <g
                    key={`${pin.id}-${index}`}
                    className={`bp-map-pin ${active ? "is-active" : ""}`}
                    transform={`translate(${pin.x} ${pin.y})`}
                    onMouseEnter={() => onHover(pin.id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onPick(pin.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${pin.label}`}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") onPick(pin.id);
                    }}
                >
                    {active && <circle className="bp-map-halo" r="16" fill="rgba(18,181,160,0.28)" />}
                    <g className="bp-map-pin-body">
                        <circle r="11" fill={active ? "#12b5a0" : "#1f5f8b"} stroke="#ffffff" strokeWidth="3" />
                        <circle r="3.6" fill="#ffffff" />
                    </g>
                </g>
            );
        })}
    </svg>
);

/* sidebar: neighbours working together */
const PeopleArt = () => (
    <svg className="bp-people-art" viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
            <linearGradient id="bpPeopleBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#0f3d4c" />
                <stop offset="1" stopColor="#14627a" />
            </linearGradient>
        </defs>
        <rect width="320" height="90" fill="url(#bpPeopleBg)" />
        <circle className="bp-twinkle" cx="24" cy="18" r="1.5" fill="#fff" />
        <circle className="bp-twinkle bp-d2" cx="292" cy="14" r="1.5" fill="#7ff5e4" />

        {/* table */}
        <ellipse cx="160" cy="80" rx="108" ry="12" fill="rgba(5,24,36,0.45)" />
        <rect x="64" y="64" width="192" height="12" rx="6" fill="#2b8f94" />

        {/* neighbours */}
        <g className="bp-person bp-person-1">
            <circle cx="78" cy="34" r="10" fill="#f2c9a5" />
            <path d="M66 62c0-14 5-20 12-20s12 6 12 20z" fill="#ff8fb1" />
        </g>
        <g className="bp-person bp-person-2">
            <circle cx="122" cy="30" r="10" fill="#d6a47e" />
            <path d="M110 62c0-14 5-20 12-20s12 6 12 20z" fill="#7ff5e4" />
        </g>
        <g className="bp-person bp-person-3">
            <circle cx="198" cy="30" r="10" fill="#f2c9a5" />
            <path d="M186 62c0-14 5-20 12-20s12 6 12 20z" fill="#ffd447" />
        </g>
        <g className="bp-person bp-person-4">
            <circle cx="242" cy="34" r="10" fill="#b98562" />
            <path d="M230 62c0-14 5-20 12-20s12 6 12 20z" fill="#8fb4ff" />
        </g>

        {/* shared support badge */}
        <g className="bp-handshake">
            <circle cx="160" cy="34" r="14" fill="#ffd447" />
            <path d="M153 36l5 4 4-3 5 3 4-6-5-4-4 2-3-2z" fill="#06162a" opacity="0.8" />
        </g>
    </svg>
);

/* picture placeholder for reports without a photo */
const PlaceholderArt = ({ tone, letter }) => (
    <div className={`bp-ph bp-ph-${tone}`} aria-hidden="true">
        <svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice">
            <circle className="bp-ph-sun" cx="236" cy="42" r="16" fill="#ffffff" fillOpacity="0.85" />
            <g className="bp-ph-cloud bp-ph-cloud-1">
                <ellipse cx="60" cy="40" rx="22" ry="6" fill="#ffffff" fillOpacity="0.55" />
                <ellipse cx="74" cy="35" rx="13" ry="6" fill="#ffffff" fillOpacity="0.55" />
            </g>
            <g className="bp-ph-cloud bp-ph-cloud-2">
                <ellipse cx="170" cy="22" rx="18" ry="5" fill="#ffffff" fillOpacity="0.4" />
                <ellipse cx="181" cy="18" rx="10" ry="5" fill="#ffffff" fillOpacity="0.4" />
            </g>
            <path d="M0 130 C50 100 90 112 140 124 C190 136 240 98 300 116 L300 180 L0 180Z" fill="#ffffff" fillOpacity="0.28" />
            <g fill="#ffffff" fillOpacity="0.5">
                <rect x="24" y="96" width="22" height="46" rx="3" />
                <rect x="52" y="108" width="18" height="34" rx="3" />
                <rect x="224" y="90" width="24" height="52" rx="3" />
                <rect x="254" y="104" width="20" height="38" rx="3" />
            </g>
            <path d="M0 150 C60 132 110 148 170 142 C220 137 260 128 300 140 L300 180 L0 180Z" fill="#ffffff" fillOpacity="0.5" />
            <g className="bp-ph-pin">
                <ellipse className="bp-ph-ring" cx="150" cy="140" rx="20" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.6" />
                <ellipse className="bp-ph-ring bp-ph-ring-2" cx="150" cy="140" rx="20" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.6" />
                <path d="M150 138 C150 138 130 114 130 98 a20 20 0 0 1 40 0 C170 114 150 138 150 138z" fill="#ffffff" />
                <circle cx="150" cy="98" r="11" fill="var(--ph-accent)" />
            </g>
            <text x="150" y="103" textAnchor="middle" fontSize="13" fontWeight="800" fill="#ffffff">{letter}</text>
        </svg>
    </div>
);

/* empty state */
const EmptyArt = () => (
    <svg className="bp-empty-art" viewBox="0 0 150 110" aria-hidden="true">
        <ellipse cx="72" cy="104" rx="38" ry="4" fill="rgba(12,38,56,0.08)" />
        <polygon points="72,22 128,50 72,78 16,50" fill="#e6f7f3" stroke="#bfe3dc" />
        <polygon points="72,34 100,48 72,62 44,48" fill="#cfeee8" />
        <g className="bp-empty-pin">
            <path d="M72 50 C72 50 58 34 58 24 a14 14 0 0 1 28 0 C86 34 72 50 72 50z" fill="#12b5a0" />
            <circle cx="72" cy="24" r="5" fill="#ffffff" />
        </g>
        <g className="bp-empty-scan">
            <circle cx="108" cy="70" r="15" fill="rgba(255,255,255,0.75)" stroke="#12b5a0" strokeWidth="4" />
            <line x1="119" y1="81" x2="131" y2="95" stroke="#12b5a0" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle className="bp-twinkle" cx="22" cy="30" r="2.4" fill="#7ff5e4" />
        <circle className="bp-twinkle bp-d2" cx="130" cy="22" r="2" fill="#12b5a0" />
    </svg>
);

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];


/* =========================================================
   PAGE
   ========================================================= */

function BrowseProblems() {
    const navigate = useNavigate();

    const [problems, setProblems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [summary, setSummary] = useState({});

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [category, setCategory] = useState("");
    const [radius, setRadius] = useState("");
    const [tab, setTab] = useState("nearby");
    const [page, setPage] = useState(1);

    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [coords, setCoords] = useState(null);
    const [locating, setLocating] = useState(false);
    const [locationNote, setLocationNote] = useState("");

    const [supported, setSupported] = useState({});
    const [supporting, setSupporting] = useState({});
    const [supportNotice, setSupportNotice] = useState("");
    const [hoverId, setHoverId] = useState(null);

    const sortParam = tab === "supported" ? "most_supported" : "newest";

    const loadProblems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                search,
                status,
                priority,
                category,
                sort: sortParam,
                page,
                page_size: PAGE_SIZE,
            };

            if (radius) params.radius = radius;

            if (coords) {
                params.latitude = coords.lat;
                params.longitude = coords.lng;
            }

            const response = await getBrowseProblems(params);
            const results = normalizeList(response);

            setProblems(results);
            setSummary(response?.summary || {});

            const pagination = response?.pagination || {};

            setTotalPages(
                Number(
                    pagination.total_pages ??
                    response?.total_pages ??
                    Math.max(1, Math.ceil(
                        Number(response?.count ?? results.length) / PAGE_SIZE
                    ))
                )
            );

            setTotalRecords(
                Number(
                    pagination.total_records ??
                    response?.count ??
                    results.length
                )
            );

            const responseCategories =
                response?.categories ||
                response?.filters?.categories ||
                [];

            if (Array.isArray(responseCategories)) {
                setCategories((previous) => {
                    const incoming = responseCategories
                        .map((item) =>
                            typeof item === "string"
                                ? { value: item, label: item }
                                : {
                                    value: String(item.id ?? item.value ?? item.name),
                                    label: item.name ?? item.label ?? item.title,
                                }
                        )
                        .filter((item) => item.value && item.label);

                    return incoming.length ? incoming : previous;
                });
            }
        } catch (err) {
            setProblems([]);
            setError(
                err.message || "Unable to load community problems. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [search, status, priority, category, radius, coords, sortParam, page]);

    useEffect(() => {
        loadProblems();
    }, [loadProblems]);

    const isSupported = useCallback(
        (problem) => {
            const id = getProblemId(problem);

            return id in supported
                ? supported[id]
                : initiallySupported(problem);
        },
        [supported]
    );

    const supportCount = useCallback(
        (problem) =>
            baseSupport(problem) -
            (initiallySupported(problem) ? 1 : 0) +
            (isSupported(problem) ? 1 : 0),
        [isSupported]
    );

    const visibleProblems = useMemo(() => {
        // Client-side filtering keeps the page usable if the API
        // returns more records than the selected filters.
        const query = search.toLowerCase();

        const filtered = problems.filter((problem) => {
            const searchableText = [
                problem.title,
                problem.description,
                problem.location,
                problem.problem_code,
                getCategory(problem),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const selectedCategory = String(category);
            const problemCategory = String(
                problem.category_id ??
                problem.category_details?.id ??
                problem.category?.id ??
                getCategory(problem)
            );

            return (
                (!query || searchableText.includes(query)) &&
                (!status || problem.status === status) &&
                (!priority || problem.priority === priority) &&
                (!selectedCategory || problemCategory === selectedCategory)
            );
        });

        const sorted = [...filtered];

        if (tab === "supported") {
            sorted.sort((a, b) => supportCount(b) - supportCount(a));
        } else if (tab === "recent") {
            sorted.sort(
                (a, b) =>
                    new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        } else if (coords) {
            sorted.sort(
                (a, b) =>
                    (Number(a.distance_km ?? a.distance) || 0) -
                    (Number(b.distance_km ?? b.distance) || 0)
            );
        }

        return sorted;
    }, [problems, search, status, priority, category, tab, coords, supportCount]);

    const activeFilters = Boolean(
        search || status || priority || category || radius
    );

    const inProgressCount =
        summary.in_progress ??
        problems.filter((problem) => problem.status === "in_progress").length;

    const totalVotes =
        summary.total_votes ??
        problems.reduce((sum, problem) => sum + supportCount(problem), 0);

    const visibleStart = totalRecords ? (page - 1) * PAGE_SIZE + 1 : 0;
    const visibleEnd = Math.min(page * PAGE_SIZE, totalRecords);

    const mapPins = visibleProblems.slice(0, PIN_SPOTS.length).map((problem, index) => ({
        id: getProblemId(problem),
        label: problem.title || "report",
        ...PIN_SPOTS[index],
    }));

    const submitSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const clearFilters = () => {
        setSearchInput("");
        setSearch("");
        setStatus("");
        setPriority("");
        setCategory("");
        setRadius("");
        setCoords(null);
        setLocationNote("");
        setTab("nearby");
        setPage(1);
    };

    const openProblem = (problemOrId) => {
        const id =
            typeof problemOrId === "object"
                ? getProblemId(problemOrId)
                : problemOrId;

        if (id === undefined || id === null || id === "") {
            setError("This report does not have a valid problem ID.");
            return;
        }

        navigate(`/user/problem/${encodeURIComponent(id)}`);
    };

    const openDiscussion = (problem) => {
        const id = getProblemId(problem);

        if (id === undefined || id === null || id === "") {
            setError("This report does not have a valid problem ID.");
            return;
        }

        navigate(`/user/problem/${encodeURIComponent(id)}/discussion`);
    };

    const toggleSupport = async (problem) => {
        const id = getProblemId(problem);

        if (id === undefined || id === null || id === "" || supporting[id]) {
            return;
        }

        const nextSupported = !isSupported(problem);
        setSupporting((previous) => ({ ...previous, [id]: true }));
        setError("");

        try {
            const response = await setProblemSupport(id, nextSupported);

            setSupported((previous) => ({
                ...previous,
                [id]: response.has_supported,
            }));
            setProblems((previous) =>
                previous.map((item) =>
                    String(getProblemId(item)) === String(id)
                        ? {
                            ...item,
                            support_count: response.support_count,
                            has_supported: response.has_supported,
                        }
                        : item
                )
            );
            setSupportNotice(
                response.has_supported
                    ? `You support "${problem.title || "this problem"}".`
                    : `Your support for "${problem.title || "this problem"}" was removed.`
            );
        } catch (err) {
            setError(
                err.message || "Unable to update your support. Please try again."
            );
        } finally {
            setSupporting((previous) => ({ ...previous, [id]: false }));
        }
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setLocationNote("Location is not supported in this browser.");
            return;
        }

        setLocating(true);
        setLocationNote("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocating(false);
                setLocationNote("Showing reports near you.");
                setTab("nearby");
                setPage(1);
            },
            () => {
                setLocating(false);
                setLocationNote("Couldn't read your location. Check browser permission.");
            },
            { timeout: 8000 }
        );
    };

    const goToPage = (next) => {
        setPage(Math.min(Math.max(1, next), Math.max(1, totalPages)));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <main className="bp-page">

            {/* =====================  HERO  ===================== */}
            <section className="bp-hero">

                <div className="bp-hero-bg" aria-hidden="true">
                    <span className="bp-blob bp-blob-1" />
                    <span className="bp-blob bp-blob-2" />
                    <span className="bp-petal bp-petal-1" />
                    <span className="bp-petal bp-petal-2" />
                    <span className="bp-petal bp-petal-3" />
                    <span className="bp-petal bp-petal-4" />
                    <span className="bp-float-chip bp-chip-a"><b>↑</b> Support +1</span>
                    <span className="bp-float-chip bp-chip-b"><b>✓</b> Resolved</span>
                    <span className="bp-float-chip bp-chip-c"><b>⌖</b> New report</span>
                </div>

                <div className="bp-hero-inner">
                    <div className="bp-hero-content">
                        <div className="bp-eyebrow-row">
                            <span className="bp-eyebrow">COMMUNITY WORKSPACE / BROWSE</span>
                            <span className="bp-live-chip">
                                <i /> Live · {loading ? "…" : totalRecords} nearby
                            </span>
                        </div>

                        <h1>Explore community problems</h1>

                        <p>
                            Discover nearby issues, support a report and follow local progress.
                        </p>
                    </div>

                    <div className="bp-hero-art">
                        <CityArt />
                    </div>
                </div>

                <svg className="bp-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
                </svg>
            </section>

            <div className="bp-content">

                {/* =====================  SEARCH BAR  ===================== */}
                <form className="bp-searchbar" onSubmit={submitSearch}>
                    <button
                        type="submit"
                        className="bp-search-icon"
                        aria-label="Search community problems"
                    >
                        ⌕
                    </button>

                    <input
                        type="search"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search community problems or landmarks..."
                        aria-label="Search community problems"
                    />

                    <label className="bp-select">
                        <span className="bp-sr-only">Category</span>
                        <select
                            value={category}
                            onChange={(event) => {
                                setCategory(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All categories</option>
                            {categories.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="bp-select">
                        <span className="bp-sr-only">Distance</span>
                        <select
                            value={radius}
                            onChange={(event) => {
                                setRadius(event.target.value);
                                setPage(1);
                            }}
                        >
                            {RADIUS_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="bp-select">
                        <span className="bp-sr-only">Priority</span>
                        <select
                            value={priority}
                            onChange={(event) => {
                                setPriority(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All priorities</option>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="bp-select bp-select-accent">
                        <span className="bp-sr-only">Status</span>
                        <select
                            value={status}
                            onChange={(event) => {
                                setStatus(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Open issues</option>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                </form>

                <div className="bp-layout">

                    {/* =====================  LIST COLUMN  ===================== */}
                    <section className="bp-list-col">

                        <nav className="bp-tabs" aria-label="Order reports">
                            {TABS.map((item) => (
                                <button
                                    type="button"
                                    key={item.value}
                                    className={`bp-tab ${tab === item.value ? "active" : ""}`}
                                    onClick={() => {
                                        setTab(item.value);
                                        setPage(1);
                                    }}
                                    aria-pressed={tab === item.value}
                                >
                                    <span className="bp-tab-dot" />
                                    {item.label}
                                    {tab === item.value && !loading && (
                                        <span className="bp-tab-count"> · {totalRecords}</span>
                                    )}
                                </button>
                            ))}

                            {activeFilters && (
                                <button
                                    type="button"
                                    className="bp-clear"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </button>
                            )}
                        </nav>

                        {error && (
                            <div className="bp-alert" role="alert">
                                <div>
                                    <strong>Couldn't load community reports</strong>
                                    <p>{error}</p>
                                </div>
                                <button type="button" onClick={loadProblems}>
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="bp-list bp-grid" aria-busy={loading}>
                            {loading ? (
                                SKELETON_ROWS.map((i) => (
                                    <article
                                        className="bp-card bp-card-v bp-skel-card"
                                        key={`skeleton-${i}`}
                                        style={{ "--i": i }}
                                    >
                                        <div className="bp-card-media bp-skel-media" />
                                        <div className="bp-card-main">
                                            <span className="bp-skel w25" />
                                            <span className="bp-skel w60 tall" />
                                            <span className="bp-skel" />
                                            <span className="bp-skel w40" />
                                        </div>
                                    </article>
                                ))
                            ) : visibleProblems.length === 0 ? (
                                <div className="bp-empty">
                                    <EmptyArt />
                                    <h3>
                                        {activeFilters
                                            ? "No matching problems found"
                                            : "No community reports yet"}
                                    </h3>
                                    <p>
                                        {activeFilters
                                            ? "Try another search term or clear the filters to see more reports."
                                            : "Be the first to report a problem in your community."}
                                    </p>
                                    {activeFilters ? (
                                        <button type="button" onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => navigate("/user/report")}>
                                            Report a problem
                                        </button>
                                    )}
                                </div>
                            ) : (
                                visibleProblems.map((problem, index) => {
                                    const id = getProblemId(problem);
                                    const currentStatus = problem.status || "open";
                                    const currentPriority = problem.priority || "medium";
                                    const categoryName = getCategory(problem);
                                    const tone = categoryTone(categoryName);
                                    const distance = getDistance(problem);
                                    const image = getImage(problem);
                                    const on = isSupported(problem);
                                    const code = problem.problem_code
                                        ? `CS-${shortCode(problem)}`
                                        : "CivicSolve report";

                                    return (
                                        <article
                                            className={`bp-card bp-card-v ${String(hoverId) === String(id) ? "is-hover" : ""}`}
                                            key={id}
                                            style={{ "--i": index }}
                                            onMouseEnter={() => setHoverId(id)}
                                            onMouseLeave={() => setHoverId(null)}
                                        >
                                            <div className="bp-card-media">
                                                <PlaceholderArt
                                                    tone={tone}
                                                    letter={String(categoryName).charAt(0).toUpperCase()}
                                                />

                                                {image && (
                                                    <img
                                                        src={image}
                                                        alt={problem.title || "Problem evidence"}
                                                        loading="lazy"
                                                        onError={(event) => {
                                                            event.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                )}

                                                <span className="bp-media-shade" />

                                                <span className={`bp-chip bp-float-status bp-status-${currentStatus}`}>
                                                    <i />
                                                    {STATUS_LABELS[currentStatus] ||
                                                        currentStatus.replaceAll("_", " ")}
                                                </span>

                                                <span className={`bp-chip bp-float-priority bp-priority-${currentPriority}`}>
                                                    <i />
                                                    {PRIORITY_LABELS[currentPriority] || currentPriority}
                                                </span>

                                                {distance && (
                                                    <span className="bp-distance">⌖ {distance}</span>
                                                )}

                                                <button
                                                    type="button"
                                                    className={`bp-support bp-support-float ${on ? "on" : ""}`}
                                                    onClick={() => toggleSupport(problem)}
                                                    disabled={Boolean(supporting[id])}
                                                    aria-pressed={on}
                                                    aria-label={`${on ? "Remove support from" : "Support"} ${problem.title || "this report"}`}
                                                >
                                                    <span className="bp-support-arrow" aria-hidden="true">↑</span>
                                                    <span className="bp-support-count" key={`${id}-${on}`}>
                                                        {supportCount(problem)}
                                                    </span>
                                                    {on ? "Supported" : "Support"}
                                                </button>
                                            </div>

                                            <div className="bp-card-main">
                                                <div className="bp-card-topline">
                                                    <span className={`bp-cat bp-tone-${tone}`}>
                                                        {categoryName}
                                                    </span>
                                                    <span className="bp-card-code">{code}</span>
                                                </div>

                                                <h3>
                                                    <button
                                                        type="button"
                                                        className="bp-card-title"
                                                        onClick={() => openProblem(problem)}
                                                    >
                                                        {problem.title || "Untitled report"}
                                                    </button>
                                                </h3>

                                                <p className="bp-card-desc">
                                                    {problem.description ||
                                                        "No additional description has been provided."}
                                                </p>

                                                <div className="bp-card-meta">
                                                    <span>
                                                        <b aria-hidden="true">⌖</b>
                                                        {problem.location || "Location not provided"}
                                                    </span>
                                                    <span>
                                                        <b aria-hidden="true">◷</b>
                                                        Updated {formatDate(problem.updated_at || problem.created_at || problem.reported_at)}
                                                    </span>
                                                </div>

                                                <div className="bp-card-foot">
                                                    <button type="button" onClick={() => openProblem(problem)}>
                                                        View report →
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="bp-discuss"
                                                        onClick={() => openDiscussion(problem)}
                                                    >
                                                        Discuss ↗
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>

                        <div className="bp-list-footer">
                            <span>
                                Showing {visibleStart}–{visibleEnd} of {totalRecords} records
                            </span>

                            {totalPages > 1 && (
                                <nav className="bp-pagination" aria-label="Problem pages">
                                    <button
                                        type="button"
                                        disabled={page <= 1 || loading}
                                        onClick={() => goToPage(page - 1)}
                                    >
                                        ← Prev
                                    </button>

                                    {pageWindow(page, totalPages).map((number) => (
                                        <button
                                            type="button"
                                            key={number}
                                            className={`bp-page-number ${number === page ? "active" : ""}`}
                                            disabled={loading}
                                            onClick={() => goToPage(number)}
                                            aria-current={number === page ? "page" : undefined}
                                        >
                                            {number}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        disabled={page >= totalPages || loading}
                                        onClick={() => goToPage(page + 1)}
                                    >
                                        Next →
                                    </button>
                                </nav>
                            )}
                        </div>
                    </section>

                    {/* =====================  SIDEBAR  ===================== */}
                    <aside className="bp-side">

                        <article className="bp-side-card bp-map-card" style={{ "--d": "0.1s" }}>
                            <div className="bp-map-head">
                                <div>
                                    <h2>Nearby discovery</h2>
                                    <span className="bp-live-text"><i /> Live pins</span>
                                </div>
                            </div>

                            <div className="bp-map-frame">
                                <MapArt
                                    pins={mapPins}
                                    hoverId={hoverId}
                                    onHover={setHoverId}
                                    onPick={openProblem}
                                />
                                <span className="bp-map-caption">
                                    Community reports near you · Illustrative map
                                </span>
                            </div>

                            <button
                                type="button"
                                className="bp-locate"
                                onClick={useMyLocation}
                                disabled={locating}
                            >
                                <span aria-hidden="true">⌖</span>
                                {locating ? "Finding you…" : "Use current location"}
                            </button>

                            {locationNote && (
                                <p className="bp-location-note" role="status">{locationNote}</p>
                            )}
                        </article>

                        <article className="bp-side-card bp-support-card" style={{ "--d": "0.18s" }}>
                            <PeopleArt />
                            <div className="bp-support-body">
                                <h2>Support, don't duplicate</h2>
                                <p>
                                    If someone has already reported the problem, add your support
                                    or useful evidence. Votes show community interest, not
                                    emergency priority.
                                </p>
                                <p className="bp-support-note">
                                    Human reviewers decide priority and assignment.
                                </p>
                                {supportNotice && (
                                    <p className="bp-support-note" role="status">
                                        {supportNotice}
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="bp-side-card bp-stats-card" style={{ "--d": "0.26s" }}>
                            <div>
                                <strong>{loading ? "—" : <CountUp value={totalRecords} />}</strong>
                                <span>Nearby issues</span>
                            </div>
                            <div>
                                <strong className="green">{loading ? "—" : <CountUp value={totalVotes} />}</strong>
                                <span>Community votes</span>
                            </div>
                            <div>
                                <strong className="blue">{loading ? "—" : <CountUp value={inProgressCount} />}</strong>
                                <span>In progress</span>
                            </div>
                        </article>
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default BrowseProblems;