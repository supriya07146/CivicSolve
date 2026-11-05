import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    getBrowseProblems,
    getMyProblemDetails,
    getProblemDiscussions,
    createProblemDiscussion,
} from "../../services/api";
import "../../styles/user/ProblemDiscussion.css";

const PAGE_STEP = 5;

const STATUS_LABELS = {
    open: "Open",
    under_review: "Under Review",
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected",
    closed: "Closed",
};

const STATUS_PROGRESS = {
    open: 0,
    under_review: 20,
    assigned: 35,
    in_progress: 65,
    resolved: 100,
    closed: 100,
    rejected: 0,
};

const LIFECYCLE_INDEX = {
    open: 0,
    under_review: 1,
    assigned: 2,
    in_progress: 3,
    resolved: 4,
    closed: 5,
};

/* four checkpoints shown in the status card: [label, lifecycle index needed] */
const CHECKPOINTS = [
    ["Reported", 0],
    ["Review", 1],
    ["In progress", 3],
    ["Resolved", 4],
];

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeList(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.problems)) return response.problems;
    if (Array.isArray(response?.data)) return response.data;
    return [];
}

function getProblemId(problem) {
    return problem?.id ?? problem?.problem_id ?? problem?.pk;
}

function getCategory(problem) {
    if (typeof problem?.category === "string") {
        return problem.category;
    }

    return (
        problem?.category_details?.name ||
        problem?.category_name ||
        problem?.category?.name ||
        "General"
    );
}

function getParentId(item) {
    const parent = item?.parent;

    if (parent === null || parent === undefined || parent === "") {
        return null;
    }

    // Supports APIs returning either a parent ID or a nested object.
    if (typeof parent === "object") {
        return parent.id ?? parent.pk ?? null;
    }

    return parent;
}

function shortCode(problem) {
    const code = String(problem?.problem_code || problem?.id || "");
    return code.length > 13 ? code.slice(0, 8).toUpperCase() : code.toUpperCase();
}

function getOrganization(problem) {
    if (!problem) return "";

    if (problem.assignment_details?.organization_name) {
        return problem.assignment_details.organization_name;
    }

    const assignments = problem.assignments || [];

    if (assignments.length) {
        return (
            assignments[0].organization_details?.organization_name ||
            "Assigned organization"
        );
    }

    return "";
}

function getReporter(problem) {
    return (
        problem?.reporter_name ||
        problem?.reported_by_name ||
        problem?.user_name ||
        problem?.author_name ||
        ""
    );
}

function initials(name) {
    const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* "Today, 17:45" / "Yesterday, 09:10" / "8 Oct, 14:30" */
function formatWhen(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const time = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const startOfDay = (d) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const dayDiff = Math.round(
        (startOfDay(new Date()) - startOfDay(date)) / 86400000
    );

    if (dayDiff === 0) return `Today, ${time}`;
    if (dayDiff === 1) return `Yesterday, ${time}`;

    return `${date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    })}, ${time}`;
}

function roleInfo(item) {
    const type = String(item.author_type || "citizen").toLowerCase();
    const own = Boolean(item.is_own ?? item.is_mine ?? item.is_owner ?? false);

    if (own) {
        return { tone: "you", badge: "You", label: "Community member" };
    }

    if (type.includes("org") || type.includes("respons") || type.includes("member")) {
        return {
            tone: "team",
            badge:
                item.organization_name ||
                item.author_organization ||
                "Responsible team",
            label: "Responsible member",
        };
    }

    if (type.includes("admin") || type.includes("moderator")) {
        return { tone: "admin", badge: "Moderator", label: "CivicSolve team" };
    }

    return { tone: "citizen", badge: "Community member", label: "Community member" };
}


/* =========================================================
   ILLUSTRATIONS
   ========================================================= */

/* hero backdrop: a skyline of bars that breathe */
const BarsArt = () => (
    <svg className="pd-bars" viewBox="0 0 420 150" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
        <defs>
            <linearGradient id="pdBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1fe0c0" stopOpacity="0.5" />
                <stop offset="1" stopColor="#1fe0c0" stopOpacity="0.04" />
            </linearGradient>
        </defs>
        <rect className="pd-bar pd-bar-1" x="20" y="60" width="38" height="90" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-2" x="68" y="30" width="30" height="120" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-3" x="108" y="78" width="44" height="72" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-4" x="162" y="8" width="52" height="142" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-5" x="224" y="52" width="36" height="98" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-6" x="270" y="92" width="44" height="58" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-7" x="324" y="40" width="34" height="110" rx="4" fill="url(#pdBar)" />
        <rect className="pd-bar pd-bar-8" x="368" y="84" width="40" height="66" rx="4" fill="url(#pdBar)" />
        <circle className="pd-twinkle" cx="186" cy="2" r="2" fill="#fff" />
        <circle className="pd-twinkle pd-d2" cx="94" cy="20" r="1.6" fill="#7ff5e4" />
    </svg>
);

/* hero: floating chat bubbles with a typing indicator */
const ChatArt = () => (
    <svg className="pd-chat-art" viewBox="0 0 300 150" aria-hidden="true">
        <defs>
            <linearGradient id="pdGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
        </defs>

        <circle className="pd-twinkle" cx="20" cy="22" r="1.6" fill="#fff" />
        <circle className="pd-twinkle pd-d3" cx="280" cy="40" r="1.6" fill="#7ff5e4" />
        <circle className="pd-twinkle pd-d2" cx="262" cy="120" r="1.4" fill="#fff" />

        <g className="pd-bubble pd-bubble-1">
            <rect x="26" y="20" width="140" height="44" rx="14" fill="url(#pdGlass)" stroke="rgba(255,255,255,0.3)" />
            <circle cx="46" cy="42" r="10" fill="#1fe0c0" />
            <rect x="64" y="34" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.8)" />
            <rect x="64" y="45" width="56" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
        </g>

        <g className="pd-bubble pd-bubble-2">
            <rect x="126" y="72" width="148" height="44" rx="14" fill="rgba(31,224,192,0.22)" stroke="rgba(127,245,228,0.5)" />
            <circle cx="254" cy="94" r="10" fill="#7b6cf0" />
            <rect x="142" y="86" width="84" height="5" rx="2.5" fill="rgba(255,255,255,0.8)" />
            <rect x="142" y="97" width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
        </g>

        <g className="pd-bubble pd-bubble-3">
            <rect x="30" y="108" width="62" height="28" rx="14" fill="url(#pdGlass)" stroke="rgba(255,255,255,0.3)" />
            <circle className="pd-typing pd-typing-1" cx="48" cy="122" r="3" fill="#7ff5e4" />
            <circle className="pd-typing pd-typing-2" cx="61" cy="122" r="3" fill="#7ff5e4" />
            <circle className="pd-typing pd-typing-3" cx="74" cy="122" r="3" fill="#7ff5e4" />
        </g>
    </svg>
);

/* empty state: two speech bubbles */
const EmptyChatArt = () => (
    <svg className="pd-empty-art" viewBox="0 0 150 110" aria-hidden="true">
        <ellipse cx="75" cy="102" rx="40" ry="4" fill="rgba(0,0,0,0.25)" />
        <g className="pd-empty-bubble pd-empty-bubble-1">
            <rect x="18" y="16" width="82" height="48" rx="14" fill="rgba(31,224,192,0.2)" stroke="#1fe0c0" />
            <path d="M34 64l-8 14 22-14z" fill="rgba(31,224,192,0.2)" stroke="#1fe0c0" strokeLinejoin="round" />
            <rect x="32" y="30" width="48" height="5" rx="2.5" fill="#7ff5e4" />
            <rect x="32" y="42" width="32" height="4" rx="2" fill="rgba(127,245,228,0.5)" />
        </g>
        <g className="pd-empty-bubble pd-empty-bubble-2">
            <rect x="62" y="44" width="72" height="42" rx="14" fill="rgba(123,108,240,0.28)" stroke="#9a8cf5" />
            <path d="M118 86l8 12-20-12z" fill="rgba(123,108,240,0.28)" stroke="#9a8cf5" strokeLinejoin="round" />
            <circle className="pd-typing pd-typing-1" cx="84" cy="65" r="3" fill="#c7bfff" />
            <circle className="pd-typing pd-typing-2" cx="98" cy="65" r="3" fill="#c7bfff" />
            <circle className="pd-typing pd-typing-3" cx="112" cy="65" r="3" fill="#c7bfff" />
        </g>
    </svg>
);

/* small animated icon for the thread heading */
const ThreadIcon = () => (
    <span className="pd-title-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40">
            <rect className="pd-ti-1" x="5" y="7" width="22" height="15" rx="6" fill="#ffffff" fillOpacity="0.95" />
            <path d="M10 22l-3 6 9-6z" fill="#ffffff" fillOpacity="0.95" />
            <rect className="pd-ti-2" x="15" y="17" width="20" height="14" rx="6" fill="#0b2d3d" fillOpacity="0.85" />
            <circle className="pd-typing pd-typing-1" cx="21" cy="24" r="1.8" fill="#7ff5e4" />
            <circle className="pd-typing pd-typing-2" cx="26" cy="24" r="1.8" fill="#7ff5e4" />
            <circle className="pd-typing pd-typing-3" cx="31" cy="24" r="1.8" fill="#7ff5e4" />
        </svg>
    </span>
);

/* "keep it constructive": two hands holding a heart */
const KindArt = () => (
    <svg className="pd-kind-art" viewBox="0 0 120 80" aria-hidden="true">
        <ellipse cx="60" cy="74" rx="34" ry="4" fill="rgba(12,38,56,0.08)" />
        <g className="pd-kind-heart">
            <path d="M60 52 C36 36 40 18 52 18 C57 18 60 22 60 22 C60 22 63 18 68 18 C80 18 84 36 60 52z" fill="#ff8fb1" />
            <path d="M52 24 C48 24 46 28 48 32" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>
        <path d="M14 58 C26 52 38 56 48 62 L48 72 L14 72z" fill="#1fe0c0" />
        <path d="M106 58 C94 52 82 56 72 62 L72 72 L106 72z" fill="#12b5a0" />
        <circle className="pd-twinkle" cx="24" cy="26" r="2" fill="#7ff5e4" />
        <circle className="pd-twinkle pd-d2" cx="98" cy="22" r="2" fill="#ffd447" />
        <circle className="pd-twinkle pd-d3" cx="104" cy="46" r="1.6" fill="#8fb4ff" />
    </svg>
);

/* assistant: sparkles */
const SparkArt = () => (
    <svg className="pd-spark-art" viewBox="0 0 90 60" aria-hidden="true">
        <path className="pd-spark pd-spark-1" d="M30 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#7ff5e4" />
        <path className="pd-spark pd-spark-2" d="M64 26l2.6 7.4 7.4 2.6-7.4 2.6L64 46l-2.6-7.4L54 36l7.4-2.6z" fill="#b9a7ff" />
        <path className="pd-spark pd-spark-3" d="M70 6l1.6 4.4 4.4 1.6-4.4 1.6L70 18l-1.6-4.4L64 12l4.4-1.6z" fill="#ffd447" />
    </svg>
);

const SKELETON_ROWS = [0, 1, 2];


/* =========================================================
   PAGE
   ========================================================= */

function ProblemDiscussion() {
    const navigate = useNavigate();
    const { problemId: routeProblemId } = useParams();
    const problemId = routeProblemId || null;

    const [discussions, setDiscussions] = useState([]);
    const [message, setMessage] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [notify, setNotify] = useState(true);
    const [sortOrder, setSortOrder] = useState("oldest");
    const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

    /* UI-only until like / report endpoints are connected */
    const [helpful, setHelpful] = useState({});
    const [reported, setReported] = useState({});

    const [loading, setLoading] = useState(Boolean(problemId));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [problems, setProblems] = useState([]);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [problemsError, setProblemsError] = useState("");
    const [problemSearch, setProblemSearch] = useState("");
    const [fallbackProblem, setFallbackProblem] = useState(null);

    const fileInputRef = useRef(null);
    const composerRef = useRef(null);

    const selectedProblem =
        problems.find(
            (problem) => String(getProblemId(problem)) === String(problemId)
        ) ||
        (fallbackProblem &&
            String(getProblemId(fallbackProblem)) === String(problemId)
            ? fallbackProblem
            : null);

    /* the list of reports: used by the selector screen and to find the title */
    const loadProblems = useCallback(async () => {
        setProblemsLoading(true);
        setProblemsError("");

        try {
            const response = await getBrowseProblems({
                page: 1,
                page_size: 50,
                sort: "newest",
            });

            setProblems(normalizeList(response));
        } catch (err) {
            setProblemsError(
                err.message || "Unable to load community reports."
            );
        } finally {
            setProblemsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProblems();
    }, [loadProblems]);

    /* if the report is not in the browse list, try the owner's detail endpoint */
    useEffect(() => {
        if (!problemId || problemsLoading || selectedProblem) return undefined;

        let cancelled = false;

        (async () => {
            try {
                const detail = await getMyProblemDetails(problemId);

                if (!cancelled && detail) {
                    setFallbackProblem(detail.problem || detail);
                }
            } catch (err) {
                /* title simply falls back to the problem ID */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [problemId, problemsLoading, selectedProblem]);

    useEffect(() => {
        if (!problemId) {
            setDiscussions([]);
            setReplyTo(null);
            setLoading(false);
            setError("");
        }
    }, [problemId]);

    const loadDiscussions = useCallback(async () => {
        if (!problemId) {
            setDiscussions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await getProblemDiscussions(problemId);
            setDiscussions(normalizeList(response));
        } catch (err) {
            setError(
                err.message || "Unable to load discussion messages."
            );
        } finally {
            setLoading(false);
        }
    }, [problemId]);

    useEffect(() => {
        if (problemId) {
            setVisibleCount(PAGE_STEP);
            loadDiscussions();
        }
    }, [problemId, loadDiscussions]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedMessage = message.trim();

        if (!problemId) {
            setError("Select a problem before posting a message.");
            return;
        }

        if (!trimmedMessage) {
            setError("Please enter a message before posting.");
            return;
        }

        setSubmitting(true);
        setError("");
        setNotice("");

        try {
            let payload = {
                message: trimmedMessage,
                parent: replyTo ? replyTo.id : null,
                notify_on_reply: notify,
            };

            // Evidence is sent as multipart form data (the API must accept a file field).
            if (attachment) {
                payload = new FormData();
                payload.append("message", trimmedMessage);
                if (replyTo) payload.append("parent", replyTo.id);
                payload.append("notify_on_reply", notify);
                payload.append("attachment", attachment);
            }

            await createProblemDiscussion(problemId, payload);

            setMessage("");
            setReplyTo(null);
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setNotice("Your comment has been posted.");
            await loadDiscussions();
        } catch (err) {
            setError(err.message || "Unable to post your comment.");
        } finally {
            setSubmitting(false);
        }
    };

    const startReply = (item) => {
        setReplyTo(item);
        setError("");
        setNotice("");

        if (composerRef.current) {
            composerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const openDiscussion = (problem) => {
        const id = getProblemId(problem);

        if (id === null || id === undefined || id === "") {
            setProblemsError("This report does not have a valid problem ID.");
            return;
        }

        navigate(`/user/problem/${encodeURIComponent(id)}/discussion`);
    };

    const filteredProblems = useMemo(() => {
        const query = problemSearch.trim().toLowerCase();

        if (!query) return problems;

        return problems.filter((problem) =>
            [
                problem.title,
                problem.description,
                problem.location,
                problem.problem_code,
                getCategory(problem),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [problems, problemSearch]);

    const topLevelMessages = useMemo(() => {
        const list = discussions.filter((item) => getParentId(item) === null);

        list.sort((a, b) => {
            const diff = new Date(a.created_at || 0) - new Date(b.created_at || 0);
            return sortOrder === "newest" ? -diff : diff;
        });

        return list;
    }, [discussions, sortOrder]);

    const shownMessages = topLevelMessages.slice(0, visibleCount);
    const hiddenCount = Math.max(0, topLevelMessages.length - shownMessages.length);

    /* status card values */
    const currentStatus = selectedProblem?.status || "";
    const progress = STATUS_PROGRESS[currentStatus] ?? 0;
    const lifecycleIndex = LIFECYCLE_INDEX[currentStatus] ?? 0;
    const organization = getOrganization(selectedProblem);
    const reporter = getReporter(selectedProblem);

    const renderMessage = (item, isReply = false, order = 0) => {
        const itemId = item.id ?? item.pk;

        const replies = discussions.filter(
            (discussion) =>
                String(getParentId(discussion)) === String(itemId)
        );

        const role = roleInfo(item);
        const isReported = Boolean(reported[itemId]);
        const isHelpful = Boolean(helpful[itemId]);
        const helpfulCount =
            (Number(item.helpful_count ?? item.likes_count ?? 0) || 0) +
            (isHelpful ? 1 : 0);

        return (
            <article
                className={`pd-comment ${isReply ? "pd-comment--reply" : ""}`}
                key={itemId}
                style={{ "--i": order }}
            >
                <div className={`pd-avatar pd-avatar--${role.tone}`} aria-hidden="true">
                    {initials(item.author_name)}
                </div>

                <div className="pd-comment-body">
                    <div className="pd-comment-head">
                        <div className="pd-comment-who">
                            <strong>{item.author_name || "Community member"}</strong>
                            <span className={`pd-role pd-role--${role.tone}`}>
                                {role.badge}
                            </span>
                        </div>

                        <time
                            className="pd-comment-time"
                            dateTime={item.created_at || undefined}
                        >
                            {role.label}
                            {item.created_at ? ` · ${formatWhen(item.created_at)}` : ""}
                        </time>
                    </div>

                    <p className="pd-comment-text">{item.message}</p>

                    {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                        <div className="pd-comment-files">
                            {item.attachments.map((file, index) => (
                                <a
                                    key={file.id ?? index}
                                    href={file.file || file.file_url || file}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    📎 Evidence {index + 1}
                                </a>
                            ))}
                        </div>
                    )}

                    <div className="pd-comment-actions">
                        <div>
                            {!isReply && (
                                <button type="button" onClick={() => startReply(item)}>
                                    Reply
                                </button>
                            )}

                            <button
                                type="button"
                                className={isHelpful ? "is-on" : ""}
                                aria-pressed={isHelpful}
                                onClick={() =>
                                    setHelpful((previous) => ({
                                        ...previous,
                                        [itemId]: !previous[itemId],
                                    }))
                                }
                            >
                                Helpful{helpfulCount > 0 ? ` · ${helpfulCount}` : ""}
                            </button>
                        </div>

                        <button
                            type="button"
                            className="pd-report"
                            disabled={isReported}
                            onClick={() =>
                                setReported((previous) => ({
                                    ...previous,
                                    [itemId]: true,
                                }))
                            }
                        >
                            {isReported ? "Sent for review" : "Report inappropriate content"}
                        </button>
                    </div>

                    {replies.length > 0 && (
                        <div className="pd-replies">
                            {replies.map((reply, index) =>
                                renderMessage(reply, true, index)
                            )}
                        </div>
                    )}
                </div>
            </article>
        );
    };

    const renderNav = () => (
        <>
            <div className="pd-hero-bg" aria-hidden="true">
                <span className="pd-glow pd-glow-1" />
                <span className="pd-glow pd-glow-2" />
                <BarsArt />
                <span className="pd-petal pd-petal-1" />
                <span className="pd-petal pd-petal-2" />
                <span className="pd-petal pd-petal-3" />
                <span className="pd-petal pd-petal-4" />
                <span className="pd-float-chip pd-chip-a"><b>💬</b> New reply</span>
                <span className="pd-float-chip pd-chip-b"><b>✓</b> Helpful</span>
                <span className="pd-float-chip pd-chip-c"><b>↗</b> Update shared</span>
                <svg className="pd-wave" viewBox="0 0 1440 60" preserveAspectRatio="none">
                    <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
                </svg>
                <svg className="pd-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
                </svg>
            </div>
        </>
    );

    /* =====================  SELECTOR SCREEN  ===================== */
    if (!problemId) {
        return (
            <main className="pd-page">
                <section className="pd-hero">
                    {renderNav()}

                    <div className="pd-hero-inner">
                        <div className="pd-hero-content">
                            <div className="pd-crumbs">
                                Community workspace / <b>Problem Discussion</b>
                            </div>
                            <h1>Choose a problem to discuss</h1>
                            <p className="pd-hero-sub">
                                Select a community report to read comments, ask questions
                                and share helpful updates.
                            </p>
                        </div>

                        <div className="pd-hero-art">
                            <ChatArt />
                        </div>
                    </div>
                </section>

                <div className="pd-content">
                    <label className="pd-search" htmlFor="pd-problem-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            id="pd-problem-search"
                            type="search"
                            value={problemSearch}
                            onChange={(event) => setProblemSearch(event.target.value)}
                            placeholder="Search by title, location or category..."
                            aria-label="Search community reports"
                        />
                    </label>

                    {problemsError && (
                        <div className="pd-alert pd-alert--error" role="alert">
                            <span>{problemsError}</span>
                            <button type="button" onClick={loadProblems}>
                                Retry
                            </button>
                        </div>
                    )}

                    {problemsLoading ? (
                        <div className="pd-pick-grid">
                            {SKELETON_ROWS.map((i) => (
                                <article className="pd-pick-card pd-skel-card" key={i} style={{ "--i": i }}>
                                    <span className="pd-skel w25" />
                                    <span className="pd-skel w70 tall" />
                                    <span className="pd-skel" />
                                    <span className="pd-skel w50" />
                                </article>
                            ))}
                        </div>
                    ) : filteredProblems.length === 0 ? (
                        <div className="pd-empty">
                            <EmptyChatArt />
                            <h3>No reports found</h3>
                            <p>
                                Try another search term, or browse community reports to find
                                a problem to discuss.
                            </p>
                            <button type="button" onClick={() => navigate("/user/browse")}>
                                Browse problems
                            </button>
                        </div>
                    ) : (
                        <div className="pd-pick-grid">
                            {filteredProblems.map((problem, index) => {
                                const id = getProblemId(problem);

                                return (
                                    <article
                                        className="pd-pick-card"
                                        key={id}
                                        style={{ "--i": index }}
                                    >
                                        <span className="pd-pick-cat">{getCategory(problem)}</span>

                                        <h3>{problem.title || "Untitled report"}</h3>

                                        <p>
                                            {problem.description || "No description provided."}
                                        </p>

                                        <div className="pd-pick-meta">
                                            <span>{problem.location || "Location not provided"}</span>
                                            {problem.problem_code && (
                                                <span>CS-{shortCode(problem)}</span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openDiscussion(problem)}
                                            disabled={id === null || id === undefined}
                                        >
                                            Open discussion →
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    /* =====================  THREAD SCREEN  ===================== */
    return (
        <main className="pd-page" aria-labelledby="pd-title">
            <section className="pd-hero">
                {renderNav()}

                <div className="pd-hero-inner">
                    <div className="pd-hero-content">
                        <div className="pd-hero-links">
                            <Link to={`/user/problem/${encodeURIComponent(problemId)}`}>
                                ← Back to problem
                            </Link>
                            <Link to="/user/problem-discussion">
                                All discussion topics
                            </Link>
                        </div>

                        <div className="pd-crumbs">
                            Community workspace / <b>Problem Discussion</b>
                        </div>

                        <h1 id="pd-title">Problem Discussion</h1>

                        <div className="pd-problem-line">
                            <span className="pd-code">
                                CS-{shortCode(selectedProblem || { id: problemId })}
                            </span>
                            <span className="pd-problem-title">
                                {selectedProblem?.title ||
                                    `Report #${problemId}`}
                            </span>
                        </div>
                    </div>

                    <div className="pd-hero-art">
                        <ChatArt />
                    </div>
                </div>
            </section>

            <div className="pd-content">
                <div className="pd-layout">

                    {/* ---------- main column ---------- */}
                    <div className="pd-main">

                        <section className="pd-card pd-thread" style={{ "--d": "0.05s" }}>
                            <div className="pd-thread-head">
                                <ThreadIcon />
                                <h2>Community conversation</h2>

                                {currentStatus && (
                                    <span className={`pd-status pd-status--${currentStatus}`}>
                                        <i />
                                        {STATUS_LABELS[currentStatus] || currentStatus}
                                    </span>
                                )}
                            </div>

                            <div className="pd-thread-sub">
                                <label className="pd-sort">
                                    <span className="pd-sr-only">Sort comments</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(event) => {
                                            setSortOrder(event.target.value);
                                            setVisibleCount(PAGE_STEP);
                                        }}
                                    >
                                        <option value="oldest">Sort: Oldest first</option>
                                        <option value="newest">Sort: Newest first</option>
                                    </select>
                                </label>
                            </div>

                            {error && (
                                <div className="pd-alert pd-alert--error" role="alert">
                                    <span>{error}</span>
                                    <button type="button" onClick={loadDiscussions}>
                                        Try again
                                    </button>
                                </div>
                            )}

                            <div className="pd-comments" aria-busy={loading}>
                                {loading ? (
                                    SKELETON_ROWS.map((i) => (
                                        <div className="pd-comment pd-skel-comment" key={i} style={{ "--i": i }}>
                                            <span className="pd-avatar pd-skel-avatar" />
                                            <div className="pd-comment-body">
                                                <span className="pd-skel w30" />
                                                <span className="pd-skel" />
                                                <span className="pd-skel w60" />
                                            </div>
                                        </div>
                                    ))
                                ) : topLevelMessages.length === 0 ? (
                                    <div className="pd-empty pd-empty--inline">
                                        <EmptyChatArt />
                                        <h3>Start the conversation</h3>
                                        <p>
                                            No comments yet. Share a useful update or ask the
                                            first question.
                                        </p>
                                    </div>
                                ) : (
                                    shownMessages.map((item, index) =>
                                        renderMessage(item, false, index)
                                    )
                                )}
                            </div>

                            {hiddenCount > 0 && (
                                <button
                                    type="button"
                                    className="pd-load-more"
                                    onClick={() => setVisibleCount((count) => count + PAGE_STEP)}
                                >
                                    ↓ Load {Math.min(hiddenCount, PAGE_STEP)} more{" "}
                                    {Math.min(hiddenCount, PAGE_STEP) === 1 ? "comment" : "comments"}
                                </button>
                            )}
                        </section>

                        {/* ---------- composer ---------- */}
                        <form
                            className="pd-card pd-composer"
                            onSubmit={handleSubmit}
                            ref={composerRef}
                            style={{ "--d": "0.12s" }}
                        >
                            <h2>Add to the conversation</h2>

                            {replyTo && (
                                <div className="pd-replying">
                                    <span>
                                        Replying to{" "}
                                        <strong>{replyTo.author_name || "community member"}</strong>
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setReplyTo(null)}
                                        aria-label="Cancel reply"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            <div className="pd-field">
                                <textarea
                                    id="pd-message"
                                    aria-label={replyTo ? "Your reply" : "Your message"}
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder={
                                        replyTo
                                            ? "Write a helpful reply..."
                                            : "Share an update or ask a question..."
                                    }
                                    rows={4}
                                    maxLength={10000}
                                    disabled={submitting}
                                    required
                                />

                                <span className="pd-count">{message.length}/10,000</span>
                            </div>

                            {attachment && (
                                <div className="pd-attached">
                                    <span>📎 {attachment.name}</span>
                                    <button
                                        type="button"
                                        aria-label="Remove attachment"
                                        onClick={() => {
                                            setAttachment(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {notice && (
                                <div className="pd-alert pd-alert--success" role="status">
                                    ✓ {notice}
                                </div>
                            )}

                            <div className="pd-composer-actions">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="pd-sr-only"
                                    id="pd-attach"
                                    onChange={(event) =>
                                        setAttachment(event.target.files?.[0] || null)
                                    }
                                />

                                <button
                                    type="button"
                                    className="pd-attach-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting}
                                >
                                    <span aria-hidden="true">📎</span> Attach evidence
                                </button>

                                <button
                                    type="submit"
                                    className="pd-post-button"
                                    disabled={submitting || !message.trim()}
                                >
                                    {submitting
                                        ? "Posting..."
                                        : replyTo
                                            ? "Post reply"
                                            : "Post comment"}
                                </button>
                            </div>

                            <label className="pd-check">
                                <input
                                    type="checkbox"
                                    checked={notify}
                                    onChange={(event) => setNotify(event.target.checked)}
                                />
                                <span className="pd-check-box" aria-hidden="true">✓</span>
                                Notify me about replies to this discussion
                            </label>
                        </form>
                    </div>

                    {/* ---------- side column ---------- */}
                    <aside className="pd-side">

                        <article className="pd-card pd-side-card" style={{ "--d": "0.1s" }}>
                            <div className="pd-side-head">
                                <h3>Issue status</h3>
                                {currentStatus && (
                                    <span className={`pd-status pd-status--${currentStatus}`}>
                                        <i />
                                        {STATUS_LABELS[currentStatus] || currentStatus}
                                    </span>
                                )}
                            </div>

                            <div className="pd-progress-row">
                                <span>Resolution progress</span>
                                <strong>{progress}%</strong>
                            </div>

                            <div
                                className={`pd-progress ${currentStatus === "rejected" ? "is-rejected" : ""}`}
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow={progress}
                                aria-label="Resolution progress"
                            >
                                <span style={{ width: `${progress}%` }} />
                            </div>

                            <ol className="pd-checkpoints">
                                {CHECKPOINTS.map(([label, needed], index) => {
                                    const done = currentStatus && lifecycleIndex >= needed &&
                                        currentStatus !== "rejected" ||
                                        (currentStatus === "rejected" && needed === 0);

                                    return (
                                        <li
                                            key={label}
                                            className={done ? "done" : ""}
                                            style={{ "--i": index }}
                                        >
                                            <span className="pd-checkpoint-dot">{done ? "✓" : ""}</span>
                                            <small>{label}</small>
                                        </li>
                                    );
                                })}
                            </ol>
                        </article>

                        <article className="pd-card pd-side-card" style={{ "--d": "0.16s" }}>
                            <KindArt />
                            <h3>Keep it constructive</h3>
                            <p>
                                Be respectful and stay focused on the problem. Do not share
                                anyone's private contact details.
                            </p>
                            <p className="pd-muted">
                                Use "Report inappropriate content" on a comment to send it to
                                the moderation queue.
                            </p>
                        </article>

                        <article className="pd-card pd-side-card" style={{ "--d": "0.22s" }}>
                            <h3>Issue contacts</h3>

                            <ul className="pd-contacts">
                                <li>
                                    <span className="pd-avatar pd-avatar--team" aria-hidden="true">
                                        {initials(organization || "Team")}
                                    </span>
                                    <div>
                                        <strong>{organization || "Not yet assigned"}</strong>
                                        <small>Responsible team</small>
                                    </div>
                                </li>

                                {reporter && (
                                    <li>
                                        <span className="pd-avatar pd-avatar--you" aria-hidden="true">
                                            {initials(reporter)}
                                        </span>
                                        <div>
                                            <strong>{reporter}</strong>
                                            <small>Reporting community member</small>
                                        </div>
                                    </li>
                                )}
                            </ul>

                            <span className="pd-public-chip"><i /> Public discussion</span>
                        </article>

                        <article className="pd-assistant" style={{ "--d": "0.28s" }}>
                            <div className="pd-assistant-head">
                                <span className="pd-assistant-orb" aria-hidden="true">✦</span>
                                <strong>Civic assistant</strong>
                                <span className="pd-planned">PLANNED</span>
                            </div>
                            <SparkArt />
                            <p>
                                Suggested prompts can help clarify an update. They do not
                                publish comments or make decisions on your behalf.
                            </p>
                        </article>
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default ProblemDiscussion;