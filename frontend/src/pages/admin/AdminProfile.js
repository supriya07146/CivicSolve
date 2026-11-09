
import React, { useEffect, useRef, useState } from "react";
import {
    getAdminProfile,
    updateAdminProfile,
    changeAdminPassword,
} from "../../services/api";
import { API_ORIGIN } from "../../services/api";
import "../../styles/admin/AdminProfile.css";

const initialForm = {
    full_name: "",
    email: "",
    phone: "",
    location: "",
    designation: "Administrator",
    department: "",
    bio: "",
};

const PASSWORD_FIELDS = [
    {
        name: "current_password",
        label: "Current password",
        placeholder: "Enter current password",
    },
    {
        name: "new_password",
        label: "New password",
        placeholder: "Enter new password",
    },
    {
        name: "confirm_password",
        label: "Confirm new password",
        placeholder: "Re-enter new password",
    },
];

function getImageUrl(image) {
    if (!image) return "";

    const imagePath = typeof image === "string" ? image : image.url || "";
    if (!imagePath) return "";

    if (imagePath.startsWith("blob:") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath;
    }

    return new URL(imagePath, `${API_ORIGIN}/`).href;
}

function getErrorMessage(error) {
    if (error?.message) return error.message;
    return "Something went wrong. Please try again.";
}

function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}

export default function AdminProfile() {
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);

    const [form, setForm] = useState(initialForm);
    const [imageUrl, setImageUrl] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const fileInputRef = useRef(null);
    const formRef = useRef(null);

    /* ---------------- data loading ---------------- */

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                setLoading(true);
                setError("");

                const response = await getAdminProfile();

                if (!mounted) return;

                const profile = response.data || {};

                setForm({
                    full_name: profile.full_name || "",
                    email: profile.email || "",
                    phone: profile.phone || "",
                    location: profile.location || "",
                    designation: profile.designation || "Administrator",
                    department: profile.department || "",
                    bio: profile.bio || "",
                });

                setImageUrl(getImageUrl(profile.profile_image));
            } catch (err) {
                if (mounted) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (imageUrl.startsWith("blob:")) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    /* Header's Save Changes button */

    useEffect(() => {
        const onSave = () => formRef.current?.requestSubmit();

        window.addEventListener("admin:save-profile", onSave);

        return () => {
            window.removeEventListener("admin:save-profile", onSave);
        };
    }, []);

    /* ---------------- password ---------------- */

    function handlePasswordChange(event) {
        const { name, value } = event.target;

        setPasswordForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setPasswordError("");
        setPasswordMessage("");
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();

        setPasswordError("");
        setPasswordMessage("");

        if (
            !passwordForm.current_password ||
            !passwordForm.new_password ||
            !passwordForm.confirm_password
        ) {
            setPasswordError("Please fill in all password fields.");
            return;
        }

        if (passwordForm.new_password.length < 8) {
            setPasswordError(
                "Your new password must contain at least 8 characters."
            );
            return;
        }

        if (
            passwordForm.new_password !==
            passwordForm.confirm_password
        ) {
            setPasswordError("The new passwords do not match.");
            return;
        }

        if (
            passwordForm.current_password ===
            passwordForm.new_password
        ) {
            setPasswordError(
                "Your new password must differ from your current password."
            );
            return;
        }

        setPasswordSaving(true);

        try {
            const response = await changeAdminPassword(passwordForm);

            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });

            setPasswordMessage(
                response.message || "Password changed successfully."
            );
        } catch (err) {
            setPasswordError(getErrorMessage(err));
        } finally {
            setPasswordSaving(false);
        }
    }

    /* ---------------- profile ---------------- */

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setFieldErrors((previous) => ({
            ...previous,
            [name]: "",
        }));

        setSuccess("");
    }

    function handleImageChange(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        setError("");
        setSuccess("");

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("Choose a JPG, PNG, or WebP image.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("The image must be 5 MB or smaller.");
            event.target.value = "";
            return;
        }

        setSelectedImage(file);
        setImageUrl(URL.createObjectURL(file));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");
        setFieldErrors({});

        if (!form.full_name.trim()) {
            setFieldErrors({
                full_name: "Full name is required.",
            });
            return;
        }

        if (form.full_name.trim().length > 100) {
            setFieldErrors({
                full_name: "Full name cannot exceed 100 characters.",
            });
            return;
        }

        if (form.phone.trim().length > 15) {
            setFieldErrors({
                phone: "Phone number cannot exceed 15 characters.",
            });
            return;
        }

        if (form.location.length > 255) {
            setFieldErrors({
                location: "Location cannot exceed 255 characters.",
            });
            return;
        }

        setSaving(true);

        try {
            const formData = new FormData();

            formData.append("full_name", form.full_name.trim());
            formData.append("phone", form.phone.trim());
            formData.append("location", form.location.trim());
            formData.append("designation", form.designation.trim());
            formData.append("department", form.department.trim());
            formData.append("bio", form.bio.trim());

            if (selectedImage) {
                formData.append("profile_image", selectedImage);
            }

            const response = await updateAdminProfile(formData);
            const profile = response.data || {};

            setForm({
                full_name: profile.full_name || "",
                email: profile.email || "",
                phone: profile.phone || "",
                location: profile.location || "",
                designation: profile.designation || "Administrator",
                department: profile.department || "",
                bio: profile.bio || "",
            });

            setImageUrl(getImageUrl(profile.profile_image));
            setSelectedImage(null);

            setSuccess(
                response.message || "Your profile was saved successfully."
            );

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            const responseErrors = err?.errors;

            if (
                responseErrors &&
                typeof responseErrors === "object"
            ) {
                setFieldErrors(responseErrors);
            }

            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    /* ---------------- render ---------------- */

    if (loading) {
        return (
            <div className="civ-admin-profile-page">
                <div className="civ-admin-profile-container">
                    <div className="civ-admin-profile-loading">
                        <div className="civ-admin-profile-spinner" />
                        <p>Loading your profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    const detailLines = [
        form.designation && ["Designation", form.designation],
        form.department && ["Department", form.department],
        form.location && ["Location", form.location],
    ].filter(Boolean);

    return (
        <div className="civ-admin-profile-page">
            <div className="civ-admin-profile-container">
                <nav
                    className="civ-admin-profile-breadcrumb"
                    aria-label="Breadcrumb"
                >
                    <span>Admin workspace</span>
                    <i>›</i>
                    <strong>Admin profile</strong>
                </nav>

                {error && (
                    <div
                        className="civ-admin-profile-alert civ-admin-profile-alert-error"
                        role="alert"
                    >
                        <span>!</span>
                        <div>{error}</div>
                        <button
                            type="button"
                            onClick={() => setError("")}
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {success && (
                    <div
                        className="civ-admin-profile-alert civ-admin-profile-alert-success"
                        role="status"
                    >
                        <span>✓</span>
                        <div>{success}</div>
                        <button
                            type="button"
                            onClick={() => setSuccess("")}
                            aria-label="Dismiss message"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className="civ-admin-profile-layout">
                    <div className="civ-admin-profile-main">
                        {/* Account details */}

                        <form
                            className="civ-admin-profile-card civ-admin-profile-card-teal"
                            onSubmit={handleSubmit}
                            ref={formRef}
                        >
                            <div className="civ-admin-profile-card-head">
                                <h2>Account details</h2>
                                <span className="civ-admin-profile-chip">
                                    ● Administrator account
                                </span>
                            </div>

                            <div className="civ-admin-profile-grid">
                                <div className="civ-admin-profile-field">
                                    <label htmlFor="full_name">
                                        Full name *
                                    </label>
                                    <input
                                        id="full_name"
                                        name="full_name"
                                        value={form.full_name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        maxLength={100}
                                        required
                                    />
                                    {fieldErrors.full_name && (
                                        <small className="civ-admin-profile-error-text">
                                            {String(fieldErrors.full_name)}
                                        </small>
                                    )}
                                </div>

                                <div className="civ-admin-profile-field civ-admin-profile-field-locked">
                                    <label htmlFor="email">
                                        Administrator email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        readOnly
                                        disabled
                                    />
                                    <small>
                                        Email cannot be changed from this page.
                                    </small>
                                </div>

                                <div className="civ-admin-profile-field">
                                    <label htmlFor="phone">
                                        Contact phone
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                        maxLength={15}
                                    />
                                    {fieldErrors.phone && (
                                        <small className="civ-admin-profile-error-text">
                                            {String(fieldErrors.phone)}
                                        </small>
                                    )}
                                </div>

                                <div className="civ-admin-profile-field">
                                    <label htmlFor="location">
                                        Location
                                    </label>
                                    <input
                                        id="location"
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        placeholder="City or office location"
                                        maxLength={255}
                                    />
                                    {fieldErrors.location && (
                                        <small className="civ-admin-profile-error-text">
                                            {String(fieldErrors.location)}
                                        </small>
                                    )}
                                </div>

                                <div className="civ-admin-profile-field">
                                    <label htmlFor="designation">
                                        Designation
                                    </label>
                                    <input
                                        id="designation"
                                        name="designation"
                                        value={form.designation}
                                        onChange={handleChange}
                                        placeholder="e.g. System Administrator"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="civ-admin-profile-field">
                                    <label htmlFor="department">
                                        Department
                                    </label>
                                    <input
                                        id="department"
                                        name="department"
                                        value={form.department}
                                        onChange={handleChange}
                                        placeholder="e.g. Administration"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="civ-admin-profile-field civ-admin-profile-field-full">
                                    <label htmlFor="bio">About me</label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        value={form.bio}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Write a short introduction..."
                                    />
                                </div>
                            </div>

                            <div className="civ-admin-profile-footer">
                                <p>
                                    <span>*</span> Required field
                                </p>

                                <button
                                    type="submit"
                                    className="civ-admin-profile-primary-btn"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="civ-admin-profile-btn-spinner" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save changes"
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Password and security */}

                        <section className="civ-admin-profile-card civ-admin-profile-card-amber">
                            <div className="civ-admin-profile-card-head">
                                <h2>Password &amp; security</h2>
                            </div>

                            {passwordError && (
                                <div
                                    className="civ-admin-profile-alert civ-admin-profile-alert-error"
                                    role="alert"
                                >
                                    <span>!</span>
                                    <div>{passwordError}</div>
                                    <button
                                        type="button"
                                        onClick={() => setPasswordError("")}
                                        aria-label="Dismiss error"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {passwordMessage && (
                                <div
                                    className="civ-admin-profile-alert civ-admin-profile-alert-success"
                                    role="status"
                                >
                                    <span>✓</span>
                                    <div>{passwordMessage}</div>
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit}>
                                <div className="civ-admin-profile-grid">
                                    {PASSWORD_FIELDS.map((field, index) => (
                                        <div
                                            key={field.name}
                                            className={`civ-admin-profile-field ${
                                                index === 0
                                                    ? "civ-admin-profile-field-full"
                                                    : ""
                                            }`}
                                        >
                                            <label htmlFor={field.name}>
                                                {field.label}
                                            </label>
                                            <input
                                                id={field.name}
                                                name={field.name}
                                                type={
                                                    showPasswords
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={passwordForm[field.name]}
                                                onChange={handlePasswordChange}
                                                placeholder={field.placeholder}
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>

                                <label className="civ-admin-profile-check">
                                    <input
                                        type="checkbox"
                                        checked={showPasswords}
                                        onChange={(event) =>
                                            setShowPasswords(event.target.checked)
                                        }
                                    />
                                    Show passwords
                                </label>

                                <div className="civ-admin-profile-note">
                                    <strong>Password requirements</strong>
                                    <p>
                                        Use at least 8 characters and satisfy your
                                        server's configured Django password validators.
                                    </p>
                                </div>

                                <div className="civ-admin-profile-footer">
                                    <p>
                                        Choose a password you do not use elsewhere.
                                    </p>

                                    <button
                                        type="submit"
                                        className="civ-admin-profile-dark-btn"
                                        disabled={passwordSaving}
                                    >
                                        {passwordSaving
                                            ? "Updating..."
                                            : "Update password"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* Profile summary */}

                    <aside className="civ-admin-profile-side">
                        <section className="civ-admin-profile-profile">
                            <div className="civ-admin-profile-avatar">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt="Administrator profile"
                                    />
                                ) : (
                                    <span>
                                        {getInitials(form.full_name)}
                                    </span>
                                )}
                            </div>

                            <h2>
                                {form.full_name || "Administrator"}
                            </h2>

                            <span className="civ-admin-profile-role">
                                <i /> CivicSolve Admin
                            </span>

                            {detailLines.length > 0 && (
                                <ul className="civ-admin-profile-lines">
                                    {detailLines.map(([label, value]) => (
                                        <li key={label}>
                                            <i />
                                            {label}: {value}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {form.email && (
                                <p className="civ-admin-profile-email">
                                    {form.email}
                                </p>
                            )}

                            <input
                                ref={fileInputRef}
                                className="civ-admin-profile-file-input"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                                aria-label="Choose profile photo"
                            />

                            <button
                                type="button"
                                className="civ-admin-profile-photo-btn"
                                onClick={() =>
                                    fileInputRef.current?.click()
                                }
                            >
                                Choose photo
                            </button>

                            <p className="civ-admin-profile-hint">
                                JPG, PNG or WebP. Maximum size: 5 MB.
                            </p>

                            {selectedImage && (
                                <p className="civ-admin-profile-selected">
                                    Selected: {selectedImage.name}. Click
                                    “Save changes” to upload it.
                                </p>
                            )}
                        </section>

                        <aside className="civ-admin-profile-info">
                            <strong>About your account</strong>
                            <p>
                                Your email is your sign-in identity and can't
                                be changed here. Update your name, contact
                                details and photo, then save.
                            </p>
                        </aside>
                    </aside>
                </div>
            </div>
        </div>
    );
}
