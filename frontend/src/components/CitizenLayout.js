import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import {
    getCitizenProfile,
    getCitizenUnreadNotificationCount,
} from "../services/api";

import {
    Link,
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    getCitizenFullName,
    clearCitizenSession,
} from "./utils/citizenSession";

import { API_ORIGIN } from "../services/api";

import logo from "../assets/logo-mark-white.png";
import "../styles/user/CitizenLayout.css";
import { useToast } from "./toast/ToastContext";
import CivicSolveAssistant from "../components/CivicSolveAssistant";

const NAV_LINKS = [
    { to: "/user/dashboard", label: "Dashboard" },
    { to: "/user/report", label: "Report Problem" },
    { to: "/user/my-problems", label: "My Problems" },
    { to: "/user/browse", label: "Browse Problems" },
    { to: "/user/problem-discussion", label: "Problem Discussion" },
];

function getInitials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "C";

    return parts
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

const BellIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
    </svg>
);

const Caret = () => (
    <svg
        viewBox="0 0 10 6"
        width="11"
        height="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M1 1l4 4 4-4" />
    </svg>
);

function getCitizenProfileImage(profile) {
    const image =
        profile?.profile_image_url ||
        profile?.profile_image ||
        profile?.image_url ||
        profile?.image;

    const imagePath = typeof image === "string" ? image : image?.url || "";

    if (!imagePath) return "";

    if (/^https?:\/\//i.test(imagePath)) return imagePath;

    return new URL(imagePath, `${API_ORIGIN}/`).href;
}

function CitizenLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const menuRef = useRef(null);
    const navRef = useRef(null);
    const loggingOutRef = useRef(false);

    const fullName = getCitizenFullName() || "Citizen";

    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [indicator, setIndicator] = useState({ left: 0, width: 0, show: false });
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [edge, setEdge] = useState({ left: false, right: false });
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [citizenProfileImage, setCitizenProfileImage] = useState("");

    /* ---------- logout flow ---------- */
    const handleLogoutClick = () => {
        if (loggingOutRef.current) return;
        setMenuOpen(false);
        setShowLogoutConfirm(true);
    };

    const handleCancelLogout = () => setShowLogoutConfirm(false);

    const handleConfirmLogout = () => {
        if (loggingOutRef.current) return;
        loggingOutRef.current = true;

        setShowLogoutConfirm(false);
        clearCitizenSession();

        showToast(
            "logout",
            "Logged Out Successfully",
            "You have safely logged out of CivicSolve. Taking you back to the home page…",
            3500,
            {
                pauseOnHover: false,
                onClose: () => {
                    navigate("/", { replace: true });
                },
            }
        );
    };

    /* ---------- nav helpers ---------- */
    const updateEdges = () => {
        const nav = navRef.current;
        if (!nav) return;

        setEdge({
            left: nav.scrollLeft > 2,
            right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2,
        });
    };

    /* ---------- profile image ---------- */
    useEffect(() => {
        let isMounted = true;

        const loadCitizenProfileImage = async () => {
            try {
                const response = await getCitizenProfile();
                const profile = response?.profile ?? response;

                if (isMounted) {
                    setCitizenProfileImage(getCitizenProfileImage(profile));
                }
            } catch (error) {
                console.error("Unable to load citizen profile image:", error);
            }
        };

        const handleProfileUpdated = () => loadCitizenProfileImage();

        loadCitizenProfileImage();
        window.addEventListener("citizen-profile-updated", handleProfileUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("citizen-profile-updated", handleProfileUpdated);
        };
    }, []);

    /* ---------- unread notification count ---------- */
    useEffect(() => {
        let active = true;

        const loadUnreadCount = async () => {
            try {
                const response = await getCitizenUnreadNotificationCount();

                if (active) {
                    setUnreadNotifications(
                        Number(response?.unread_count ?? response?.count ?? 0)
                    );
                }
            } catch {
                // Keep the layout working if notifications are unavailable.
            }
        };

        loadUnreadCount();

        return () => {
            active = false;
        };
    }, [location.pathname]);

    /* ---------- close profile menu on outside click ---------- */
    useEffect(() => {
        const handleClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    /* ---------- close menus on route change ---------- */
    useEffect(() => {
        setMenuOpen(false);
        setMobileOpen(false);
    }, [location.pathname]);

    /* ---------- scrolled state ---------- */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    /* ---------- nav edge fades ---------- */
    useEffect(() => {
        updateEdges();
        window.addEventListener("resize", updateEdges);
        return () => window.removeEventListener("resize", updateEdges);
    }, []);

    /* ---------- wheel scrolls nav horizontally ---------- */
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return undefined;

        const onWheel = (event) => {
            if (nav.scrollWidth <= nav.clientWidth) return;
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

            event.preventDefault();
            nav.scrollLeft += event.deltaY;
        };

        nav.addEventListener("wheel", onWheel, { passive: false });
        return () => nav.removeEventListener("wheel", onWheel);
    }, []);

    /* ---------- sliding pill behind the active link ---------- */
    useLayoutEffect(() => {
        const updateIndicator = () => {
            const nav = navRef.current;
            const active = nav?.querySelector(".cz-link.active");

            if (!active) {
                setIndicator((old) => ({ ...old, show: false }));
                return;
            }

            setIndicator({
                left: active.offsetLeft,
                width: active.offsetWidth,
                show: true,
            });
        };

        updateIndicator();

        const nav = navRef.current;
        const active = nav?.querySelector(".cz-link.active");

        if (active && nav) {
            nav.scrollTo({
                left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
                behavior: "smooth",
            });
        }

        window.addEventListener("resize", updateIndicator);

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                updateIndicator();
                updateEdges();
            });
        }

        return () => window.removeEventListener("resize", updateIndicator);
    }, [location.pathname]);

    /* ---------- Escape closes the logout modal ---------- */
    useEffect(() => {
        if (!showLogoutConfirm) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") handleCancelLogout();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showLogoutConfirm]);

    return (
        <div className="cz-shell">
            <header className={`cz-header ${scrolled ? "scrolled" : ""}`}>
                {/* decorative falling petals */}
                <div className="cz-bg" aria-hidden="true">
                    <span className="cz-petal cz-petal-1" />
                    <span className="cz-petal cz-petal-2" />
                    <span className="cz-petal cz-petal-3" />
                    <span className="cz-petal cz-petal-4" />
                    <span className="cz-petal cz-petal-5" />
                    <span className="cz-petal cz-petal-6" />
                </div>

                <div className="cz-bar-wrap">
                    <div className="cz-bar">
                        {/* Brand */}
                        <Link to="/user/dashboard" className="cz-brand">
                            <span className="cz-brand-mark">
                                <img src={logo} alt="CivicSolve" />
                            </span>

                            <span className="cz-brand-text">
                                <strong>CivicSolve</strong>
                                <small>Civic resolution</small>
                            </span>
                        </Link>

                        {/* Navigation */}
                        <nav
                            ref={navRef}
                            onScroll={updateEdges}
                            className={`cz-nav ${mobileOpen ? "open" : ""} ${
                                edge.left ? "fade-left" : ""
                            } ${edge.right ? "fade-right" : ""}`}
                            aria-label="Citizen navigation"
                        >
                            <span
                                className={`cz-indicator ${indicator.show ? "show" : ""}`}
                                style={{ left: indicator.left, width: indicator.width }}
                                aria-hidden="true"
                            />

                            {NAV_LINKS.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMobileOpen(false)}
                                    className={({ isActive }) =>
                                        isActive ? "cz-link active" : "cz-link"
                                    }
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Notifications + profile */}
                        <div className="cz-right">
                            <Link
                                to="/user/notifications"
                                className="cz-bell"
                                aria-label="Notifications"
                                title="Notifications"
                            >
                                <BellIcon />

                                {unreadNotifications > 0 && (
                                    <span className="cz-bell-count">
                                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                                    </span>
                                )}
                            </Link>

                            <div className="cz-profile" ref={menuRef}>
                                <button
                                    type="button"
                                    className="cz-profile-button"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    aria-expanded={menuOpen}
                                >
                                    <span className="cz-avatar">
                                        {citizenProfileImage && (
                                            <img
                                                src={citizenProfileImage}
                                                alt="Citizen profile"
                                                onError={(event) => {
                                                    event.currentTarget.style.display = "none";
                                                }}
                                            />
                                        )}
                                        <b>{getInitials(fullName)}</b>
                                    </span>

                                    <span className="cz-profile-name">{fullName}</span>

                                    <span className={`cz-caret ${menuOpen ? "up" : ""}`}>
                                        <Caret />
                                    </span>
                                </button>

                                {menuOpen && (
                                    <div className="cz-menu" role="menu">
                                        <div className="cz-menu-head">
                                            <span className="cz-menu-avatar">
                                                {citizenProfileImage && (
                                                    <img
                                                        src={citizenProfileImage}
                                                        alt="Citizen profile"
                                                        onError={(event) => {
                                                            event.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                )}
                                                <b>{getInitials(fullName)}</b>
                                            </span>

                                            <div>
                                                <strong>{fullName}</strong>
                                                <span>Community member</span>
                                            </div>
                                        </div>

                                        <Link to="/user/profile" onClick={() => setMenuOpen(false)}>
                                            My profile
                                        </Link>

                                        <button type="button" role="menuitem" onClick={handleLogoutClick}>
                                            Log out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile navigation toggle */}
                            <button
                                type="button"
                                className={`cz-burger ${mobileOpen ? "open" : ""}`}
                                onClick={() => setMobileOpen(!mobileOpen)}
                                aria-label="Toggle menu"
                                aria-expanded={mobileOpen}
                            >
                                <span />
                                <span />
                                <span />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main page */}
            <main className="cz-main">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="cz-footer">
                <div className="cz-footer-inner">
                    <span>CivicSolve · Building better communities together</span>

                    <div>
                        <Link to="/privacy">Privacy</Link>
                        <Link to="/terms">Terms</Link>
                        <Link to="/accessibility">Accessibility</Link>
                        <Link to="/help">Help</Link>
                    </div>
                </div>
            </footer>

            {/* Logout confirmation modal */}
            {showLogoutConfirm && (
                <div
                    className="logout-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) handleCancelLogout();
                    }}
                >
                    <div
                        className="logout-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="logout-modal-title"
                        aria-describedby="logout-modal-description"
                    >
                        <button
                            type="button"
                            className="logout-modal-close"
                            onClick={handleCancelLogout}
                            aria-label="Close logout confirmation"
                            autoFocus
                        >
                            &times;
                        </button>

                        <div className="logout-modal-icon" aria-hidden="true">
                            <svg
                                viewBox="0 0 24 24"
                                width="30"
                                height="30"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M10 17l5-5-5-5" />
                                <path d="M15 12H3" />
                                <path d="M12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" />
                            </svg>
                        </div>

                        <h2 id="logout-modal-title">Ready to leave?</h2>

                        <p id="logout-modal-description">
                            Are you sure you want to log out of your CivicSolve account? You can
                            sign in again whenever you are ready.
                        </p>

                        <div className="logout-modal-actions">
                            <button
                                type="button"
                                className="logout-cancel-btn"
                                onClick={handleCancelLogout}
                            >
                                Stay Logged In
                            </button>

                            <button
                                type="button"
                                className="logout-confirm-btn"
                                onClick={handleConfirmLogout}
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating CivicSolve AI Assistant */}
            <CivicSolveAssistant />
        </div>
    );
}

export default CitizenLayout;