import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/citizenRegistration.css";
import LocationPicker from "../components/LocationPicker";
import CitizenIllustration from "../components/CitizenIllustration";

function CitizenRegistration() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        location: "",
        latitude: null,
        longitude: null,
        terms: false,
    });

    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const handleLocationChange = (locationData) => {
        setFormData((prev) => ({
            ...prev,
            location: locationData.location_name || "",
            latitude: locationData.latitude || null,
            longitude: locationData.longitude || null,
        }));

        if (errors.location) {
            setErrors((prev) => ({
                ...prev,
                location: "",
            }));
        }
    };

    const getPasswordStrength = () => {
        const password = formData.password;

        if (!password) {
            return {
                text: "",
                level: 0,
            };
        }

        let score = 0;

        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) {
            return {
                text: "Weak password",
                level: 1,
            };
        }

        if (score <= 4) {
            return {
                text: "Medium password",
                level: 2,
            };
        }

        return {
            text: "Strong password",
            level: 3,
        };
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Full name is required.";
        } else if (
            formData.fullName.trim().length < 2 ||
            formData.fullName.trim().length > 100
        ) {
            newErrors.fullName =
                "Name must contain 2–100 characters.";
        } else if (
            !/^[A-Za-z .'-]+$/.test(
                formData.fullName.trim()
            )
        ) {
            newErrors.fullName =
                "Full name can contain only letters, spaces, dots, apostrophes and hyphens.";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email.trim()
            )
        ) {
            newErrors.email =
                "Enter a valid email address.";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required.";
        } else if (
            !/^[6-9]\d{9}$/.test(
                formData.phone.trim()
            )
        ) {
            newErrors.phone =
                "Enter a valid 10-digit phone number.";
        }

        if (!formData.password) {
            newErrors.password = "Password is required.";
        } else if (formData.password.length < 8) {
            newErrors.password =
                "Password must contain at least 8 characters.";
        } else if (
            !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
                formData.password
            )
        ) {
            newErrors.password =
                "Use uppercase, lowercase, number and special character.";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword =
                "Please confirm your password.";
        } else if (
            formData.password !==
            formData.confirmPassword
        ) {
            newErrors.confirmPassword =
                "Passwords do not match.";
        }

        if (!formData.location.trim()) {
            newErrors.location =
                "Please select your location.";
        }

        if (!formData.terms) {
            newErrors.terms =
                "You must accept the terms and conditions.";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        const email = formData.email.trim().toLowerCase();

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/auth/citizen/register/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        full_name:
                            formData.fullName.trim(),
                        email: email,
                        phone:
                            formData.phone.trim(),
                        password:
                            formData.password,
                        confirm_password:
                            formData.confirmPassword,
                        location:
                            formData.location.trim(),
                        latitude:
                            formData.latitude,
                        longitude:
                            formData.longitude,
                        terms_accepted:
                            formData.terms,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const backendErrors = {};

                Object.keys(data || {}).forEach(
                    (field) => {
                        const value = data[field];

                        if (Array.isArray(value)) {
                            backendErrors[field] =
                                value[0];
                        } else if (
                            typeof value === "string"
                        ) {
                            backendErrors[field] =
                                value;
                        }
                    }
                );

                if (backendErrors.full_name) {
                    backendErrors.fullName =
                        backendErrors.full_name;

                    delete backendErrors.full_name;
                }

                if (
                    backendErrors.confirm_password
                ) {
                    backendErrors.confirmPassword =
                        backendErrors.confirm_password;

                    delete backendErrors.confirm_password;
                }

                if (backendErrors.terms_accepted) {
                    backendErrors.terms =
                        backendErrors.terms_accepted;

                    delete backendErrors.terms_accepted;
                }

                if (Object.keys(backendErrors).length > 0) {
                    setErrors(backendErrors);
                } else {
                    setErrors({
                        submit:
                            data.detail ||
                            data.message ||
                            "Registration failed. Please try again.",
                    });
                }

                return;
            }

            localStorage.setItem(
                "civicsolve_otp_email",
                email
            );

            localStorage.setItem(
                "civicsolve_otp_type",
                "citizen"
            );

            localStorage.setItem(
                "civicsolve_otp_message",
                data.message ||
                    "OTP sent to your email address."
            );

            navigate(
                `/verify-otp?email=${encodeURIComponent(
                    email
                )}`,
                {
                    state: {
                        email: email,
                        accountType: "citizen",
                        message:
                            data.message ||
                            "OTP sent to your email address.",
                    },
                }
            );
        } catch (error) {
            console.error(
                "Citizen registration error:",
                error
            );

            setErrors({
                submit:
                    "Unable to connect to CivicSolve server. Please make sure the Django backend is running.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="citizen-register-page">
            <div className="citizen-register-container">

                {/* One wide card: form on the left, illustration panel on the right.
                    (keep the class "citizen-register-card": LocationPicker styles use it) */}
                <div className="citizen-register-card">

                    {/* ================= LEFT: FORM ================= */}
                    <div className="cr-form-side">

                        <Link
                            to="/"
                            className="auth-brand"
                        >
                            <div className="auth-brand-icon">
                                C
                            </div>

                            <div>
                                <span>CivicSolve</span>

                                <small>
                                    Community • Action • Impact
                                </small>
                            </div>
                        </Link>

                        <div className="citizen-register-header">
                            <span className="auth-label">
                                CITIZEN REGISTRATION
                            </span>

                            <h1>
                                Create your account
                            </h1>

                            <p>
                                Join your community and help report,
                                track and solve important local
                                problems.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>

                            <div className="form-group">
                                <label>
                                    Full Name{" "}
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                />

                                {errors.fullName && (
                                    <small className="form-error">
                                        {errors.fullName}
                                    </small>
                                )}
                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        Email Address{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                    />

                                    {errors.email && (
                                        <small className="form-error">
                                            {errors.email}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        Phone Number{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="10-digit phone number"
                                        maxLength="10"
                                    />

                                    {errors.phone && (
                                        <small className="form-error">
                                            {errors.phone}
                                        </small>
                                    )}
                                </div>

                            </div>

                            {/* Location */}
                            <LocationPicker
                                value={{
                                    location_name:
                                        formData.location,
                                    latitude:
                                        formData.latitude,
                                    longitude:
                                        formData.longitude,
                                }}
                                onChange={
                                    handleLocationChange
                                }
                            />

                            {errors.location && (
                                <small className="form-error location-form-error">
                                    {errors.location}
                                </small>
                            )}

                            <div className="form-group">
                                <label>
                                    Password{" "}
                                    <span>*</span>
                                </label>

                                <div className="password-wrapper">
                                    <input
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create a strong password"
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                    >
                                        {showPassword
                                            ? "Hide"
                                            : "Show"}
                                    </button>
                                </div>

                                {formData.password && (
                                    <div className="password-strength">
                                        <div className="strength-bars">
                                            <span
                                                className={
                                                    passwordStrength.level >=
                                                    1
                                                        ? "active"
                                                        : ""
                                                }
                                            />

                                            <span
                                                className={
                                                    passwordStrength.level >=
                                                    2
                                                        ? "active"
                                                        : ""
                                                }
                                            />

                                            <span
                                                className={
                                                    passwordStrength.level >=
                                                    3
                                                        ? "active"
                                                        : ""
                                                }
                                            />
                                        </div>

                                        <small>
                                            {
                                                passwordStrength.text
                                            }
                                        </small>
                                    </div>
                                )}

                                {errors.password && (
                                    <small className="form-error">
                                        {errors.password}
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>
                                    Confirm Password{" "}
                                    <span>*</span>
                                </label>

                                <div className="password-wrapper">
                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="confirmPassword"
                                        value={
                                            formData.confirmPassword
                                        }
                                        onChange={handleChange}
                                        placeholder="Re-enter your password"
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                    >
                                        {showConfirmPassword
                                            ? "Hide"
                                            : "Show"}
                                    </button>
                                </div>

                                {errors.confirmPassword && (
                                    <small className="form-error">
                                        {
                                            errors.confirmPassword
                                        }
                                    </small>
                                )}
                            </div>

                            <div className="terms-container">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="terms"
                                        checked={formData.terms}
                                        onChange={handleChange}
                                    />

                                    <span>
                                        I agree to the CivicSolve{" "}
                                        <a href="#terms">
                                            Terms and Conditions
                                        </a>{" "}
                                        and Privacy Policy.
                                    </span>
                                </label>

                                {errors.terms && (
                                    <small className="form-error">
                                        {errors.terms}
                                    </small>
                                )}
                            </div>

                            {errors.submit && (
                                <div className="form-error submit-error">
                                    {errors.submit}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="primary-auth-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Creating Account..."
                                    : "Create Citizen Account"}
                            </button>
                        </form>

                        <div className="auth-bottom-text">
                            Already have an account?{" "}
                            <Link to="/login">
                                Login
                            </Link>
                        </div>

                        <Link
                            to="/register"
                            className="back-register"
                        >
                            ← Back to registration options
                        </Link>
                    </div>

                    {/* ================= RIGHT: ILLUSTRATION ================= */}
                    <aside
                        className="cr-art-side"
                        aria-hidden="true"
                    >
                        <CitizenIllustration />
                    </aside>

                </div>

                <p className="auth-footer">
                    © 2026 CivicSolve. Building better
                    communities together.
                </p>
            </div>
        </div>
    );
}

export default CitizenRegistration;