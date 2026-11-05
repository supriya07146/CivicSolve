import React, { useState } from "react";
import { Link } from "react-router-dom";

import { getStoredCitizen } from "../../utils/citizenSession";

import "../../styles/user/CitizenPages.css";


function getInitials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "C";
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}


function MyProfile() {

    const stored = getStoredCitizen();

    // TODO: load the real profile from your backend
    const [profile, setProfile] = useState({
        fullName: stored.full_name || stored.name || stored.user_name || stored.username || "",
        email: stored.email || "",
        phone: stored.phone || "",
        city: stored.city || "",
        address: stored.address || "",
    });

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(profile);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDraft((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const startEdit = () => {
        setDraft(profile);
        setSuccess("");
        setEditing(true);
    };

    const cancelEdit = () => {
        setErrors({});
        setEditing(false);
    };

    const handleSave = async (e) => {

        e.preventDefault();

        const newErrors = {};

        if (!draft.fullName.trim()) {
            newErrors.fullName = "Full name is required.";
        }

        if (draft.phone.trim() && !/^[6-9]\d{9}$/.test(draft.phone.trim())) {
            newErrors.phone = "Enter a valid 10-digit phone number.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {

            setSaving(true);

            // TODO: call your "update citizen profile" endpoint
            await new Promise((resolve) => setTimeout(resolve, 500));

            setProfile(draft);
            setEditing(false);
            setSuccess("Profile updated.");

        } catch (err) {

            setErrors({ submit: err.message || "Could not save changes." });

        } finally {

            setSaving(false);
        }
    };

    const displayName = profile.fullName || "Citizen";

    return (

        <div className="cp-page">

            <section className="cp-band">
                <div className="cp-band-inner">
                    <div>
                        <span className="cp-eyebrow">MY PROFILE</span>
                        <h1>Your account</h1>
                        <p>Keep your contact details up to date and see your community impact.</p>
                    </div>
                </div>
            </section>

            <div className="cp-wrap">

                <div className="cp-profile-grid">

                    <aside className="cp-card cp-profile-card">

                        <div className="cp-profile-avatar">{getInitials(displayName)}</div>

                        <h2>{displayName}</h2>
                        <p>{profile.email || "Citizen account"}</p>

                        <div className="cp-badges">
                            <span className="cp-badge cp-badge-teal">Top Reporter</span>
                            <span className="cp-badge cp-badge-gold">Active Member</span>
                        </div>

                        {/* TODO: replace with real numbers from your backend */}
                        <div className="cp-mini-stats">
                            <div><strong>12</strong><span>Reports</span></div>
                            <div><strong>28</strong><span>Helpful votes</span></div>
                            <div><strong>8</strong><span>Confirmations</span></div>
                        </div>

                    </aside>

                    <section className="cp-card">

                        <div className="cp-profile-head">
                            <h2>Personal details</h2>

                            {!editing && (
                                <button type="button" className="cp-btn cp-btn-light cp-btn-small" onClick={startEdit}>
                                    Edit
                                </button>
                            )}
                        </div>

                        {success && (
                            <div className="cp-alert cp-alert-success" role="status">{success}</div>
                        )}

                        {errors.submit && (
                            <div className="cp-alert cp-alert-error" role="alert">{errors.submit}</div>
                        )}

                        <form onSubmit={handleSave} noValidate>

                            <div className="cp-row">

                                <div className="cp-field">
                                    <label>Full name</label>
                                    <input
                                        name="fullName"
                                        value={editing ? draft.fullName : profile.fullName}
                                        onChange={handleChange}
                                        disabled={!editing}
                                    />
                                    {errors.fullName && <small className="cp-error">{errors.fullName}</small>}
                                </div>

                                <div className="cp-field">
                                    <label>Email</label>
                                    <input value={profile.email} disabled />
                                </div>

                            </div>

                            <div className="cp-row">

                                <div className="cp-field">
                                    <label>Phone</label>
                                    <input
                                        name="phone"
                                        value={editing ? draft.phone : profile.phone}
                                        onChange={handleChange}
                                        disabled={!editing}
                                        maxLength="10"
                                    />
                                    {errors.phone && <small className="cp-error">{errors.phone}</small>}
                                </div>

                                <div className="cp-field">
                                    <label>City</label>
                                    <input
                                        name="city"
                                        value={editing ? draft.city : profile.city}
                                        onChange={handleChange}
                                        disabled={!editing}
                                    />
                                </div>

                            </div>

                            <div className="cp-field">
                                <label>Address</label>
                                <textarea
                                    name="address"
                                    rows="3"
                                    value={editing ? draft.address : profile.address}
                                    onChange={handleChange}
                                    disabled={!editing}
                                />
                            </div>

                            {editing && (
                                <div className="cp-form-actions">
                                    <button type="button" className="cp-btn cp-btn-light" onClick={cancelEdit} disabled={saving}>
                                        Cancel
                                    </button>

                                    <button type="submit" className="cp-btn cp-btn-primary" disabled={saving}>
                                        {saving ? "Saving..." : "Save changes"}
                                    </button>
                                </div>
                            )}

                        </form>

                        <div className="cp-section-title">Security</div>

                        <Link to="/forgot-password" className="cp-btn cp-btn-light cp-btn-small">
                            Change password
                        </Link>

                    </section>

                </div>

            </div>

        </div>
    );
}

export default MyProfile;