
import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useToast } from "../../components/toast/ToastContext";

import {
    getOrganizationProfile,
    updateOrganizationProfile,
    uploadOrganizationProfileImage,
    deleteOrganizationProfileImage,
} from "../../services/api";

import "../../styles/organization/OrganizationProfile.css";

const ORGANIZATION_TYPES = [
    { value: "government", label: "Government / Local Authority" },
    { value: "ngo", label: "NGO / Non-Profit" },
    { value: "private", label: "Private Organization" },
    { value: "community", label: "Community Organization" },
    { value: "educational", label: "Educational Institution" },
    { value: "other", label: "Other" },
];

const EMPTY_PROFILE = {
    organization_name: "",
    organization_type: "other",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
    service_area: "",
    categories: [],
    description: "",
    profile_image_url: null,
};

function getInitials(name = "") {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "OR";
}

function getTypeLabel(type) {
    return (
        ORGANIZATION_TYPES.find((item) => item.value === type)?.label ||
        "Organization"
    );
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getErrorMessage(error) {
    return error?.message || "Something went wrong. Please try again.";
}

function getCategoryLabel(item) {
    return typeof item === "object" && item !== null
        ? item.name ?? item.id ?? "Category"
        : item;
}

function normalizeProfile(data = {}) {
    return {
        ...EMPTY_PROFILE,
        ...data,
        latitude: data.latitude ?? "",
        longitude: data.longitude ?? "",
        categories: Array.isArray(data.categories)
            ? data.categories
            : [],
    };
}

export default function OrganizationProfile() {
    const { showToast } = useToast();
    const { setOrg } = useOutletContext() || {};

    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [form, setForm] = useState(EMPTY_PROFILE);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageRemoving, setImageRemoving] = useState(false);

    // Keep the layout header synchronized without accidentally
    // clearing an existing image when an API response omits it.
    const syncLayoutProfile = (
        data,
        { preserveExistingImage = false } = {}
    ) => {
        setOrg?.((previous) => ({
            ...previous,
            name:
                data.organization_name ||
                previous?.name ||
                "",
            profile_image_url: preserveExistingImage
                ? previous?.profile_image_url ?? null
                : data.profile_image_url || null,
        }));
    };

    const loadProfile = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getOrganizationProfile();
            const data = response?.profile || response || {};

            const normalized = normalizeProfile(data);

            setProfile(normalized);
            setForm(normalized);

            syncLayoutProfile(normalized, {
                preserveExistingImage: !Object.prototype.hasOwnProperty.call(
                    data,
                    "profile_image_url"
                ),
            });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!imagePreview) return undefined;

        return () => URL.revokeObjectURL(imagePreview);
    }, [imagePreview]);

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];

        // Allow selecting the same file again later.
        event.target.value = "";

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            setError("Please choose a JPG, PNG, or WebP image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Image size must not exceed 5 MB.");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError("");
        setSuccess("");
    };

    const handleImageUpload = async () => {
        if (!imageFile) {
            setError("Choose an image before uploading.");
            return;
        }

        setImageUploading(true);
        setError("");
        setSuccess("");

        try {
            const response = await uploadOrganizationProfileImage(imageFile);
            const responseProfile = response?.profile || {
                ...profile,
                profile_image_url: response?.profile_image_url,
            };

            const normalized = normalizeProfile(responseProfile);

            setProfile(normalized);
            setForm(normalized);

            syncLayoutProfile(normalized, {
                preserveExistingImage: !Object.prototype.hasOwnProperty.call(
                    responseProfile,
                    "profile_image_url"
                ),
            });

            setImageFile(null);
            setImagePreview("");
            setSuccess("Profile image saved successfully.");
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setImageUploading(false);
        }
    };

    const handleImageRemove = async () => {
        const confirmed = window.confirm(
            "Remove your organization profile image? This cannot be undone."
        );

        if (!confirmed) return;

        setImageRemoving(true);
        setError("");
        setSuccess("");

        try {
            await deleteOrganizationProfileImage();

            const normalized = {
                ...profile,
                profile_image_url: null,
            };

            setProfile(normalized);
            setForm(normalized);

            // Explicitly clear the header image after successful removal.
            syncLayoutProfile(normalized);

            setImageFile(null);
            setImagePreview("");
            setSuccess("Profile image removed successfully.");
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setImageRemoving(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // Load once when the profile page mounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
        setSuccess("");
    };

    const handleEdit = () => {
        setForm({ ...profile });
        setEditing(true);
        setError("");
        setSuccess("");
    };

    const handleCancel = () => {
        setForm({ ...profile });
        setEditing(false);
        setError("");
        setSuccess("");
    };

    const handleSave = async (event) => {
        event.preventDefault();

        if (!form.organization_name.trim()) {
            showToast(
                "warning",
                "Missing Information",
                "Organization name is required."
            );
            return;
        }

        if (!form.phone.trim()) {
            showToast(
                "warning",
                "Missing Information",
                "Contact phone is required."
            );
            return;
        }

        if (!form.city.trim() || !form.state.trim()) {
            showToast(
                "warning",
                "Missing Information",
                "City and state are required."
            );
            return;
        }

        const parseCoordinate = (value, label, min, max) => {
            if (value === "" || value === null || value === undefined) {
                return null;
            }

            const number = Number(value);

            if (
                !Number.isFinite(number) ||
                number < min ||
                number > max
            ) {
                throw new Error(
                    `${label} must be between ${min} and ${max}.`
                );
            }

            return number;
        };

        let payload;

        try {
            payload = {
                organization_name: form.organization_name.trim(),
                organization_type: form.organization_type,
                phone: form.phone.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                service_area: form.service_area.trim(),
                description: form.description.trim(),
                latitude: parseCoordinate(
                    form.latitude,
                    "Latitude",
                    -90,
                    90
                ),
                longitude: parseCoordinate(
                    form.longitude,
                    "Longitude",
                    -180,
                    180
                ),
                categories: Array.isArray(form.categories)
                    ? form.categories
                    : [],
            };
        } catch (err) {
            showToast(
                "error",
                "Invalid Information",
                getErrorMessage(err)
            );
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await updateOrganizationProfile(payload);

            // PATCH returns { message, profile } in our backend implementation.
            const updatedData = response?.profile || response || {};
            const normalized = normalizeProfile(updatedData);

            setProfile(normalized);
            setForm(normalized);

            syncLayoutProfile(normalized, {
                preserveExistingImage: !Object.prototype.hasOwnProperty.call(
                    updatedData,
                    "profile_image_url"
                ),
            });

            setEditing(false);
            setSuccess("");

            showToast(
                "success",
                "Profile Updated",
                "Your organization profile has been updated successfully."
            );
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="op-page">
                <div className="op-loading">
                    <span className="op-spinner" />
                    <p>Loading organization profile...</p>
                </div>
            </div>
        );
    }

    if (error && !profile.id) {
        return (
            <div className="op-page">
                <div className="op-alert op-alert-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={loadProfile}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const displayed = editing ? form : profile;

    const categoryLabels = (profile.categories || []).map(getCategoryLabel);
    const serviceAreas = (profile.service_area || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const statusText = (profile.status || "unknown").replaceAll("_", " ");
    const isApproved = profile.status === "approved";
    const locationText =
        [profile.city, profile.state].filter(Boolean).join(", ") ||
        "Location not added";

    return (
        <div className="op-page">
            <div className="op-container">
                {/* ================= HERO ================= */}
                <section className="op-hero">
                    <span className="op-orb op-orb-1" aria-hidden="true" />
                    <span className="op-orb op-orb-2" aria-hidden="true" />
                    <span className="op-hero-grid" aria-hidden="true" />

                    <div className="op-hero-copy">
                        <div className="op-hero-top">
                            <Link
                                className="op-back-link"
                                to="/organization/dashboard"
                            >
                                ← Back to Dashboard
                            </Link>
                            <span className="op-hero-divider" aria-hidden="true" />
                            <span className="op-eyebrow">ORGANIZATION ACCOUNT</span>
                        </div>

                        <h1>Organization profile</h1>

                        <p>
                            Manage your organization information, contact details,
                            and service coverage.
                        </p>

                        <div className="op-hero-actions">
                            {editing ? (
                                <>
                                    <button
                                        type="button"
                                        className="op-hero-btn op-hero-btn-ghost"
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        form="op-profile-form"
                                        className="op-hero-btn"
                                        disabled={saving}
                                    >
                                        {saving ? "Saving changes..." : "Save changes"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="op-hero-btn"
                                    onClick={handleEdit}
                                >
                                    <span aria-hidden="true">✎</span>
                                    Edit profile
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="op-hero-art" aria-hidden="true">
                        <svg viewBox="0 0 340 260" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="opCard" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0" stopColor="#ffffff" />
                                    <stop offset="1" stopColor="#e3f6f1" />
                                </linearGradient>
                            </defs>

                            <circle className="op-art-glow" cx="170" cy="130" r="105" fill="rgba(124,231,206,0.14)" />
                            <circle className="op-art-orbit" cx="170" cy="130" r="98" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="4 9" />

                            {/* ID card */}
                            <g className="op-art-float">
                                <rect x="88" y="62" width="164" height="116" rx="16" fill="url(#opCard)" />
                                <rect x="88" y="62" width="164" height="34" rx="16" fill="#10253c" />
                                <rect x="88" y="80" width="164" height="16" fill="#10253c" />
                                <circle cx="106" cy="79" r="5" fill="#7ce7ce" />
                                <rect x="118" y="75" width="60" height="8" rx="4" fill="rgba(255,255,255,0.55)" />

                                <circle cx="124" cy="128" r="20" fill="#0e9f86" />
                                <circle cx="124" cy="122" r="7" fill="#ffffff" />
                                <path d="M110 142 a14 12 0 0 1 28 0 z" fill="#ffffff" />

                                <rect x="156" y="114" width="80" height="8" rx="4" fill="#c9d9e2" />
                                <rect x="156" y="130" width="60" height="7" rx="3.5" fill="#dbe6ec" />
                                <rect x="156" y="145" width="70" height="7" rx="3.5" fill="#dbe6ec" />

                                <rect x="104" y="164" width="132" height="6" rx="3" fill="#dbeee9" />
                                <rect className="op-art-line" x="104" y="164" width="132" height="6" rx="3" fill="#0e9f86" />
                            </g>

                            {/* verified badge */}
                            <g className="op-art-badge">
                                <circle cx="246" cy="70" r="18" fill="#ffc857" stroke="#163d50" strokeWidth="3" />
                                <path className="op-art-check" d="M237 70 l6 6 l11 -13" fill="none" stroke="#10253c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </g>

                            {/* location pin */}
                            <g className="op-art-pin">
                                <path d="M78 206 c-12 -14 -18 -22 -18 -30 a18 18 0 0 1 36 0 c0 8 -6 16 -18 30 z" fill="#7ce7ce" />
                                <circle cx="78" cy="176" r="6" fill="#10253c" />
                            </g>

                            {/* building */}
                            <g className="op-art-float op-art-float-delay">
                                <rect x="262" y="150" width="42" height="62" rx="5" fill="#ffffff" />
                                <rect x="270" y="158" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="288" y="158" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="270" y="173" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="288" y="173" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="270" y="188" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="288" y="188" width="8" height="8" rx="2" fill="#c9d9e2" />
                                <rect x="277" y="198" width="12" height="14" rx="2" fill="#0e9f86" />
                            </g>

                            <g className="op-art-spark" fill="#ffffff">
                                <circle cx="40" cy="80" r="4" />
                                <circle cx="310" cy="110" r="3" />
                                <circle cx="190" cy="22" r="3" />
                            </g>
                        </svg>
                    </div>
                </section>

                {/* ================= BANNER ================= */}
                <div
                    className={`op-banner${isApproved ? "" : " op-banner-pending"}`}
                    role="status"
                >
                    <span className="op-banner-icon" aria-hidden="true">
                        {isApproved ? "✓" : "!"}
                    </span>
                    <p>
                        <strong>
                            {isApproved
                                ? "Platform verified organization"
                                : `Verification status: ${statusText}`}
                        </strong>
                        {profile.verified_at ? ` · ${formatDate(profile.verified_at)}` : ""}
                        {` · ${profile.organization_name || "Your organization"}`}
                        {isApproved ? " is active and verified" : ""}
                    </p>
                </div>

                {error && (
                    <div className="op-alert op-alert-error" role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            aria-label="Dismiss error"
                            onClick={() => setError("")}
                        >
                            ×
                        </button>
                    </div>
                )}

                {success && (
                    <div className="op-alert op-alert-success" role="status">
                        <span aria-hidden="true">✓</span>
                        {success}
                        <button
                            type="button"
                            aria-label="Dismiss message"
                            onClick={() => setSuccess("")}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ================= STATS ================= */}
                <section className="op-stat-grid" aria-label="Profile summary">
                    <article className="op-stat op-stat-teal-edge">
                        <span className="op-stat-label">SERVICE CATEGORIES</span>
                        <strong>{categoryLabels.length}</strong>
                        <small>
                            <span className="op-stat-dot" />
                            {categoryLabels.slice(0, 2).join(", ") || "None added yet"}
                        </small>
                    </article>

                    <article className="op-stat op-stat-amber-edge">
                        <span className="op-stat-label">SERVICE AREAS</span>
                        <strong>{serviceAreas.length}</strong>
                        <small>
                            <span className="op-stat-dot" />
                            {serviceAreas.slice(0, 2).join(", ") || "Not added yet"}
                        </small>
                    </article>

                    <article className="op-stat op-stat-filled">
                        <span className="op-stat-label">ORGANIZATION ID</span>
                        <strong>#{profile.id ?? "—"}</strong>
                        <small>
                            <span className="op-stat-dot" />
                            Registered {formatDate(profile.created_at)}
                        </small>
                    </article>

                    <article className="op-stat op-stat-purple-edge">
                        <span className="op-stat-label">EMAIL VERIFICATION</span>
                        <strong className="op-stat-text">
                            {profile.email_verified ? "Verified" : "Pending"}
                        </strong>
                        <small>
                            <span className="op-stat-dot" />
                            Approval: {statusText}
                        </small>
                    </article>
                </section>

                {/* ================= BODY ================= */}
                <section className="op-content-grid">
                    <div className="op-main-column">
                        <form
                            id="op-profile-form"
                            className={editing ? "is-editing" : ""}
                            onSubmit={handleSave}
                        >
                            <section className="op-card">
                                <div className="op-card-heading">
                                    <div>
                                        <h3>Organization information</h3>
                                        <p>Organization identity and official contact details.</p>
                                    </div>
                                    <span
                                        className={`op-status op-status-${profile.status || "unknown"}`}
                                    >
                                        <span className="op-status-dot" />
                                        {statusText}
                                    </span>
                                </div>

                                <div className="op-form-grid">
                                    <div className="op-field op-field-full">
                                        <label htmlFor="organization_name">
                                            Organization name
                                        </label>
                                        <input
                                            id="organization_name"
                                            name="organization_name"
                                            value={displayed.organization_name}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            required
                                            maxLength={150}
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="organization_type">
                                            Organization type
                                        </label>
                                        <select
                                            id="organization_type"
                                            name="organization_type"
                                            value={displayed.organization_type}
                                            onChange={handleChange}
                                            disabled={!editing}
                                        >
                                            {ORGANIZATION_TYPES.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="op-field op-field-locked">
                                        <label htmlFor="email">Official email</label>
                                        <input
                                            id="email"
                                            value={displayed.email}
                                            disabled
                                            readOnly
                                        />
                                        <small>
                                            Email changes require a separate verification workflow.
                                        </small>
                                    </div>

                                    <div className="op-field op-field-full">
                                        <label htmlFor="description">
                                            About the organization
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={displayed.description}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            rows={3}
                                            placeholder="Describe your organization's mission and community work."
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="op-card">
                                <div className="op-card-heading">
                                    <div>
                                        <h3>Contact &amp; service coverage</h3>
                                        <p>Help the community reach you and understand where you operate.</p>
                                    </div>
                                </div>

                                <div className="op-form-grid">
                                    <div className="op-field">
                                        <label htmlFor="phone">Contact number</label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            value={displayed.phone}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            required
                                            maxLength={15}
                                            autoComplete="tel"
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="service_area">Service area</label>
                                        <input
                                            id="service_area"
                                            name="service_area"
                                            value={displayed.service_area}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            placeholder="e.g. Kakinada, Samalkot"
                                        />
                                    </div>

                                    <div className="op-field op-field-full">
                                        <label htmlFor="address">Office address</label>
                                        <textarea
                                            id="address"
                                            name="address"
                                            value={displayed.address}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="city">City</label>
                                        <input
                                            id="city"
                                            name="city"
                                            value={displayed.city}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            required
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="state">State</label>
                                        <input
                                            id="state"
                                            name="state"
                                            value={displayed.state}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            required
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="latitude">Latitude</label>
                                        <input
                                            id="latitude"
                                            name="latitude"
                                            type="number"
                                            step="any"
                                            min="-90"
                                            max="90"
                                            value={displayed.latitude}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="op-field">
                                        <label htmlFor="longitude">Longitude</label>
                                        <input
                                            id="longitude"
                                            name="longitude"
                                            type="number"
                                            step="any"
                                            min="-180"
                                            max="180"
                                            value={displayed.longitude}
                                            onChange={handleChange}
                                            disabled={!editing}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="op-card">
                                <div className="op-card-heading">
                                    <div>
                                        <h3>Supported categories</h3>
                                        <p>Problem categories your organization handles.</p>
                                    </div>
                                </div>

                                {editing ? (
                                    <div className="op-field">
                                        <label htmlFor="categories">
                                            Categories (comma-separated)
                                        </label>
                                        <input
                                            id="categories"
                                            value={displayed.categories
                                                .map((item) =>
                                                    typeof item === "object"
                                                        ? item.name ?? item.id ?? ""
                                                        : item
                                                )
                                                .join(", ")}
                                            onChange={(event) => {
                                                const categories = event.target.value
                                                    .split(",")
                                                    .map((item) => item.trim())
                                                    .filter(Boolean);

                                                setForm((previous) => ({
                                                    ...previous,
                                                    categories,
                                                }));
                                                setError("");
                                                setSuccess("");
                                            }}
                                            placeholder="e.g. Roads, Streetlights, Sanitation"
                                        />
                                        <small>
                                            Use category names consistent with your
                                            organization's existing registrations.
                                        </small>
                                    </div>
                                ) : displayed.categories.length > 0 ? (
                                    <div className="op-category-list">
                                        {displayed.categories.map((item, index) => {
                                            const label = getCategoryLabel(item);

                                            return (
                                                <span
                                                    className="op-category-chip"
                                                    key={`${label}-${index}`}
                                                >
                                                    <span aria-hidden="true">✓</span>
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="op-empty-categories">
                                        <span>◎</span>
                                        <p>No supported categories have been added yet.</p>
                                    </div>
                                )}
                            </section>

                            {editing && (
                                <div className="op-form-actions">
                                    <button
                                        type="button"
                                        className="op-secondary-button"
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="op-primary-button"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="op-button-spinner" />
                                                Saving changes...
                                            </>
                                        ) : (
                                            <>
                                                <span aria-hidden="true">✓</span>
                                                Save changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>

                        <section className="op-card">
                            <div className="op-card-heading">
                                <div>
                                    <h3>Verification documents</h3>
                                    <p>Document and approval status for your account.</p>
                                </div>
                            </div>

                            {profile.verification_document_url ? (
                                <div className="op-doc-table">
                                    <div className="op-doc-head">
                                        <span>DOCUMENT</span>
                                        <span>REVIEW STATUS</span>
                                        <span>ACTION</span>
                                    </div>

                                    <div className="op-doc-row">
                                        <span className="op-doc-name">
                                            <span className="op-doc-icon" aria-hidden="true">▤</span>
                                            Verification document
                                        </span>
                                        <span>
                                            <span
                                                className={`op-doc-status op-doc-status-${profile.status || "unknown"}`}
                                            >
                                                <span aria-hidden="true">
                                                    {isApproved ? "✓" : "◷"}
                                                </span>
                                                {isApproved ? "Approved" : statusText}
                                            </span>
                                        </span>
                                        <a
                                            href={profile.verification_document_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="op-doc-link"
                                        >
                                            View document →
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="op-empty-categories">
                                    <span>▤</span>
                                    <p>No verification document is available on your account.</p>
                                </div>
                            )}

                            <div className="op-review-note">
                                <strong>Changes may require review</strong>
                                <p>
                                    Account verification and approval are managed through
                                    the CivicSolve review process. Updates to legal identity
                                    or verification documents are reviewed by an administrator.
                                </p>
                            </div>
                        </section>
                    </div>

                    <aside className="op-side-column">
                        <section className="op-dark-card">
                            <div className="op-avatar-wrap">
                                <div className="op-avatar">
                                    {imagePreview || profile.profile_image_url ? (
                                        <img
                                            src={imagePreview || profile.profile_image_url}
                                            alt={`${profile.organization_name} profile`}
                                            className="op-avatar-image"
                                        />
                                    ) : (
                                        getInitials(profile.organization_name)
                                    )}
                                </div>

                                <label
                                    htmlFor="organization-profile-image"
                                    className="op-image-select"
                                >
                                    {imagePreview ? "Change selection" : "Change photo"}
                                </label>

                                <input
                                    id="organization-profile-image"
                                    className="op-image-input"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageSelect}
                                    disabled={imageUploading || imageRemoving}
                                />
                            </div>

                            <h3>{profile.organization_name || "Organization"}</h3>
                            <p className="op-dark-type">{getTypeLabel(profile.organization_type)}</p>

                            <div className="op-dark-status">
                                <span className={`op-dark-dot${isApproved ? "" : " is-pending"}`} />
                                {isApproved ? "Verified organization" : statusText}
                            </div>

                            <ul className="op-dark-list">
                                <li>
                                    <span aria-hidden="true">✉</span>
                                    {profile.email || "No email available"}
                                </li>
                                <li>
                                    <span aria-hidden="true">⌖</span>
                                    {locationText}
                                </li>
                                <li>
                                    <span aria-hidden="true">◎</span>
                                    {categoryLabels.length} service{" "}
                                    {categoryLabels.length === 1 ? "category" : "categories"} ·{" "}
                                    {serviceAreas.length}{" "}
                                    {serviceAreas.length === 1 ? "area" : "areas"}
                                </li>
                            </ul>

                            <div className="op-chip-row">
                                <span
                                    className={`op-chip${profile.email_verified ? "" : " is-pending"}`}
                                >
                                    {profile.email_verified ? "✓ Email verified" : "! Email not verified"}
                                </span>
                                <span className={`op-chip${isApproved ? " is-gold" : " is-pending"}`}>
                                    {isApproved ? "★ Active" : statusText}
                                </span>
                            </div>

                            {(imageFile || profile.profile_image_url) && (
                                <div className="op-photo-actions">
                                    <div className="op-image-help">
                                        <strong>
                                            {imageFile ? "Ready to upload" : "Profile photo saved"}
                                        </strong>
                                        <span>
                                            {imageFile
                                                ? `${imageFile.name} · ${(imageFile.size / 1024).toFixed(0)} KB`
                                                : "Your photo stays saved until you remove it."}
                                        </span>
                                    </div>

                                    <div className="op-image-buttons">
                                        {imageFile && (
                                            <button
                                                type="button"
                                                className="op-photo-btn op-photo-btn-primary"
                                                onClick={handleImageUpload}
                                                disabled={imageUploading || imageRemoving}
                                            >
                                                {imageUploading ? "Uploading..." : "Save photo"}
                                            </button>
                                        )}

                                        {profile.profile_image_url && (
                                            <button
                                                type="button"
                                                className="op-photo-btn"
                                                onClick={handleImageRemove}
                                                disabled={imageUploading || imageRemoving}
                                            >
                                                {imageRemoving ? "Removing..." : "Remove photo"}
                                            </button>
                                        )}

                                        {imageFile && (
                                            <button
                                                type="button"
                                                className="op-photo-btn"
                                                disabled={imageUploading || imageRemoving}
                                                onClick={() => {
                                                    setImageFile(null);
                                                    setImagePreview("");
                                                }}
                                            >
                                                Cancel selection
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="op-card op-account-card">
                            <div className="op-card-heading">
                                <div>
                                    <h3>Account information</h3>
                                    <p>Profile record details.</p>
                                </div>
                            </div>

                            <div className="op-detail-row">
                                <span>Organization ID</span>
                                <strong>#{profile.id ?? "—"}</strong>
                            </div>

                            <div className="op-detail-row">
                                <span>Registered on</span>
                                <strong>{formatDate(profile.created_at)}</strong>
                            </div>

                            <div className="op-detail-row">
                                <span>Last updated</span>
                                <strong>{formatDate(profile.updated_at)}</strong>
                            </div>

                            <div className="op-detail-row">
                                <span>Verified on</span>
                                <strong>{formatDate(profile.verified_at)}</strong>
                            </div>

                            <div className="op-account-footer">
                                <span className="op-account-footer-icon">i</span>
                                <p>
                                    Your organization ID and approval records are
                                    managed by CivicSolve.
                                </p>
                            </div>
                        </section>

                        <section className="op-card">
                            <div className="op-card-heading">
                                <div>
                                    <h3>Quick actions</h3>
                                </div>
                            </div>

                            <div className="op-quick-list">
                                <button
                                    type="button"
                                    className="op-quick-item"
                                    onClick={handleEdit}
                                    disabled={editing}
                                >
                                    <span className="op-quick-icon is-teal" aria-hidden="true">✎</span>
                                    Edit profile
                                </button>

                                <label
                                    htmlFor="organization-profile-image"
                                    className="op-quick-item"
                                >
                                    <span className="op-quick-icon is-navy" aria-hidden="true">▣</span>
                                    Change profile photo
                                </label>

                                {profile.verification_document_url && (
                                    <a
                                        href={profile.verification_document_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="op-quick-item"
                                    >
                                        <span className="op-quick-icon" aria-hidden="true">↗</span>
                                        Open verification document
                                    </a>
                                )}
                            </div>
                        </section>
                    </aside>
                </section>

                <footer className="op-footer">
                    <span>CivicSolve</span>
                    <span>Community · Action · Impact</span>
                </footer>
            </div>
        </div>
    );
}
