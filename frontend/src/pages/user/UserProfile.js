
import React, { useEffect, useRef, useState } from "react";
import {
    getCitizenProfile,
    updateCitizenProfile,
    uploadCitizenProfileImage,
    deleteCitizenProfileImage,
    changeCitizenPassword,
} from "../../services/api";
import "../../styles/user/UserProfile.css";

const FORM_ID = "up-profile-form";
const DJANGO_BASE_URL = "http://127.0.0.1:8000";

const DEFAULT_PREFERENCES = {
    language_preference: "en",
    show_name_publicly: true,
    show_location_publicly: false,
    issue_progress_notifications: true,
    discussion_reply_notifications: true,
    weekly_digest_notifications: false,
};

const LEVELS = [
    { min: 0, label: "New member" },
    { min: 3, label: "Active reporter" },
    { min: 10, label: "Neighborhood contributor" },
    { min: 25, label: "Community champion" },
];

const STAT_KEYS = {
    reports: ["reports_count", "total_reports", "problems_count", "reports"],
    votes: ["votes_count", "total_votes", "upvotes_count", "votes"],
    closed: ["closed_reports", "closed_count", "resolved_count", "closed"],
    confirmations: [
        "resolution_confirmations",
        "confirmations_count",
        "verified_count",
    ],
};

/* =========================================================
   HELPERS
========================================================= */


function normalizeCitizenProfile(response) {
    return response?.profile ?? response;
}

function getUser(profile) {
    return profile?.user || profile?.citizen || profile || {};
}

function getImageUrl(response) {
    const profile = normalizeCitizenProfile(response);
    const user = getUser(profile);

    const image =
        profile?.profile_image ??
        profile?.profile_image_url ??
        profile?.image_url ??
        user?.profile_image ??
        user?.profile_image_url ??
        user?.image_url ??
        user?.image ??
        "";

    const imagePath =
        typeof image === "string" ? image : image?.url || "";

    if (!imagePath) return "";

    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath;
    }

    try {
        return new URL(imagePath, `${DJANGO_BASE_URL}/`).href;
    } catch {
        return "";
    }
}



function getInitials(name) {
    return (
        String(name || "Citizen")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "C"
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });
}

function pickNumber(profile, keys) {
    const sources = [
        profile,
        profile?.stats,
        profile?.contribution,
        profile?.summary,
        getUser(profile),
    ];

    for (const key of keys) {
        for (const source of sources) {
            const value = source?.[key];

            if (
                value !== undefined &&
                value !== null &&
                !Number.isNaN(Number(value))
            ) {
                return Number(value);
            }
        }
    }

    return 0;
}

function formFromProfile(data) {
    const user = getUser(data);

    return {
        full_name: user.full_name || "",
        phone: user.phone || "",
        location: user.location || "",
        language_preference:
            data?.language_preference ||
            DEFAULT_PREFERENCES.language_preference,
        show_name_publicly:
            data?.show_name_publicly ??
            DEFAULT_PREFERENCES.show_name_publicly,
        show_location_publicly:
            data?.show_location_publicly ??
            DEFAULT_PREFERENCES.show_location_publicly,
        issue_progress_notifications:
            data?.issue_progress_notifications ??
            DEFAULT_PREFERENCES.issue_progress_notifications,
        discussion_reply_notifications:
            data?.discussion_reply_notifications ??
            DEFAULT_PREFERENCES.discussion_reply_notifications,
        weekly_digest_notifications:
            data?.weekly_digest_notifications ??
            DEFAULT_PREFERENCES.weekly_digest_notifications,
    };
}

function getLevel(reports) {
    let index = 0;

    LEVELS.forEach((level, i) => {
        if (reports >= level.min) index = i;
    });

    const current = LEVELS[index];
    const next = LEVELS[index + 1] || null;

    const pct = next
        ? Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    ((reports - current.min) /
                        (next.min - current.min)) *
                    100
                )
            )
        )
        : 100;

    return { current, next, pct };
}

function passwordStrength(password) {
    if (!password) return { score: 0, label: "" };
    if (password.length < 8) return { score: 1, label: "Too short" };

    let score = 2;

    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

    score = Math.min(4, score);

    return {
        score,
        label: ["", "Too short", "Fair", "Good", "Strong"][score],
    };
}

/* =========================================================
   ANIMATED NUMBER
========================================================= */

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
        const duration = 800;
        const startTime = performance.now();
        let frame;

        const tick = (now) => {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = Math.round(from + (target - from) * eased);

            fromRef.current = next;
            setShown(next);

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <>{shown}</>;
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Avatar({ image, initials, className = "" }) {
    return image ? (
        <img
            className={`up-avatar ${className}`}
            src={image}
            alt="Profile"
            onError={(event) => {
                event.currentTarget.style.display = "none";
            }}
        />
    ) : (
        <span className={`up-avatar up-avatar-fallback ${className}`}>
            {initials}
        </span>
    );
}

function CheckRow({ checked, onChange, children }) {
    return (
        <label className={`up-check ${checked ? "is-on" : ""}`}>
            <input
                type="checkbox"
                form={FORM_ID}
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />

            <span className="up-check-box" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" />
                </svg>
            </span>

            <span className="up-check-text">{children}</span>
        </label>
    );
}

function ToggleRow({ title, description, checked, onChange }) {
    return (
        <label className={`up-toggle-row ${checked ? "is-on" : "is-off"}`}>
            <span className="up-toggle-copy">
                <strong>{title}</strong>
                <small>{description}</small>
            </span>

            <input
                type="checkbox"
                form={FORM_ID}
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />

            <span className="up-switch" aria-hidden="true">
                <i />
                {checked ? "On" : "Off"}
            </span>
        </label>
    );
}

/* =========================================================
   ILLUSTRATIONS
========================================================= */

const NetworkArt = () => (
    <svg
        className="up-network"
        viewBox="0 0 420 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
    >
        <g
            fill="none"
            stroke="#7ff5e4"
            strokeWidth="1.2"
            strokeLinecap="round"
        >
            <path
                className="up-flow"
                d="M60 150 L130 80 L210 130 L280 55 L350 115 L390 40"
            />
            <path
                className="up-flow up-flow-2"
                d="M210 130 L250 170 L350 115"
            />
            <path className="up-flow up-flow-3" d="M280 55 L390 40" />
        </g>

        <circle className="up-node" cx="60" cy="150" r="4" fill="#7ff5e4" />
        <circle className="up-node up-n2" cx="130" cy="80" r="5" fill="#b9a7ff" />
        <circle className="up-node up-n3" cx="210" cy="130" r="4.5" fill="#7ff5e4" />
        <circle className="up-node up-n4" cx="280" cy="55" r="5" fill="#ffd447" />
        <circle className="up-node up-n5" cx="350" cy="115" r="4" fill="#7ff5e4" />
        <circle className="up-node up-n6" cx="390" cy="40" r="4.5" fill="#ff8fb1" />
        <circle className="up-node up-n7" cx="250" cy="170" r="3.5" fill="#b9a7ff" />
    </svg>
);

const HeroIcon = () => (
    <span className="up-hero-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48">
            <defs>
                <linearGradient id="upHeroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7ff5e4" />
                    <stop offset="1" stopColor="#12b5a0" />
                </linearGradient>
            </defs>

            <circle
                className="up-ring"
                cx="24"
                cy="25"
                r="15"
                fill="none"
                stroke="#7ff5e4"
                strokeWidth="1.2"
            />

            <g className="up-bob">
                <circle cx="24" cy="18" r="7" fill="url(#upHeroGrad)" />
                <path d="M10 41 a14 11 0 0 1 28 0z" fill="url(#upHeroGrad)" />
            </g>

            <circle cx="38" cy="11" r="6" fill="#35e0c4" />
            <path
                d="M35 11l2.2 2.2 3.8-4"
                fill="none"
                stroke="#06303a"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    </span>
);

function ProfileArt({ name, image, initials, verified, level, stats, loading }) {
    const show = (value) =>
        loading ? "…" : <CountUp value={value} />;

    return (
        <div className="up-art" aria-hidden="true">
            <span className="up-art-ring" />

            <div className="up-id-card">
                <Avatar
                    image={image}
                    initials={initials}
                    className="up-id-avatar"
                />

                <div className="up-id-copy">
                    <strong>{name}</strong>
                    <span>{verified ? "✓ Verified" : "Community member"}</span>
                    <i className="up-id-line" />
                    <i className="up-id-line short" />
                </div>
            </div>

            <div className="up-art-side">
                <div className="up-art-stats">
                    <span>
                        <b>{show(stats.reports)}</b>
                        <small>Reports</small>
                    </span>
                    <span>
                        <b>{show(stats.votes)}</b>
                        <small>Votes</small>
                    </span>
                    <span>
                        <b>{show(stats.closed)}</b>
                        <small>Closed</small>
                    </span>
                </div>

                <span className="up-art-badge">
                    <i /> {level}
                </span>
            </div>
        </div>
    );
}

const UserIcon = () => (
    <span className="up-card-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40">
            <g className="up-bob">
                <circle cx="20" cy="14" r="6" fill="#fff" />
                <path d="M8 33 a12 9.5 0 0 1 24 0z" fill="#fff" fillOpacity="0.92" />
            </g>
            <circle className="up-pulse" cx="31" cy="9" r="4" fill="#ff8a5c" />
        </svg>
    </span>
);

const LockIcon = () => (
    <span className="up-card-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40">
            <path
                className="up-shackle"
                d="M14 18 v-5 a6 6 0 0 1 12 0 v5"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <rect x="10" y="18" width="20" height="15" rx="4" fill="#fff" />
            <circle cx="20" cy="25" r="2.4" fill="#0b9f94" />
        </svg>
    </span>
);

const BellIcon = () => (
    <span className="up-card-icon" aria-hidden="true">
        <svg viewBox="0 0 40 40">
            <g className="up-swing">
                <rect x="18.5" y="6" width="3" height="4" rx="1.5" fill="#fff" />
                <path
                    d="M20 9 a10 10 0 0 1 10 10 c0 8 3.5 10.5 3.5 10.5 H6.5 S10 27 10 19 a10 10 0 0 1 10-10z"
                    fill="#fff"
                />
                <circle cx="20" cy="33" r="3" fill="#fff" />
            </g>
            <circle className="up-pulse" cx="31" cy="9" r="4" fill="#ff8a5c" />
        </svg>
    </span>
);

const ShieldArt = () => (
    <svg className="up-shield-art" viewBox="0 0 90 90" aria-hidden="true">
        <defs>
            <linearGradient id="upShield" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#9a8cf5" />
                <stop offset="1" stopColor="#5b4fd8" />
            </linearGradient>
        </defs>

        <circle
            className="up-ring"
            cx="45"
            cy="42"
            r="24"
            fill="none"
            stroke="#9a8cf5"
            strokeWidth="1.4"
        />

        <g className="up-shield">
            <path
                d="M45 12 L70 22 V42 C70 58 58 68 45 74 C32 68 20 58 20 42 V22z"
                fill="url(#upShield)"
            />
            <path
                d="M33 43l8 8 16-17"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>

        <circle className="up-twinkle" cx="12" cy="24" r="1.8" fill="#9a8cf5" />
        <circle className="up-twinkle up-d2" cx="78" cy="14" r="1.6" fill="#ffd447" />
    </svg>
);

/* =========================================================
   USER PROFILE PAGE
========================================================= */

function UserProfile() {
    const fileInputRef = useRef(null);
    const previewRef = useRef("");

    const [profile, setProfile] = useState(null);

    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        location: "",
        ...DEFAULT_PREFERENCES,
    });

    const [initial, setInitial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [removingImage, setRemovingImage] = useState(false);
    const [message, setMessage] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [passwords, setPasswords] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [changingPassword, setChangingPassword] = useState(false);

    /* Load profile */
    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const response = await getCitizenProfile();

                if (!mounted) return;

                const data = normalizeCitizenProfile(response);
                const next = formFromProfile(data);

                setProfile(data);
                setForm(next);
                setInitial(next);
            } catch (error) {
                if (mounted) {
                    setMessage({
                        type: "error",
                        text: error.message || "Could not load your profile.",
                    });
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    /* Clean up local image preview */
    useEffect(() => {
        return () => {
            if (previewRef.current) {
                URL.revokeObjectURL(previewRef.current);
            }
        };
    }, []);

    /* Automatically dismiss success messages */
    useEffect(() => {
        if (message?.type !== "success") return undefined;

        const timer = window.setTimeout(() => setMessage(null), 4500);

        return () => window.clearTimeout(timer);
    }, [message]);

    const user = getUser(profile);
    const serverImage = getImageUrl(profile);
    const displayedImage = imagePreview || serverImage;
    const initials = getInitials(form.full_name);
    const displayName = form.full_name || "Citizen";

    const dirty =
        Boolean(initial) && JSON.stringify(form) !== JSON.stringify(initial);

    const stats = {
        reports: pickNumber(profile, STAT_KEYS.reports),
        votes: pickNumber(profile, STAT_KEYS.votes),
        closed: pickNumber(profile, STAT_KEYS.closed),
        confirmations: pickNumber(profile, STAT_KEYS.confirmations),
    };

    const level = getLevel(stats.reports);
    const strength = passwordStrength(passwords.new_password);

    function setField(name, value) {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function showMessage(type, text) {
        setMessage({ type, text });
    }

    /* Select and validate a profile image */
    function handleImageSelect(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            showMessage("error", "Choose a JPG, PNG, or WebP image.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage("error", "Your image must be 5 MB or smaller.");
            event.target.value = "";
            return;
        }

        if (previewRef.current) {
            URL.revokeObjectURL(previewRef.current);
        }

        const preview = URL.createObjectURL(file);
        previewRef.current = preview;

        setSelectedImage(file);
        setImagePreview(preview);
        setMessage(null);
    }

    function normalizeCitizenProfile(response) {
        return response?.profile ?? response;
    }

    /* Upload image - FIXED: await is inside this async function */


    async function handleImageUpload() {
        if (!selectedImage) {
            showMessage("error", "Please choose an image first.");
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            await uploadCitizenProfileImage(selectedImage);

            const response = await getCitizenProfile();
            const freshProfile = normalizeCitizenProfile(response);

            setProfile(freshProfile);
            setSelectedImage(null);
            setImagePreview("");

            if (previewRef.current) {
                URL.revokeObjectURL(previewRef.current);
                previewRef.current = "";
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            window.dispatchEvent(new Event("citizen-profile-updated"));

            showMessage("success", "Profile image updated successfully.");
        } catch (error) {
            showMessage(
                "error",
                error.message || "Could not upload your profile image."
            );
        } finally {
            setUploading(false);
        }
    }


    async function handleImageRemove() {
        if (!serverImage && !selectedImage) return;

        if (!window.confirm("Remove your profile image?")) {
            return;
        }

        setRemovingImage(true);
        setMessage(null);

        try {
            if (serverImage) {
                await deleteCitizenProfileImage();
            }

            const response = await getCitizenProfile();
            const freshProfile = normalizeCitizenProfile(response);

            setProfile(freshProfile);
            setSelectedImage(null);
            setImagePreview("");

            if (previewRef.current) {
                URL.revokeObjectURL(previewRef.current);
                previewRef.current = "";
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            window.dispatchEvent(new Event("citizen-profile-updated"));

            showMessage("success", "Profile image removed.");
        } catch (error) {
            showMessage(
                "error",
                error.message || "Could not remove your profile image."
            );
        } finally {
            setRemovingImage(false);
        }
    }

    /* Save personal details and preferences */
    async function handleProfileSave(event) {
        event.preventDefault();

        setSaving(true);
        setMessage(null);

        try {
            await updateCitizenProfile({
                user: {
                    full_name: form.full_name.trim(),
                    phone: form.phone.trim(),
                    location: form.location.trim(),
                },
                language_preference: form.language_preference,
                show_name_publicly: form.show_name_publicly,
                show_location_publicly: form.show_location_publicly,
                issue_progress_notifications:
                    form.issue_progress_notifications,
                discussion_reply_notifications:
                    form.discussion_reply_notifications,
                weekly_digest_notifications:
                    form.weekly_digest_notifications,
            });

            const response = await getCitizenProfile();
            const freshProfile = normalizeCitizenProfile(response);
            const next = formFromProfile(freshProfile);

            setProfile(freshProfile);
            setForm(next);
            setInitial(next);

            showMessage("success", "Your profile has been saved.");
        } catch (error) {
            showMessage(
                "error",
                error.message || "Could not save your profile."
            );
        } finally {
            setSaving(false);
        }
    }

    /* Change account password */
    async function handlePasswordChange(event) {
        event.preventDefault();
        setMessage(null);

        if (passwords.new_password !== passwords.confirm_password) {
            showMessage("error", "The new passwords do not match.");
            return;
        }

        if (passwords.new_password.length < 8) {
            showMessage(
                "error",
                "Use a new password with at least 8 characters."
            );
            return;
        }

        setChangingPassword(true);

        try {
            await changeCitizenPassword(passwords);

            setPasswords({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });

            showMessage("success", "Password changed successfully.");
        } catch (error) {
            showMessage(
                "error",
                error.message || "Could not change your password."
            );
        } finally {
            setChangingPassword(false);
        }
    }

    /* Download account data */
    function handleDownloadData() {
        const saved = initial || form;

        const payload = {
            exported_at: new Date().toISOString(),
            account: {
                full_name: saved.full_name,
                email: user.email || "",
                phone: saved.phone,
                location: saved.location,
                member_since:
                    profile?.created_at ||
                    user.date_joined ||
                    user.created_at ||
                    "",
            },
            preferences: {
                language_preference: saved.language_preference,
                show_name_publicly: saved.show_name_publicly,
                show_location_publicly: saved.show_location_publicly,
                issue_progress_notifications:
                    saved.issue_progress_notifications,
                discussion_reply_notifications:
                    saved.discussion_reply_notifications,
                weekly_digest_notifications:
                    saved.weekly_digest_notifications,
            },
            contribution: {
                reports: stats.reports,
                votes: stats.votes,
                closed_reports: stats.closed,
            },
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "civicsolve-account-data.json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showMessage("success", "Your account data has been downloaded.");
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="up-page">
            {/* HERO */}
            <section className="up-hero">
                <div className="up-hero-bg" aria-hidden="true">
                    <span className="up-blob up-blob-1" />
                    <span className="up-blob up-blob-2" />
                    <NetworkArt />
                    <span className="up-mote up-mote-1" />
                    <span className="up-mote up-mote-2" />
                    <span className="up-mote up-mote-3" />
                    <span className="up-mote up-mote-4" />
                    <span className="up-mote up-mote-5" />

                    <svg
                        className="up-wave"
                        viewBox="0 0 1440 60"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z"
                            fill="#f1faf8"
                        />
                    </svg>
                </div>

                <div className="up-hero-inner">
                    <div className="up-hero-content">
                        <div className="up-eyebrow-row">
                            <span className="up-crumbs">
                                Community workspace / <b>Profile</b>
                            </span>

                            {dirty && (
                                <span className="up-dirty-chip">
                                    <i /> Unsaved changes
                                </span>
                            )}
                        </div>

                        <div className="up-title-row">
                            <HeroIcon />
                            <h1>Your profile</h1>
                        </div>

                        <p>
                            Manage your details, privacy and community
                            preferences.
                        </p>
                    </div>

                    <div className="up-hero-art">
                        <ProfileArt
                            name={displayName}
                            image={displayedImage}
                            initials={initials}
                            verified={Boolean(user.email_verified)}
                            level={level.current.label}
                            stats={stats}
                            loading={loading}
                        />
                    </div>
                </div>
            </section>

            <div className="up-content">
                <form
                    id={FORM_ID}
                    onSubmit={handleProfileSave}
                    noValidate={false}
                />

                {message && (
                    <div
                        className={`up-message ${message.type}`}
                        role="status"
                        aria-live="polite"
                    >
                        <span>
                            {message.type === "success" ? "✓" : "!"}
                        </span>

                        {message.text}

                        <button
                            type="button"
                            aria-label="Dismiss message"
                            onClick={() => setMessage(null)}
                        >
                            ×
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="up-layout" aria-busy="true">
                        <div className="up-main">
                            {[0, 1, 2].map((i) => (
                                <div
                                    className="up-card up-skel-card"
                                    key={i}
                                    style={{ "--d": `${i * 0.08}s` }}
                                >
                                    <span className="up-skel w30 tall" />
                                    <span className="up-skel w90" />
                                    <span className="up-skel w70" />
                                    <span className="up-skel w50" />
                                </div>
                            ))}
                        </div>

                        <aside className="up-side">
                            {[0, 1].map((i) => (
                                <div
                                    className="up-card up-skel-card"
                                    key={i}
                                    style={{ "--d": `${i * 0.08}s` }}
                                >
                                    <span className="up-skel w50 tall" />
                                    <span className="up-skel w90" />
                                    <span className="up-skel w70" />
                                </div>
                            ))}
                        </aside>
                    </div>
                ) : (
                    <div className="up-layout">
                        {/* MAIN COLUMN */}
                        <div className="up-main">
                            {/* PERSONAL DETAILS */}
                            <section
                                className="up-card"
                                style={{ "--d": "0.1s" }}
                            >
                                <header className="up-card-head">
                                    <div className="up-card-title">
                                        <span className="up-card-bar" />
                                        <div>
                                            <h2>Personal details</h2>
                                            <p>
                                                How your information appears in
                                                your CivicSolve account.
                                            </p>
                                        </div>
                                    </div>

                                    <UserIcon />
                                </header>

                                <div className="up-photo-section">
                                    <div className="up-photo-preview">
                                        <Avatar
                                            image={displayedImage}
                                            initials={initials}
                                        />
                                        <span className="up-photo-ring" />
                                    </div>

                                    <div className="up-photo-info">
                                        <strong>Profile photo</strong>
                                        <p>
                                            JPG, PNG or WebP · Maximum size 5 MB
                                        </p>

                                        <div className="up-photo-actions">
                                            <button
                                                type="button"
                                                className="up-button secondary small"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                disabled={
                                                    uploading || removingImage
                                                }
                                            >
                                                Choose image
                                            </button>

                                            {(serverImage || selectedImage) && (
                                                <button
                                                    type="button"
                                                    className="up-text-button danger"
                                                    onClick={handleImageRemove}
                                                    disabled={
                                                        uploading ||
                                                        removingImage
                                                    }
                                                >
                                                    {removingImage
                                                        ? "Removing…"
                                                        : "Remove"}
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleImageSelect}
                                            hidden
                                        />

                                        {selectedImage && (
                                            <div className="up-selected-image">
                                                <span>
                                                    Selected: {selectedImage.name}
                                                </span>

                                                <button
                                                    type="button"
                                                    className="up-button primary small"
                                                    onClick={handleImageUpload}
                                                    disabled={uploading}
                                                >
                                                    {uploading
                                                        ? "Uploading…"
                                                        : "Upload photo"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="up-form-grid">
                                    <label className="up-field">
                                        <span>Full name</span>
                                        <input
                                            type="text"
                                            form={FORM_ID}
                                            value={form.full_name}
                                            onChange={(event) =>
                                                setField(
                                                    "full_name",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your full name"
                                            required
                                            maxLength={150}
                                        />
                                    </label>

                                    <label className="up-field">
                                        <span>Email address</span>
                                        <input
                                            type="email"
                                            value={user.email || ""}
                                            disabled
                                            readOnly
                                        />

                                        {user.email_verified ? (
                                            <small className="up-verified-note">
                                                ✓ Verified email
                                            </small>
                                        ) : (
                                            <small>
                                                Your registered email cannot be
                                                changed here.
                                            </small>
                                        )}
                                    </label>

                                    <label className="up-field">
                                        <span>Phone number</span>
                                        <input
                                            type="tel"
                                            form={FORM_ID}
                                            value={form.phone}
                                            onChange={(event) =>
                                                setField(
                                                    "phone",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter phone number"
                                            maxLength={16}
                                        />
                                    </label>

                                    <label className="up-field">
                                        <span>City / location</span>
                                        <input
                                            type="text"
                                            form={FORM_ID}
                                            value={form.location}
                                            onChange={(event) =>
                                                setField(
                                                    "location",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Your city or locality"
                                            maxLength={255}
                                        />
                                    </label>

                                    <label className="up-field up-field-wide">
                                        <span>Language preference</span>
                                        <select
                                            form={FORM_ID}
                                            value={form.language_preference}
                                            onChange={(event) =>
                                                setField(
                                                    "language_preference",
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="en">English</option>
                                            <option value="te">
                                                తెలుగు (Telugu)
                                            </option>
                                            <option value="hi">
                                                हिन्दी (Hindi)
                                            </option>
                                        </select>

                                        <small>
                                            This saves your preference. It does
                                            not automatically translate every
                                            page.
                                        </small>
                                    </label>
                                </div>

                                <div className="up-checks">
                                    <CheckRow
                                        checked={form.show_name_publicly}
                                        onChange={(value) =>
                                            setField(
                                                "show_name_publicly",
                                                value
                                            )
                                        }
                                    >
                                        Show my name on public discussions
                                    </CheckRow>

                                    <CheckRow
                                        checked={form.show_location_publicly}
                                        onChange={(value) =>
                                            setField(
                                                "show_location_publicly",
                                                value
                                            )
                                        }
                                    >
                                        Show my location on public discussions
                                    </CheckRow>
                                </div>

                                <p className="up-foot-note">
                                    Your phone number and exact address are
                                    never shown publicly.
                                </p>
                                <div className="up-card-footer">
                                    <span>
                                        {dirty
                                            ? "You have unsaved changes."
                                            : "No changes to save."}
                                    </span>

                                    <button
                                        className="up-button primary"
                                        type="submit"
                                        form={FORM_ID}
                                        disabled={saving || loading || !dirty}
                                    >
                                        {saving ? "Saving…" : "Save changes"}
                                    </button>
                                </div>
                            </section>

                            {/* PASSWORD AND SECURITY */}
                            <section
                                className="up-card"
                                style={{ "--d": "0.18s" }}
                            >
                                <header className="up-card-head">
                                    <div className="up-card-title">
                                        <span className="up-card-bar" />
                                        <div>
                                            <h2>Password &amp; security</h2>
                                            <p>
                                                Change your password to keep
                                                your account secure.
                                            </p>
                                        </div>
                                    </div>

                                    <LockIcon />
                                </header>

                                <form onSubmit={handlePasswordChange}>
                                    <div className="up-form-grid">
                                        <label className="up-field">
                                            <span>Current password</span>
                                            <input
                                                type="password"
                                                autoComplete="current-password"
                                                value={passwords.current_password}
                                                onChange={(event) =>
                                                    setPasswords((previous) => ({
                                                        ...previous,
                                                        current_password:
                                                            event.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </label>

                                        <label className="up-field">
                                            <span>New password</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.new_password}
                                                onChange={(event) =>
                                                    setPasswords((previous) => ({
                                                        ...previous,
                                                        new_password:
                                                            event.target.value,
                                                    }))
                                                }
                                                placeholder="Enter a new password"
                                                minLength={8}
                                                required
                                            />

                                            {passwords.new_password ? (
                                                <span
                                                    className={`up-strength s${strength.score}`}
                                                >
                                                    <span className="up-strength-bars">
                                                        {[1, 2, 3, 4].map(
                                                            (step) => (
                                                                <i
                                                                    key={step}
                                                                    className={
                                                                        strength.score >=
                                                                            step
                                                                            ? "on"
                                                                            : ""
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </span>

                                                    <em>{strength.label}</em>
                                                </span>
                                            ) : (
                                                <small>
                                                    Use at least 8 characters.
                                                </small>
                                            )}
                                        </label>

                                        <label className="up-field">
                                            <span>Confirm new password</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.confirm_password}
                                                onChange={(event) =>
                                                    setPasswords((previous) => ({
                                                        ...previous,
                                                        confirm_password:
                                                            event.target.value,
                                                    }))
                                                }
                                                minLength={8}
                                                required
                                            />

                                            {passwords.confirm_password &&
                                                passwords.confirm_password ===
                                                passwords.new_password && (
                                                    <small className="up-verified-note">
                                                        ✓ Passwords match
                                                    </small>
                                                )}
                                        </label>
                                    </div>

                                    <div className="up-card-footer">
                                        <span>
                                            Your current password is required.
                                        </span>

                                        <button
                                            className="up-button primary"
                                            type="submit"
                                            disabled={changingPassword}
                                        >
                                            {changingPassword
                                                ? "Updating password…"
                                                : "Update password"}
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* NOTIFICATION PREFERENCES */}
                            <section
                                className="up-card"
                                style={{ "--d": "0.26s" }}
                            >
                                <header className="up-card-head">
                                    <div className="up-card-title">
                                        <span className="up-card-bar" />
                                        <div>
                                            <h2>Notification preferences</h2>
                                            <p>
                                                Choose which updates CivicSolve
                                                sends you.
                                            </p>
                                        </div>
                                    </div>

                                    <BellIcon />
                                </header>

                                <div className="up-toggles">
                                    <ToggleRow
                                        title="Problem progress updates"
                                        description="Status, evidence and deadline updates on your reports."
                                        checked={
                                            form.issue_progress_notifications
                                        }
                                        onChange={(value) =>
                                            setField(
                                                "issue_progress_notifications",
                                                value
                                            )
                                        }
                                    />

                                    <ToggleRow
                                        title="Discussion replies"
                                        description="Replies to your reports and comments."
                                        checked={
                                            form.discussion_reply_notifications
                                        }
                                        onChange={(value) =>
                                            setField(
                                                "discussion_reply_notifications",
                                                value
                                            )
                                        }
                                    />

                                    <ToggleRow
                                        title="Weekly community digest"
                                        description="A summary of neighborhood activity."
                                        checked={
                                            form.weekly_digest_notifications
                                        }
                                        onChange={(value) =>
                                            setField(
                                                "weekly_digest_notifications",
                                                value
                                            )
                                        }
                                    />
                                </div>

                                <div className="up-card-footer">
                                    <span>
                                        Changes apply when you select Save
                                        changes.
                                    </span>

                                    <button
                                        className="up-button primary"
                                        type="submit"
                                        form={FORM_ID}
                                        disabled={saving || !dirty}
                                    >
                                        {saving
                                            ? "Saving…"
                                            : "Save preferences"}
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* SIDEBAR */}
                        <aside className="up-side">
                            {/* IDENTITY */}
                            <article
                                className="up-identity"
                                style={{ "--d": "0.14s" }}
                            >
                                <span
                                    className="up-identity-orb"
                                    aria-hidden="true"
                                />

                                <div className="up-identity-top">
                                    <div className="up-identity-avatar">
                                        <Avatar
                                            image={displayedImage}
                                            initials={initials}
                                        />
                                        <span className="up-online" />
                                    </div>

                                    <div className="up-identity-copy">
                                        <h2>{displayName}</h2>
                                        <p>{user.email || "Email not available"}</p>

                                        <span
                                            className={`up-pill ${user.email_verified ? "ok" : ""
                                                }`}
                                        >
                                            {user.email_verified
                                                ? "✓ Email verified"
                                                : "Community member"}
                                        </span>
                                    </div>
                                </div>

                                <ul className="up-identity-meta">
                                    <li>
                                        <span aria-hidden="true">🗓</span>
                                        Member since{" "}
                                        {formatDate(
                                            profile?.created_at ||
                                            user.date_joined ||
                                            user.created_at
                                        )}
                                    </li>

                                    <li>
                                        <span aria-hidden="true">📍</span>
                                        {form.location || "Location not set"}
                                    </li>
                                </ul>
                            </article>

                            {/* CONTRIBUTION */}
                            <article
                                className="up-contrib"
                                style={{ "--d": "0.22s" }}
                            >
                                <div className="up-contrib-head">
                                    <h2>Your contribution</h2>
                                    <span className="up-active">
                                        <i /> Active
                                    </span>
                                </div>

                                <span className="up-level">
                                    {level.current.label}
                                </span>

                                <div className="up-stat-grid">
                                    <div>
                                        <b>
                                            <CountUp value={stats.reports} />
                                        </b>
                                        <small>Reports</small>
                                    </div>

                                    <div>
                                        <b>
                                            <CountUp value={stats.votes} />
                                        </b>
                                        <small>Votes</small>
                                    </div>

                                    <div>
                                        <b>
                                            <CountUp value={stats.closed} />
                                        </b>
                                        <small>Closed</small>
                                    </div>
                                </div>

                                <div className="up-progress">
                                    <div className="up-progress-track">
                                        <span
                                            style={{ "--w": `${level.pct}%` }}
                                        />
                                    </div>

                                    <small>
                                        {level.next
                                            ? `${Math.max(
                                                0,
                                                level.next.min -
                                                stats.reports
                                            )
                                            } more ${level.next.min -
                                                stats.reports ===
                                                1
                                                ? "report"
                                                : "reports"
                                            } to reach ${level.next.label}`
                                            : "You have reached the highest level."}
                                    </small>
                                </div>

                                <ul className="up-contrib-list">
                                    <li>
                                        <i /> {stats.confirmations} resolution
                                        confirmations
                                    </li>
                                    <li>
                                        <i /> {stats.closed} closed reports
                                    </li>
                                </ul>

                                <p className="up-contrib-note">
                                    Recognition celebrates participation, not
                                    official status.
                                </p>
                            </article>

                            {/* ACCOUNT CONTROLS */}
                            <article
                                className="up-controls"
                                style={{ "--d": "0.3s" }}
                            >
                                <ShieldArt />
                                <h2>Account controls</h2>

                                <button
                                    type="button"
                                    className="up-control download"
                                    onClick={handleDownloadData}
                                >
                                    <span aria-hidden="true">⬇</span>
                                    Download my account data
                                </button>

                                <button
                                    type="button"
                                    className="up-control danger"
                                    disabled
                                    title="Not available yet"
                                >
                                    <span aria-hidden="true">✕</span>
                                    Request account deletion
                                    <em>Soon</em>
                                </button>
                            </article>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserProfile;
