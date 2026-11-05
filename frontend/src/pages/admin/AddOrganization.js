import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createAdminOrganization } from "../../services/api";

import "../../styles/admin/Addorganization.css";


// IMPORTANT: these values must match the choices in your Organization model
// (organization_type). Change the list below if your model uses other values.
const ORGANIZATION_TYPES = [
    { value: "ngo", label: "NGO" },
    { value: "government", label: "Government department" },
    { value: "private", label: "Private company" },
    { value: "community", label: "Community group" },
];

const EMPTY_FORM = {
    organization_name: "",
    organization_type: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    service_area: "",
    categories: "",
    description: "",
    latitude: "",
    longitude: "",
    password: "",
};

const REQUIRED = ["organization_name", "organization_type", "email"];


/* ---------- small helpers / icons ---------- */

function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const Icon = ({ children }) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

const BuildingIcon = () => (
    <Icon>
        <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16" />
        <path d="M16 9h2a2 2 0 012 2v10M2 21h20" />
        <path d="M8 7h4M8 11h4M8 15h4" />
    </Icon>
);

const ContactIcon = () => (
    <Icon>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3.5 7.5l8.5 6 8.5-6" />
    </Icon>
);

const PinIcon = () => (
    <Icon>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
    </Icon>
);

const FileIcon = () => (
    <Icon>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
        <path d="M14 3v5h5" />
    </Icon>
);

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
);

const EyeIcon = ({ off }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {off && <path d="M3 3l18 18" />}
    </svg>
);

const BackIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
);


function SectionHead({ number, icon, title, hint }) {
    return (
        <div className="ao-section-head">
            <span className="ao-step">{icon}</span>
            <div>
                <h3><em>{number}</em>{title}</h3>
                <p>{hint}</p>
            </div>
        </div>
    );
}


function AddOrganization() {

    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [docFile, setDocFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    /* ----- required-field progress ----- */
    const doneCount = REQUIRED.filter((key) => String(form[key]).trim() !== "").length;
    const progress = Math.round((doneCount / REQUIRED.length) * 100);

    const isInvalid = (key) =>
        attempted && REQUIRED.includes(key) && String(form[key]).trim() === "";

    /* ----- file picking ----- */
    const pickFile = (file) => {
        if (!file) return;
        setDocFile(file);
    };

    const onDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        pickFile(event.dataTransfer.files?.[0]);
    };

    const removeFile = () => {
        setDocFile(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setSuccess("");
        setAttempted(true);

        if (!form.organization_name.trim() || !form.email.trim() || !form.organization_type) {
            setError("Organization name, type and email are required.");
            return;
        }

        const payload = new FormData();

        Object.entries(form).forEach(([key, value]) => {

            const trimmed = typeof value === "string" ? value.trim() : value;

            if (trimmed === "") return;

            if (key === "categories") {
                const list = trimmed
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

                payload.append("categories", JSON.stringify(list));
                return;
            }

            payload.append(key, trimmed);
        });

        if (docFile) {
            payload.append("verification_document", docFile);
        }

        try {

            setSubmitting(true);

            const response = await createAdminOrganization(payload);

            setSuccess(response.message || "Organization added successfully.");

            setTimeout(() => navigate("/admin/organizations"), 1200);

        } catch (err) {

            setError(err.message || "Could not add the organization.");

        } finally {

            setSubmitting(false);
        }
    };

    const categoryChips = form.categories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return (

        <div className="ao-page">

            <div className="ao-container">

                <button
                    type="button"
                    className="ao-back"
                    onClick={() => navigate("/admin/organizations")}
                >
                    <BackIcon /> Back to organizations
                </button>

                <div className="ao-card">

                    {/* ---------- hero ---------- */}
                    <header className="ao-hero">

                        <span className="ao-hero-shape ao-hero-shape-1" />
                        <span className="ao-hero-shape ao-hero-shape-2" />

                        <div className="ao-hero-text">
                            <span className="ao-eyebrow"><i />NEW ORGANIZATION</span>
                            <h2>Add organization</h2>
                            <p>
                                Organizations added here are approved and active
                                immediately.
                            </p>
                        </div>

                        <div className="ao-progress" aria-label="Required details progress">
                            <div className="ao-progress-top">
                                <span>Required details</span>
                                <b>{doneCount}/{REQUIRED.length}</b>
                            </div>
                            <div className="ao-progress-bar">
                                <span style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                    </header>


                    <div className="ao-body">

                        {error && (
                            <div className="ao-alert ao-alert-error" role="alert">
                                <span className="ao-alert-icon">!</span>
                                <p>{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="ao-alert ao-alert-success" role="status">
                                <span className="ao-alert-icon">✓</span>
                                <p>{success}</p>
                            </div>
                        )}

                        <form className="ao-form" onSubmit={handleSubmit} noValidate>

                            {/* ---------- 1. details ---------- */}
                            <fieldset className="ao-section" style={{ "--i": 0 }}>
                                <legend className="ao-sr-only">Organization details</legend>

                                <SectionHead
                                    number="01"
                                    icon={<BuildingIcon />}
                                    title="Organization details"
                                    hint="Who they are and what they handle."
                                />

                                <div className="ao-grid">

                                    <label className={`ao-field ao-span-2 ${isInvalid("organization_name") ? "is-invalid" : ""}`}>
                                        <span>Organization name <b>*</b></span>
                                        <input
                                            name="organization_name"
                                            value={form.organization_name}
                                            onChange={handleChange}
                                            placeholder="e.g. Green Kakinada Foundation"
                                        />
                                        {isInvalid("organization_name") && <small className="ao-error-text">Required</small>}
                                    </label>

                                    <label className={`ao-field ${isInvalid("organization_type") ? "is-invalid" : ""}`}>
                                        <span>Organization type <b>*</b></span>
                                        <select
                                            name="organization_type"
                                            value={form.organization_type}
                                            onChange={handleChange}
                                        >
                                            <option value="">Select type</option>
                                            {ORGANIZATION_TYPES.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                        {isInvalid("organization_type") && <small className="ao-error-text">Required</small>}
                                    </label>

                                    <label className="ao-field">
                                        <span>Categories handled</span>
                                        <input
                                            name="categories"
                                            value={form.categories}
                                            onChange={handleChange}
                                            placeholder="Roads, Water, Sanitation"
                                        />
                                        <small>Separate with commas.</small>
                                    </label>

                                    {categoryChips.length > 0 && (
                                        <div className="ao-chips ao-span-2" aria-label="Category preview">
                                            {categoryChips.map((chip, i) => (
                                                <span key={`${chip}-${i}`} className="ao-chip">{chip}</span>
                                            ))}
                                        </div>
                                    )}

                                    <label className="ao-field ao-span-2">
                                        <span>Description</span>
                                        <textarea
                                            name="description"
                                            rows="3"
                                            value={form.description}
                                            onChange={handleChange}
                                            placeholder="What does this organization do?"
                                        />
                                    </label>

                                </div>
                            </fieldset>


                            {/* ---------- 2. contact ---------- */}
                            <fieldset className="ao-section" style={{ "--i": 1 }}>
                                <legend className="ao-sr-only">Contact</legend>

                                <SectionHead
                                    number="02"
                                    icon={<ContactIcon />}
                                    title="Contact"
                                    hint="How to reach them and let them sign in."
                                />

                                <div className="ao-grid">

                                    <label className={`ao-field ${isInvalid("email") ? "is-invalid" : ""}`}>
                                        <span>Email <b>*</b></span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="contact@organization.org"
                                        />
                                        {isInvalid("email") && <small className="ao-error-text">Required</small>}
                                    </label>

                                    <label className="ao-field">
                                        <span>Phone</span>
                                        <input
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            inputMode="tel"
                                            placeholder="10-digit mobile number"
                                        />
                                    </label>

                                    <label className="ao-field ao-span-2">
                                        <span>Login password</span>
                                        <div className="ao-password">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={form.password}
                                                onChange={handleChange}
                                                autoComplete="new-password"
                                                placeholder="At least 8 characters"
                                            />
                                            <button
                                                type="button"
                                                className="ao-eye"
                                                onClick={() => setShowPassword((v) => !v)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                <EyeIcon off={showPassword} />
                                            </button>
                                        </div>
                                        <small>Optional. Lets the organization sign in.</small>
                                    </label>

                                </div>
                            </fieldset>


                            {/* ---------- 3. location ---------- */}
                            <fieldset className="ao-section" style={{ "--i": 2 }}>
                                <legend className="ao-sr-only">Location and service area</legend>

                                <SectionHead
                                    number="03"
                                    icon={<PinIcon />}
                                    title="Location and service area"
                                    hint="Where they are based and the areas they cover."
                                />

                                <div className="ao-grid">

                                    <label className="ao-field ao-span-2">
                                        <span>Address</span>
                                        <input
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            placeholder="Street, area, landmark"
                                        />
                                    </label>

                                    <label className="ao-field">
                                        <span>City</span>
                                        <input
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                        />
                                    </label>

                                    <label className="ao-field">
                                        <span>State</span>
                                        <input
                                            name="state"
                                            value={form.state}
                                            onChange={handleChange}
                                        />
                                    </label>

                                    <label className="ao-field ao-span-2">
                                        <span>Service area</span>
                                        <input
                                            name="service_area"
                                            value={form.service_area}
                                            onChange={handleChange}
                                            placeholder="Areas or wards this organization covers"
                                        />
                                    </label>

                                    <label className="ao-field">
                                        <span>Latitude</span>
                                        <input
                                            name="latitude"
                                            value={form.latitude}
                                            onChange={handleChange}
                                            inputMode="decimal"
                                            placeholder="e.g. 16.9891"
                                        />
                                    </label>

                                    <label className="ao-field">
                                        <span>Longitude</span>
                                        <input
                                            name="longitude"
                                            value={form.longitude}
                                            onChange={handleChange}
                                            inputMode="decimal"
                                            placeholder="e.g. 82.2475"
                                        />
                                    </label>

                                </div>
                            </fieldset>


                            {/* ---------- 4. document ---------- */}
                            <fieldset className="ao-section" style={{ "--i": 3 }}>
                                <legend className="ao-sr-only">Verification document</legend>

                                <SectionHead
                                    number="04"
                                    icon={<FileIcon />}
                                    title="Verification document"
                                    hint="Registration certificate or ID proof (PDF, JPG or PNG)."
                                />

                                {!docFile ? (
                                    <label
                                        className={`ao-drop ${dragging ? "is-dragging" : ""}`}
                                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={onDrop}
                                    >
                                        <span className="ao-drop-icon"><UploadIcon /></span>
                                        <strong>Click to upload or drag a file here</strong>
                                        <small>PDF, JPG or PNG</small>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(event) => pickFile(event.target.files[0])}
                                        />
                                    </label>
                                ) : (
                                    <div className="ao-file">
                                        <span className="ao-file-icon"><FileIcon /></span>
                                        <div className="ao-file-info">
                                            <strong>{docFile.name}</strong>
                                            <small>{formatSize(docFile.size)} · Ready to upload</small>
                                        </div>
                                        <button type="button" className="ao-file-remove"
                                            onClick={removeFile} aria-label="Remove file">
                                            ×
                                        </button>
                                    </div>
                                )}
                            </fieldset>


                            {/* ---------- actions ---------- */}
                            <div className="ao-actions">

                                <button
                                    type="button"
                                    className="ao-btn ao-btn-ghost"
                                    onClick={() => navigate("/admin/organizations")}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="ao-btn ao-btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting && <span className="ao-spinner" />}
                                    {submitting ? "Adding..." : "Add organization"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default AddOrganization;