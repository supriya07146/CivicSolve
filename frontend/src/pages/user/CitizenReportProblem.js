import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import LocationPicker from "../../components/LocationPicker";
import {
  getProblemCategories,
  getMyProblemDrafts,
  getProblemDraft,
  createProblemDraft,
  updateProblemDraft,
  deleteProblemDraft,
  uploadProblemDraftAttachment,
  submitProblemDraft,
  generateAIProblemSuggestions,
} from "../../services/api";
import "../../styles/user/CitizenReportProblem.css";
import { useToast } from "../../components/toast/ToastContext";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  location: "",
  latitude: null,
  longitude: null,
  priority: "medium",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}


/* =========================================================
   SMART SUGGESTION (runs in the browser, keyword based)
   ========================================================= */

const HINT_GROUPS = [
  {
    names: ["water", "pipe", "drain", "sewer"],
    words: ["water", "leak", "pipe", "tap", "drain", "sewage", "sewer", "overflow", "flood", "manhole"],
  },
  {
    names: ["road", "street", "traffic", "transport"],
    words: ["road", "pothole", "pavement", "footpath", "crack", "bridge", "traffic", "signal", "speed breaker"],
  },
  {
    names: ["electric", "light", "power"],
    words: ["streetlight", "street light", "lamp", "light", "power", "electric", "wire", "pole", "transformer", "outage", "cable"],
  },
  {
    names: ["waste", "garbage", "sanitation", "clean"],
    words: ["garbage", "trash", "waste", "litter", "dump", "dustbin", "smell", "stink", "sweeping"],
  },
  {
    names: ["park", "tree", "garden", "environment"],
    words: ["tree", "park", "garden", "branch", "playground", "bench", "pollution", "smoke"],
  },
  {
    names: ["noise"],
    words: ["noise", "loud", "music", "speaker", "honking"],
  },
  {
    names: ["safety", "security", "crime"],
    words: ["unsafe", "theft", "robbery", "harass", "crime", "fight", "stray"],
  },
];

const URGENT_WORDS = [
  "fire", "accident", "injur", "collapse", "live wire", "exposed wire",
  "electrocut", "emergency", "gas leak", "life threatening",
];
const HIGH_WORDS = [
  "leak", "overflow", "flood", "blocked", "no water", "outage", "burst",
  "sewage", "hazard", "unsafe", "danger", "children", "elderly", "broken",
];
const LOW_WORDS = ["minor", "small", "cosmetic", "faded", "paint", "slightly"];

function hasWord(text, word) {
  return new RegExp(`\\b${word}`, "i").test(text);
}

function suggestFromText(text, categories) {
  const t = String(text || "").toLowerCase();

  if (t.trim().length < 15) return null;

  let bestCategory = null;

  categories.forEach((category) => {
    const name = String(category.name || "").toLowerCase();
    let score = 0;

    name
      .split(/[^a-z]+/)
      .filter((word) => word.length > 3)
      .forEach((word) => {
        if (hasWord(t, word)) score += 2;
      });

    HINT_GROUPS.forEach((group) => {
      if (group.names.some((n) => name.includes(n))) {
        group.words.forEach((word) => {
          if (hasWord(t, word)) score += 1;
        });
      }
    });

    if (score > 0 && (!bestCategory || score > bestCategory.score)) {
      bestCategory = { id: String(category.id), name: category.name, score };
    }
  });

  let priority = null;

  if (URGENT_WORDS.some((w) => hasWord(t, w))) priority = "urgent";
  else if (HIGH_WORDS.some((w) => hasWord(t, w))) priority = "high";
  else if (LOW_WORDS.some((w) => hasWord(t, w))) priority = "low";

  if (!bestCategory && !priority) return null;

  return { category: bestCategory, priority };
}

function getExt(name) {
  return (String(name).split(".").pop() || "").slice(0, 4).toUpperCase();
}


/* =========================================================
   ICONS + ILLUSTRATIONS
   ========================================================= */

const Svg = ({ children, size = 18, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

const SearchIcon = () => (
  <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>
);
const PinIcon = () => (
  <Svg>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);
const ClipIcon = () => (
  <Svg>
    <path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L9.5 17.3a1.7 1.7 0 01-2.4-2.4L15 7" />
  </Svg>
);
const ImageIcon = () => (
  <Svg size={22}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
  </Svg>
);
const CameraIcon = () => (
  <Svg size={22}>
    <path d="M4 8.5A2.5 2.5 0 016.5 6H8l1.3-2h5.4L16 6h1.5A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z" />
    <circle cx="12" cy="12.5" r="3.3" />
  </Svg>
);
const DocIcon = () => (
  <Svg size={22}>
    <path d="M7 3.5h7l4 4v13H7z" />
    <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
  </Svg>
);
const CheckIcon = ({ size = 14 }) => (
  <Svg size={size} strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
);
const SparkIcon = () => (
  <Svg size={17}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);
const ShieldIcon = () => (
  <Svg size={17}><path d="M12 3l7 3v5.5c0 4.3-3 7.6-7 9.5-4-1.9-7-5.2-7-9.5V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>
);
const CameraTipIcon = () => (
  <Svg size={16}><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" /></Svg>
);
const ClockIcon = () => (
  <Svg size={16}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);

/* wide city scene shown in the hero */
const WINDOWS = [
  [18, 80], [34, 80], [18, 98], [34, 98], [18, 114],
  [64, 54], [78, 54], [64, 72], [78, 72], [64, 90], [78, 90], [64, 108],
  [104, 94], [116, 94], [104, 112],
  [364, 68], [380, 68], [364, 86], [380, 86], [364, 104],
  [410, 88], [424, 88], [410, 106],
  [448, 106], [460, 106],
];

const HeroArt = () => (
  <svg className="crp-art" viewBox="0 0 480 150" aria-hidden="true">
    <defs>
      <linearGradient id="rpGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id="rpPinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ff5e4" />
        <stop offset="1" stopColor="#12b5a0" />
      </linearGradient>
    </defs>

    {/* sky: sun, stars, clouds */}
    <circle className="crp-art-sun" cx="448" cy="26" r="12" fill="#ffd447" opacity="0.85" />
    <circle className="crp-star" cx="30" cy="14" r="1.5" fill="#fff" />
    <circle className="crp-star crp-star-2" cx="226" cy="12" r="1.3" fill="#fff" />
    <circle className="crp-star crp-star-3" cx="390" cy="16" r="1.5" fill="#7ff5e4" />
    <circle className="crp-star crp-star-4" cx="420" cy="46" r="1.2" fill="#fff" />

    <g className="crp-art-cloud" fill="#ffffff" opacity="0.16">
      <ellipse cx="64" cy="26" rx="22" ry="7" />
      <ellipse cx="53" cy="21" rx="11" ry="7" />
      <ellipse cx="76" cy="20" rx="12" ry="8" />
    </g>

    {/* buildings */}
    <g fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.22)" strokeWidth="1">
      <rect x="10" y="70" width="40" height="58" rx="5" />
      <rect x="56" y="44" width="36" height="84" rx="5" />
      <rect x="96" y="84" width="30" height="44" rx="5" />
      <rect x="356" y="58" width="40" height="70" rx="5" />
      <rect x="402" y="78" width="34" height="50" rx="5" />
      <rect x="442" y="96" width="28" height="32" rx="5" />
    </g>

    {WINDOWS.map(([x, y], i) => (
      <rect
        key={`${x}-${y}`}
        className="crp-win"
        x={x}
        y={y}
        width="8"
        height="8"
        rx="2"
        fill="#7ff5e4"
        style={{ animationDelay: `${(i % 7) * 0.7}s` }}
      />
    ))}

    {/* tree */}
    <rect x="145" y="108" width="4" height="20" rx="2" fill="rgba(255,255,255,0.25)" />
    <circle cx="147" cy="102" r="11" fill="rgba(20,211,172,0.35)" />

    {/* street light with glow */}
    <path className="crp-glow" d="M262 69 L250 128 L284 128 L272 69z" fill="#ffd447" opacity="0.12" />
    <rect x="248" y="64" width="4" height="64" rx="2" fill="rgba(255,255,255,0.35)" />
    <path d="M250 66 H266" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
    <rect x="262" y="64" width="12" height="5" rx="2.5" fill="#ffd447" />

    {/* road */}
    <rect x="0" y="128" width="480" height="16" fill="rgba(255,255,255,0.08)" />
    <rect x="0" y="127" width="480" height="2" fill="rgba(255,255,255,0.2)" />
    <line className="crp-road-line" x1="0" y1="136" x2="480" y2="136" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeDasharray="10 8" />

    {/* pothole + cone */}
    <ellipse cx="308" cy="136" rx="13" ry="3.6" fill="rgba(0,0,0,0.38)" />
    <path d="M330 128 L336 110 L342 128z" fill="#f5a524" />
    <rect x="332" y="119" width="8" height="3" fill="#fff" opacity="0.85" />

    {/* car driving by */}
    <g className="crp-car">
      <rect x="0" y="126" width="30" height="9" rx="3" fill="#7ff5e4" opacity="0.85" />
      <rect x="7" y="119" width="15" height="9" rx="3" fill="#7ff5e4" opacity="0.65" />
      <circle cx="7" cy="136" r="3.2" fill="#06162a" stroke="#fff" strokeWidth="1" />
      <circle cx="23" cy="136" r="3.2" fill="#06162a" stroke="#fff" strokeWidth="1" />
    </g>

    {/* pulse rings + pin */}
    <ellipse className="crp-ring crp-ring-1" cx="196" cy="132" rx="22" ry="6.5" fill="none" stroke="#7ff5e4" strokeWidth="1.5" />
    <ellipse className="crp-ring crp-ring-2" cx="196" cy="132" rx="22" ry="6.5" fill="none" stroke="#7ff5e4" strokeWidth="1.5" />

    <g className="crp-art-pin">
      <path
        d="M196 126 C196 126 178 104 178 88 a18 18 0 0 1 36 0 C214 104 196 126 196 126z"
        fill="url(#rpPinGrad)"
      />
      <circle cx="196" cy="88" r="7" fill="#06162a" />
      <circle cx="196" cy="88" r="3" fill="#7ff5e4" />
    </g>

    {/* floating report card */}
    <g className="crp-art-card">
      <rect x="114" y="6" width="96" height="42" rx="11" fill="url(#rpGlass)" stroke="rgba(255,255,255,0.3)" />
      <circle cx="133" cy="25" r="8" fill="#7ff5e4" />
      <path d="M129 25.2l2.9 2.9 5-5.2" fill="none" stroke="#06162a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="147" y="19" width="50" height="5.5" rx="2.75" fill="rgba(255,255,255,0.75)" />
      <rect x="147" y="29" width="34" height="5.5" rx="2.75" fill="rgba(255,255,255,0.4)" />
    </g>

    {/* floating notification chip */}
    <g className="crp-art-bell">
      <rect x="300" y="14" width="74" height="30" rx="15" fill="url(#rpGlass)" stroke="rgba(255,255,255,0.3)" />
      <circle cx="318" cy="29" r="9" fill="rgba(127,245,228,0.25)" />
      <path d="M314.5 31.5h7l-1-1.4v-3a2.5 2.5 0 00-5 0v3zM317 33.2a1.2 1.2 0 002 0" fill="none" stroke="#7ff5e4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="322" cy="24" r="2.4" fill="#f5a524" />
      <rect x="332" y="25" width="30" height="4.5" rx="2.25" fill="rgba(255,255,255,0.7)" />
      <rect x="332" y="33" width="20" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
    </g>
  </svg>
);

/* small community skyline for the dark sidebar card */
const DarkArt = () => (
  <svg className="crp-dark-art" viewBox="0 0 260 56" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs>
      <linearGradient id="rpPinGrad2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ff5e4" />
        <stop offset="1" stopColor="#12b5a0" />
      </linearGradient>
    </defs>
    <g fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)">
      <rect x="6" y="26" width="30" height="30" rx="4" />
      <rect x="44" y="12" width="26" height="44" rx="4" />
      <path d="M80 56V32l22-14 22 14v24z" />
      <rect x="136" y="22" width="30" height="34" rx="4" />
      <rect x="174" y="8" width="24" height="48" rx="4" />
      <path d="M206 56V34l20-12 20 12v22z" />
    </g>
    <rect className="crp-win" x="14" y="34" width="7" height="7" rx="2" fill="#7ff5e4" />
    <rect className="crp-win" x="52" y="22" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "0.8s" }} />
    <rect className="crp-win" x="52" y="36" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "1.6s" }} />
    <rect className="crp-win" x="98" y="38" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "2.2s" }} />
    <rect className="crp-win" x="144" y="32" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "0.4s" }} />
    <rect className="crp-win" x="182" y="20" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "1.2s" }} />
    <rect className="crp-win" x="182" y="34" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "2s" }} />
    <rect className="crp-win" x="222" y="40" width="7" height="7" rx="2" fill="#7ff5e4" style={{ animationDelay: "2.8s" }} />
    <g className="crp-art-pin">
      <path d="M121 40 C121 40 112 29 112 21 a9 9 0 0 1 18 0 C130 29 121 40 121 40z" fill="url(#rpPinGrad2)" />
      <circle cx="121" cy="21" r="3.4" fill="#06162a" />
    </g>
  </svg>
);

const DraftsArt = () => (
  <svg className="crp-drafts-art" viewBox="0 0 120 90" aria-hidden="true">
    <rect x="30" y="14" width="56" height="68" rx="9" fill="#e6f7f3" stroke="#bfe3dc" />
    <rect x="40" y="28" width="36" height="5" rx="2.5" fill="#9fd6cb" />
    <rect x="40" y="40" width="28" height="5" rx="2.5" fill="#c4e6df" />
    <rect x="40" y="52" width="32" height="5" rx="2.5" fill="#c4e6df" />
    <g className="crp-drafts-pencil">
      <rect x="78" y="40" width="9" height="34" rx="3" transform="rotate(28 82 57)" fill="#12b5a0" />
      <path d="M84 74l-5 6 8-2z" fill="#0a7f78" transform="rotate(0)" />
    </g>
  </svg>
);


/* =========================================================
   PAGE
   ========================================================= */

function CitizenReportProblem() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialDraftId = searchParams.get("draft");
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(
    initialDraftId ? Number(initialDraftId) : null
  );
  const [attachments, setAttachments] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [successModal, setSuccessModal] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadDrafts = useCallback(async () => {
    const response = await getMyProblemDrafts();
    setDrafts(response.drafts || []);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const categoryResponse = await getProblemCategories();
      setCategories(categoryResponse.categories || []);

      const draftResponse = await getMyProblemDrafts();
      setDrafts(draftResponse.drafts || []);

      if (initialDraftId) {
        try {
          const response = await getProblemDraft(initialDraftId);
          const draft = response.draft;

          setDraftId(draft.id);
          setForm({
            title: draft.title || "",
            description: draft.description || "",
            category: draft.category ? String(draft.category) : "",
            location: draft.location || "",
            latitude: draft.latitude ?? null,
            longitude: draft.longitude ?? null,
            priority: draft.priority || "medium",
          });
          setAttachments(draft.attachments || []);
        } catch {
          setDraftId(null);
          navigate(location.pathname, { replace: true });
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [initialDraftId, location.pathname, navigate]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Close the success popup with the Escape key
  useEffect(() => {
    if (!successModal) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") handleViewMyProblems();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successModal]);

  /* ---------- progress (drives the stepper) ---------- */

  const checks = {
    title: form.title.trim().length >= 5,
    description: form.description.trim().length >= 10,
    category: Boolean(form.category),
    location: Boolean(form.location.trim()),
  };

  const doneCount = Object.values(checks).filter(Boolean).length;
  const progress = Math.round((doneCount / 4) * 100);
  const isReady = doneCount === 4;


  /* ---------- smart suggestion ---------- */

  const suggestion = useMemo(
    () => suggestFromText(`${form.title} ${form.description}`, categories),
    [form.title, form.description, categories]
  );

  const suggestCategory =
    suggestion && suggestion.category && !form.category
      ? suggestion.category
      : null;

  const suggestPriority =
    suggestion &&
      suggestion.priority &&
      form.priority === "medium" &&
      suggestion.priority !== "medium"
      ? suggestion.priority
      : null;

  const showHint = !hintDismissed && (suggestCategory || suggestPriority);

  const applyHint = () => {
    setForm((previous) => ({
      ...previous,
      category: suggestCategory ? suggestCategory.id : previous.category,
      priority: suggestPriority || previous.priority,
    }));

    setFieldErrors((previous) => ({ ...previous, category: "" }));
  };

  /* ---------- AI SMART PROBLEM REPORTING ---------- */

  const handleGenerateAISuggestions = async () => {
    if (form.description.trim().length < 10) {
      showToast(
        "warning",
        "Description Required",
        "Please enter at least 10 characters in the problem description."
      );
      return;
    }

    setAiLoading(true);
    setAiSuggestions(null);
    setError("");

    try {
      const response = await generateAIProblemSuggestions(
        form.description.trim()
      );

      const suggestions = response.suggestions;

      if (!suggestions) {
        throw new Error("The AI did not return any suggestions.");
      }

      setAiSuggestions(suggestions);

      showToast(
        "success",
        "AI Suggestions Generated",
        "Review the suggestions and apply the ones you find useful."
      );
    } catch (err) {
      const errorMessage = getErrorMessage(err);

      setError(errorMessage);

      showToast(
        "error",
        "AI Suggestions Unavailable",
        errorMessage
      );
    } finally {
      setAiLoading(false);
    }
  };

  const applyAISuggestions = () => {
    if (!aiSuggestions) return;

    const matchedCategory = categories.find(
      (category) =>
        category.name?.trim().toLowerCase() ===
        aiSuggestions.category?.trim().toLowerCase()
    );

    setForm((previous) => ({
      ...previous,
      title: aiSuggestions.title?.trim() || previous.title,
      description:
        aiSuggestions.description?.trim() || previous.description,
      category: matchedCategory
        ? String(matchedCategory.id)
        : previous.category,
      priority: [
        "low",
        "medium",
        "high",
        "urgent",
      ].includes(aiSuggestions.priority)
        ? aiSuggestions.priority
        : previous.priority,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      title: "",
      description: "",
      category: "",
    }));

    setAiSuggestions(null);

    showToast(
      "success",
      "Suggestions Applied",
      "You can still edit all the suggested fields before submitting."
    );
  };

  /* ---------- form handlers ---------- */

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setError("");
    setMessage("");
  };

  const updateLocation = (selected) => {
    setForm((previous) => ({
      ...previous,
      location: selected.location_name || "",
      latitude: selected.latitude ?? null,
      longitude: selected.longitude ?? null,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      location: "",
    }));

    setError("");
  };

  const validateForSubmission = () => {
    const errors = {};

    if (form.title.trim().length < 5) {
      errors.title = "Enter a title with at least 5 characters.";
    }

    if (form.description.trim().length < 10) {
      errors.description =
        "Enter a description with at least 10 characters.";
    }

    if (!form.category) {
      errors.category = "Please select a category.";
    }

    if (!form.location.trim()) {
      errors.location = "Please select your location.";
    }

    if (
      (form.latitude === null) !==
      (form.longitude === null)
    ) {
      errors.location =
        "Please select your location again so both coordinates are available.";
    }

    if (!confirmed) {
      errors.confirm = "Please confirm the report before submitting.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getDraftPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category ? Number(form.category) : null,
    location: form.location.trim(),
    latitude:
      form.latitude !== null &&
        form.latitude !== undefined &&
        form.latitude !== ""
        ? Number(Number(form.latitude).toFixed(6))
        : null,
    longitude:
      form.longitude !== null &&
        form.longitude !== undefined &&
        form.longitude !== ""
        ? Number(Number(form.longitude).toFixed(6))
        : null,
    priority: form.priority,
  });

  const saveDraft = async (showMessage = true) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      let savedDraftId = draftId;
      const payload = getDraftPayload();

      if (savedDraftId) {
        await updateProblemDraft(savedDraftId, payload);
      } else {
        const response = await createProblemDraft(payload);
        savedDraftId = response.draft.id;
        setDraftId(savedDraftId);
      }

      for (const file of files) {
        await uploadProblemDraftAttachment(savedDraftId, file);
      }

      setFiles([]);

      if (showMessage) {
        const updatedDraft = await getProblemDraft(savedDraftId);
        setAttachments(updatedDraft.draft.attachments || []);
        await loadDrafts();
        setMessage("Your draft has been saved successfully.");
        showToast(
          "success",
          "Draft Saved Successfully",
          "Your problem report has been saved."
        );
      }

      return savedDraftId;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    await saveDraft();
  };

  const handleSubmitProblem = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!validateForSubmission()) {
      setError("Please correct the highlighted fields before submitting.");
      showToast(
        "warning",
        "Action Required",
        "Please correct the highlighted fields before submitting."
      );
      return;
    }

    setSubmitting(true);

    try {
      // Persist the latest form values and evidence first.
      const savedId = await saveDraft(false);

      if (!savedId) {
        return;
      }

      const response = await submitProblemDraft(savedId);
      showToast(
        "success",
        "Problem Reported Successfully",
        response.message || "Your report has been submitted."
      );
      // Clear the form
      setForm(EMPTY_FORM);
      setDraftId(null);
      setAttachments([]);
      setFiles([]);
      setFieldErrors({});
      setConfirmed(false);
      setAiSuggestions(null);

      try {
        await loadDrafts();
      } catch {
        // Continue even if draft list reload fails
      }

      // Show the success popup (no immediate redirect)
      setSuccessModal(
        response.message || "Your problem has been reported successfully."
      );
    } catch (err) {
      const errorMessage = getErrorMessage(err);

      setError(errorMessage);

      showToast(
        "error",
        "Unable to Report Problem",
        errorMessage
      );
    } finally {
      setSubmitting(false);
    }
  };

  // stay on whichever route this page is mounted on
  const handleResumeDraft = (id) => {
    navigate(`${location.pathname}?draft=${id}`);
  };

  const handleNewReport = () => {
    setDraftId(null);
    setForm(EMPTY_FORM);
    setAttachments([]);
    setFiles([]);
    setFieldErrors({});
    setConfirmed(false);
    setHintDismissed(false);
    setAiSuggestions(null);
    setError("");
    setMessage("");
    navigate(location.pathname);
  };

  /* ---------- success popup actions ---------- */

  const handleViewMyProblems = () => {
    setSuccessModal("");
    navigate("/user/my-problems", {
      state: { successMessage: "Problem submitted successfully." },
    });
  };

  const handleReportAnother = () => {
    setSuccessModal("");
    handleNewReport();
  };

  const handleDeleteDraft = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this saved draft? This action cannot be undone."
    );

    if (!confirmDelete) return;

    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      await deleteProblemDraft(id);

      showToast(
        "success",
        "Draft Deleted Successfully",
        "Your saved draft has been deleted."
      );

      if (Number(draftId) === Number(id)) {
        setDraftId(null);
        setForm(EMPTY_FORM);
        setAttachments([]);
        setFiles([]);
        setConfirmed(false);
        navigate(location.pathname);
      }

      await loadDrafts();
      setMessage("Draft deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };


  /* ---------- evidence files ---------- */

  const processFiles = (selectedFiles) => {
    const allowedExtensions = [
      ".jpg", ".jpeg", ".png", ".webp",
      ".mp4", ".webm", ".mov",
    ];

    const currentCount = attachments.length + files.length;
    const remaining = Math.max(0, 5 - currentCount);
    const accepted = [];
    const rejected = [];

    for (const file of selectedFiles) {
      const extension = `.${file.name.split(".").pop().toLowerCase()}`;
      const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(
        extension
      );
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

      if (!allowedExtensions.includes(extension)) {
        rejected.push(`${file.name}: unsupported file type`);
      } else if (file.size > maxSize) {
        rejected.push(
          `${file.name}: ${isImage ? "10 MB" : "50 MB"} size limit exceeded`
        );
      } else {
        accepted.push(file);
      }
    }

    const limitedFiles = accepted.slice(0, remaining);

    if (accepted.length > remaining) {
      rejected.push("A draft can contain at most 5 attachments.");
    }

    setFiles((previous) => [...previous, ...limitedFiles]);

    if (rejected.length) {
      setError(rejected.join(". "));
    } else {
      setError("");
    }
  };

  const handleFilesChange = (event) => {
    processFiles(Array.from(event.target.files || []));

    // Allow selecting the same file again after removing it.
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    processFiles(Array.from(event.dataTransfer.files || []));
  };

  const removePendingFile = (index) => {
    setFiles((previous) => previous.filter((_, i) => i !== index));
  };

  const selectedLocation = {
    location_name: form.location,
    latitude: form.latitude,
    longitude: form.longitude,
  };

  const totalFiles = attachments.length + files.length;

  if (loading) {
    return (
      <div className="crp-page">
        <div className="crp-loading">
          <span className="crp-spinner" />
          Loading report form...
        </div>
      </div>
    );
  }

  return (
    <main className="crp-page">

      {/* =====================  HERO  ===================== */}
      <section className="crp-hero">

        <div className="crp-hero-bg" aria-hidden="true">
          <span className="crp-blob crp-blob-1" />
          <span className="crp-blob crp-blob-2" />
          <span className="crp-petal crp-petal-1" />
          <span className="crp-petal crp-petal-2" />
          <span className="crp-petal crp-petal-3" />
          <span className="crp-petal crp-petal-4" />
          <span className="crp-petal crp-petal-5" />
        </div>

        <div className="crp-hero-inner">

          <div className="crp-hero-top">
            <div className="crp-hero-copy">
              <span className="crp-eyebrow">CITIZEN SERVICES · REPORT</span>
              <h1>
                Report a <em>local problem</em>
              </h1>
              <p>
                Tell us what's happening. Clear details help the right team respond.
              </p>
            </div>

            <div className="crp-hero-art">
              <HeroArt />
            </div>
          </div>

          <div className="crp-steps-row">

            <div className="crp-steps" role="list">
              <div className={`crp-step ${isReady ? "done" : "active"}`} role="listitem">
                <span className="crp-step-dot">
                  {isReady ? <CheckIcon size={13} /> : "1"}
                </span>
                <span className="crp-step-label">Problem details</span>
              </div>

              <div className="crp-step-line" title={`${doneCount} of 4 required fields done`}>
                <i style={{ width: `${progress}%` }} />
              </div>

              <div className={`crp-step ${isReady ? "active" : ""}`} role="listitem">
                <span className="crp-step-dot">2</span>
                <span className="crp-step-label">Review &amp; submit</span>
              </div>
            </div>

            <div className="crp-hero-actions">
              <span className="crp-saved-pill">
                <b className={draftId ? "on" : ""} />
                {draftId ? "Draft saved" : "Not saved yet"} · Required fields marked *
              </span>

              <button
                type="button"
                className="crp-ghost-button"
                onClick={handleNewReport}
              >
                + New report
              </button>
            </div>

          </div>

        </div>

        <svg className="crp-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
        </svg>

      </section>


      {/* =====================  BODY  ===================== */}
      <div className="crp-body">

        <form className="crp-main" onSubmit={handleSubmitProblem} noValidate>

          {error && (
            <div className="crp-alert crp-alert-error" role="alert">
              <strong>Something needs your attention</strong>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="crp-alert crp-alert-success" role="status">
              {message}
            </div>
          )}

          {/* ---------- 01 · what needs attention ---------- */}
          <section className="crp-card" style={{ "--d": "0.05s" }}>

            <div className="crp-card-heading">
              <span className="crp-card-icon"><SearchIcon /></span>
              <h2>What needs attention?</h2>
              <span className="crp-tag">Required *</span>
            </div>

            <div className="crp-field">
              <label htmlFor="crp-title">Problem title *</label>
              <input
                id="crp-title"
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. Streetlight not working"
                maxLength={200}
                aria-invalid={Boolean(fieldErrors.title)}
              />
              {fieldErrors.title && (
                <small className="crp-field-error">{fieldErrors.title}</small>
              )}
            </div>

            <div className="crp-field">
              <label htmlFor="crp-description">Description *</label>
              <textarea
                id="crp-description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Explain what happened, where it is, and how it affects the community."
                rows={5}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              <div className="crp-field-footer">
                {fieldErrors.description && (
                  <small className="crp-field-error">{fieldErrors.description}</small>
                )}
                <small>{form.description.length} characters</small>
              </div>
            </div>

            {/* ---------- AI SMART REPORTING ---------- */}
            <div className={`crp-ai ${aiLoading ? "is-loading" : ""}`}>
              <div className="crp-ai-head">
                <span className="crp-ai-badge"><SparkIcon /></span>

                <div className="crp-ai-head-text">
                  <h3>
                    AI Smart Reporting <em>Beta</em>
                  </h3>
                  <p>
                    Improve your report, get a category and priority suggestion, and
                    see what details are missing.
                  </p>
                </div>

                <button
                  type="button"
                  className="crp-ai-button"
                  onClick={handleGenerateAISuggestions}
                  disabled={aiLoading || form.description.trim().length < 10}
                >
                  {aiLoading ? (
                    <><span className="crp-ai-spin" /> Analysing…</>
                  ) : (
                    <><SparkIcon /> Generate suggestions</>
                  )}
                </button>
              </div>

              {!aiSuggestions && !aiLoading && form.description.trim().length < 10 && (
                <small className="crp-ai-help">
                  Write at least 10 characters in the description to enable AI suggestions.
                </small>
              )}

              {aiLoading && (
                <div className="crp-ai-skeleton" aria-hidden="true">
                  <i style={{ width: "40%" }} />
                  <i style={{ width: "92%" }} />
                  <i style={{ width: "76%" }} />
                </div>
              )}

              {aiSuggestions && !aiLoading && (
                <div className="crp-ai-result">
                  <div className="crp-ai-result-top">
                    <span className="crp-ai-result-title">AI-generated suggestions</span>
                    <span className="crp-ai-note">Review before applying</span>
                  </div>

                  <div className="crp-ai-chips">
                    <div className="crp-ai-chip">
                      <small>Category</small>
                      <b>{aiSuggestions.category || "Select manually"}</b>
                    </div>
                    <div className={`crp-ai-chip prio-${aiSuggestions.priority}`}>
                      <small>Priority</small>
                      <b>
                        <i className="crp-ai-dot" />
                        {PRIORITY_LABELS[aiSuggestions.priority] || aiSuggestions.priority}
                      </b>
                    </div>
                  </div>

                  <div className="crp-ai-block">
                    <small>Suggested title</small>
                    <p className="crp-ai-title">{aiSuggestions.title}</p>
                  </div>

                  <div className="crp-ai-block">
                    <small>Improved description</small>
                    <p>{aiSuggestions.description}</p>
                  </div>

                  {aiSuggestions.reason && (
                    <div className="crp-ai-reason">
                      <strong>Why this suggestion</strong>
                      <p>{aiSuggestions.reason}</p>
                    </div>
                  )}

                  {(aiSuggestions.missing_details?.length > 0 ||
                    aiSuggestions.clarification_questions?.length > 0) && (
                    <div className="crp-ai-lists">
                      {aiSuggestions.missing_details?.length > 0 && (
                        <div className="crp-ai-list warn">
                          <strong>Missing details</strong>
                          <ul>
                            {aiSuggestions.missing_details.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiSuggestions.clarification_questions?.length > 0 && (
                        <div className="crp-ai-list info">
                          <strong>Questions to consider</strong>
                          <ul>
                            {aiSuggestions.clarification_questions.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="crp-ai-actions">
                    <button type="button" className="crp-ai-apply" onClick={applyAISuggestions}>
                      <CheckIcon size={14} /> Apply suggestions
                    </button>
                    <button type="button" className="crp-ai-dismiss" onClick={() => setAiSuggestions(null)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="crp-row">

              <div className="crp-field">
                <label htmlFor="crp-category">Category *</label>
                <select
                  id="crp-category"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.category)}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <small className="crp-field-error">{fieldErrors.category}</small>
                )}
                {!categories.length && (
                  <small className="crp-muted">
                    No active categories are available right now.
                  </small>
                )}
              </div>

              <div className="crp-field">
                <label htmlFor="crp-priority">Priority</label>
                <select
                  id="crp-priority"
                  name="priority"
                  value={form.priority}
                  onChange={updateField}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

            </div>

            {showHint && (
              <div className="crp-hint" role="status">
                <span className="crp-hint-icon"><SparkIcon /></span>

                <div className="crp-hint-body">
                  <strong>Smart suggestion · Not a final decision</strong>
                  <p>
                    {suggestCategory && (
                      <>Suggested category: <b>{suggestCategory.name}</b></>
                    )}
                    {suggestCategory && suggestPriority && " · "}
                    {suggestPriority && (
                      <>Suggested priority: <b>{PRIORITY_LABELS[suggestPriority]}</b></>
                    )}
                    . Based on keywords in your report. You can change it any time.
                  </p>

                  <div className="crp-hint-actions">
                    <button type="button" onClick={applyHint}>Apply</button>
                    <button type="button" className="muted" onClick={() => setHintDismissed(true)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

          </section>


          {/* ---------- 02 · location ---------- */}
          <section className="crp-card" style={{ "--d": "0.15s" }}>

            <div className="crp-card-heading">
              <span className="crp-card-icon pin"><PinIcon /></span>
              <h2>Where is the problem?</h2>
              <span className="crp-tag">Required *</span>
            </div>

            <LocationPicker
              value={selectedLocation}
              onChange={updateLocation}
            />

            {fieldErrors.location && (
              <small className="crp-field-error">{fieldErrors.location}</small>
            )}

          </section>


          {/* ---------- 03 · evidence ---------- */}
          <section className="crp-card" style={{ "--d": "0.25s" }}>

            <div className="crp-card-heading">
              <span className="crp-card-icon clip"><ClipIcon /></span>
              <h2>Evidence</h2>
              <span className="crp-tag soft">{totalFiles}/5 files</span>
            </div>

            <div
              className={`crp-upload-area ${dragging ? "drag" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="crp-upload-tiles" aria-hidden="true">
                <span className="crp-up-tile t1"><ImageIcon /></span>
                <span className="crp-up-tile t2"><CameraIcon /></span>
                <span className="crp-up-tile t3"><DocIcon /></span>
              </div>

              <label className="crp-upload-button">
                <span aria-hidden="true">↑</span> Upload photos or video stills
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
                  multiple
                  onChange={handleFilesChange}
                  disabled={totalFiles >= 5}
                />
              </label>

              <p className="crp-upload-drag">
                {dragging ? "Drop your files here" : "or drag and drop files here"}
              </p>
              <small>JPG, PNG, WEBP · MP4, WEBM, MOV · Images up to 10 MB · Videos up to 50 MB</small>
            </div>

            <p className="crp-upload-note">
              Add a wide view and a close-up. Avoid faces, vehicle plates and
              private information. Evidence is uploaded when you save the draft or submit.
            </p>

            {(attachments.length > 0 || files.length > 0) && (
              <div className="crp-file-list">
                {attachments.map((attachment) => {
                  const name =
                    attachment.file?.split("/").pop() ||
                    `Evidence ${attachment.id}`;

                  return (
                    <div className="crp-file-row" key={attachment.id}>
                      <span className="crp-file-icon">{getExt(name)}</span>
                      <div className="crp-file-info">
                        <strong>{name}</strong>
                        <small>Saved to your draft</small>
                      </div>
                      <span className="crp-file-saved"><CheckIcon size={12} /></span>
                    </div>
                  );
                })}

                {files.map((file, index) => (
                  <div
                    className="crp-file-row pending"
                    key={`${file.name}-${file.size}-${index}`}
                  >
                    <span className="crp-file-icon">{getExt(file.name)}</span>
                    <div className="crp-file-info">
                      <strong>{file.name}</strong>
                      <small>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · Pending upload
                      </small>
                    </div>
                    <button
                      type="button"
                      className="crp-remove-file"
                      onClick={() => removePendingFile(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`crp-confirm ${confirmed ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  setFieldErrors((previous) => ({ ...previous, confirm: "" }));
                }}
              />
              <span className="crp-check-box"><CheckIcon size={13} /></span>
              <span>I confirm this report is accurate and follows the community guidelines.</span>
            </label>

            {fieldErrors.confirm && (
              <small className="crp-field-error">{fieldErrors.confirm}</small>
            )}

            <div className="crp-form-actions">
              <button
                type="submit"
                className="crp-primary-button"
                disabled={saving || submitting}
              >
                {submitting ? "Submitting..." : "Submit problem"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>

              <button
                type="button"
                className="crp-secondary-button"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
              >
                {saving ? "Saving draft..." : "Save draft"}
              </button>
            </div>

            <p className="crp-form-note">
              Saving a draft does not submit your report. Your issue is
              officially submitted only after you select Submit problem.
            </p>

          </section>

        </form>


        {/* =====================  SIDEBAR  ===================== */}
        <aside className="crp-aside">

          <section className="crp-dark-card" style={{ "--d": "0.1s" }}>
            <div className="crp-dark-head">
              <span className="crp-dark-icon"><ShieldIcon /></span>
              <h3>Before you submit</h3>
            </div>

            <ul>
              <li><i /> Include the location, how long it has been happening, and who it affects.</li>
              <li><i className="warn" /> For immediate danger, contact your local emergency service. CivicSolve is not an emergency channel.</li>
              <li><i className="mint" /> After you submit, follow your report's status in My Problems.</li>
            </ul>

            <DarkArt />
          </section>

          <section className="crp-side-card" style={{ "--d": "0.2s" }}>
            <div className="crp-drafts-heading">
              <div>
                <h3>My saved drafts</h3>
                <p>Continue where you left off.</p>
              </div>
              <span className="crp-draft-count">{drafts.length}</span>
            </div>

            {drafts.length === 0 ? (
              <div className="crp-empty-drafts">
                <DraftsArt />
                <p>No saved drafts yet.</p>
                <small>Use Save draft to keep your progress.</small>
              </div>
            ) : (
              <div className="crp-drafts-list">
                {drafts.map((draft) => (
                  <article className="crp-draft-item" key={draft.id}>
                    <div className="crp-draft-item-top">
                      <span className="crp-draft-label">DRAFT</span>
                      <span className="crp-draft-date">
                        {draft.updated_at
                          ? new Date(draft.updated_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <h4>{draft.title?.trim() || "Untitled report"}</h4>
                    <p>
                      {draft.description?.trim()
                        ? draft.description.slice(0, 85)
                        : "No description added yet."}
                      {draft.description?.length > 85 ? "…" : ""}
                    </p>
                    <div className="crp-draft-actions">
                      <button
                        type="button"
                        onClick={() => handleResumeDraft(draft.id)}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="crp-delete-draft"
                        disabled={deletingId === draft.id}
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        {deletingId === draft.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="crp-side-card" style={{ "--d": "0.3s" }}>
            <h3 className="crp-tips-title">Tips for a great report</h3>

            <ul className="crp-tips">
              <li>
                <span className="crp-tip-icon"><CameraTipIcon /></span>
                Wide + close-up photo combinations work best.
              </li>
              <li>
                <span className="crp-tip-icon pin"><PinIcon /></span>
                Pin the exact spot on the map for a faster response.
              </li>
              <li>
                <span className="crp-tip-icon clock"><ClockIcon /></span>
                Mention how long the issue has been present.
              </li>
            </ul>
          </section>

        </aside>

      </div>


      {/* =====================  SUCCESS POPUP  ===================== */}
      {successModal && (
        <div className="crp-modal-backdrop" onClick={handleViewMyProblems}>
          <div
            className="crp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crp-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="crp-modal-check">
              <CheckIcon size={30} />
            </span>

            <h3 id="crp-modal-title">Problem reported successfully!</h3>
            <p>{successModal}</p>
            <p className="crp-modal-sub">
              You can follow its status any time in My Problems.
            </p>

            <div className="crp-modal-actions">
              <button
                type="button"
                className="crp-primary-button"
                onClick={handleViewMyProblems}
              >
                View My Problems <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className="crp-secondary-button"
                onClick={handleReportAnother}
              >
                Report another
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CitizenReportProblem;