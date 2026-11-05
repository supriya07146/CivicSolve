import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminLogin } from "../../services/api";
import "../../styles/admin/AdminLogin.css";
import illustration from "../../assets/admin-illustration.png";
import logo from "../../assets/logo-mark-white.png";

/* ---------- small inline icons ---------- */

const MailIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3.5 7.5l8.5 6 8.5-6" />
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </svg>
);

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.6A9.7 9.7 0 0112 5.5c6.4 0 10 6.5 10 6.5a17 17 0 01-3.2 3.9M6.3 6.8A16.6 16.6 0 002 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1" />
        <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);


/* ---------- illustration (cut from your reference image, recolored green) ---------- */

function AdminIllustration() {
    return (
        <div className="admin-illustration-wrap" aria-hidden="true">
            <span className="admin-ill-blob" />
            <img
                className="admin-illustration"
                src={illustration}
                alt=""
                draggable="false"
            />
            <span className="admin-spark admin-spark-1" />
            <span className="admin-spark admin-spark-2" />
            <span className="admin-spark admin-spark-3" />
        </div>
    );
}


function AdminLogin() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        setError("");
    };



    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        const email = formData.email.trim();

        if (!email || !formData.password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        try {
            const response = await adminLogin({
                email,
                password: formData.password,
            });

            console.log("Admin login response:", response);

            // Verify the response format returned by Django.
            const tokens = response.tokens || {
                access: response.access,
                refresh: response.refresh,
            };

            if (response.success === false) {
                throw new Error(
                    response.message || "Admin login failed."
                );
            }

            if (!tokens.access || !tokens.refresh) {
                throw new Error(
                    "Login response is missing access or refresh tokens. Check AdminLoginView in Django."
                );
            }

            const adminData =
                response.admin ||
                response.user ||
                response.data?.admin;

            if (!adminData) {
                throw new Error(
                    "Login response is missing admin details. Check the Django response format."
                );
            }

            localStorage.setItem("access_token", tokens.access);
            localStorage.setItem("refresh_token", tokens.refresh);
            localStorage.setItem("account_type", "admin");
            localStorage.setItem("admin", JSON.stringify(adminData));

            navigate("/admin/dashboard", { replace: true });
        } catch (error) {
            console.error("Admin login error:", error);

            setError(
                error.message || "Unable to log in. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">

            {/* animated background shapes */}
            <span className="admin-bg-shape admin-bg-shape-1" />
            <span className="admin-bg-shape admin-bg-shape-2" />
            <span className="admin-bg-shape admin-bg-shape-3" />

            <div className="admin-login-shell">

                {/* LEFT : brand + illustration */}
                <div className="admin-login-visual">

                    <div className="admin-brand">
                        <div className="admin-brand-logo"><img src={logo} alt="CivicSolve" /></div>
                        <div>
                            <strong>CivicSolve</strong>
                            <span>Report Problems. Collaborate on Solutions. Create Impact.</span>
                        </div>
                    </div>

                    <AdminIllustration />

                </div>


                {/* RIGHT : admin login window card */}
                <div className="admin-login-side">

                    <div className="admin-login-card">

                        <div className="admin-window-bar">
                            <span className="admin-dot" />
                            <span className="admin-dot" />
                            <span className="admin-dot" />
                            <span className="admin-address">
                                <LockIcon /> civicsolve / admin
                            </span>
                        </div>

                        <div className="admin-login-body">

                            <div className="admin-login-header">

                                <div className="admin-logo">
                                    <img src={logo} alt="CivicSolve" />
                                    <span className="admin-logo-badge">
                                        <ShieldIcon />
                                    </span>
                                </div>

                                <h1>Admin Login</h1>

                                <p>
                                    Sign in to manage CivicSolve
                                </p>

                            </div>


                            {error && (
                                <div className="admin-login-error" role="alert">
                                    {error}
                                </div>
                            )}


                            <form onSubmit={handleSubmit}>

                                <div className="admin-form-group">

                                    <label htmlFor="admin-email">
                                        Email Address
                                    </label>

                                    <div className="admin-input-wrap">
                                        <span className="admin-input-icon"><MailIcon /></span>
                                        <input
                                            id="admin-email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter admin email"
                                            autoComplete="username"
                                            required
                                        />
                                    </div>

                                </div>


                                <div className="admin-form-group">

                                    <label htmlFor="admin-password">
                                        Password
                                    </label>

                                    <div className="admin-input-wrap">
                                        <span className="admin-input-icon"><LockIcon /></span>
                                        <input
                                            id="admin-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter password"
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="admin-eye-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>

                                </div>


                                <button
                                    type="submit"
                                    className="admin-login-button"
                                    disabled={loading}
                                >

                                    {loading && <span className="admin-spinner" />}

                                    {loading
                                        ? "Signing in..."
                                        : "Sign In"
                                    }

                                </button>

                            </form>


                            <div className="admin-login-footer">

                                <span>
                                    CivicSolve Administration
                                </span>

                            </div>

                        </div>

                    </div>

                    <div className="admin-secure-chip">
                        <ShieldIcon /> Secured with JWT authentication
                    </div>

                </div>

            </div>

        </div>
    );
}


export default AdminLogin;