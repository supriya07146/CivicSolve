import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import logo from "../../assets/logo-mark-white.png";
import NotificationBell from "../notifications/NotificationBell";
import { API_ORIGIN, getAdminProfile } from "../../services/api";
import "../../styles/admin/AdminHeader.css";


/* every page lives in the scrollable nav now (no "More" dropdown) */
const NAV_ITEMS = [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Users", to: "/admin/users" },
    { label: "Organizations", to: "/admin/organizations" },
    { label: "Problems", to: "/admin/problems" },
    { label: "Assignments", to: "/admin/assignments" },
    { label: "Categories", to: "/admin/categories" },
    { label: "Solutions", to: "/admin/solutions" },
    { label: "Analytics", to: "/admin/analytics" },
    { label: "Notifications", to: "/admin/notifications" },
];


const BellIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
    </svg>
);

const Caret = () => (
    <svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 1l4 4 4-4" />
    </svg>
);

function getInitials(name) {
    if (!name) return "A";
    const parts = name.trim().split(/\s+/);
    return (
        (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase() || "A";
}


function readAdmin() {
    try {
        return JSON.parse(localStorage.getItem("admin") || "{}");
    } catch {
        return {};
    }
}


function AdminHeader() {

    const location = useLocation();
    const navigate = useNavigate();

    const adminData = readAdmin();

    const [userOpen, setUserOpen] = useState(false);
    const [adminProfile, setAdminProfile] = useState({});
    const [adminImageFailed, setAdminImageFailed] = useState(false);
    const [edge, setEdge] = useState({ left: false, right: false });
    const [duplicateCount, setDuplicateCount] = useState(0);

    const userRef = useRef(null);
    const navRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const loadAdminProfile = async () => {
            try {
                const response = await getAdminProfile();
                if (isMounted) {
                    setAdminProfile(response.data || {});
                    setAdminImageFailed(false);
                }
            } catch (error) {
                console.error("Unable to load admin header profile:", error);
            }
        };

        const handleProfileUpdated = () => loadAdminProfile();

        loadAdminProfile();
        window.addEventListener("admin:profile-updated", handleProfileUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("admin:profile-updated", handleProfileUpdated);
        };
    }, []);

    /* close the profile dropdown on outside click / route change */
    useEffect(() => {
        const onDown = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) {
                setUserOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    useEffect(() => {
        setUserOpen(false);
    }, [location.pathname]);


    /* pending AI duplicate suggestions, sent by the Problems page */
    useEffect(() => {
        const onCount = (e) => setDuplicateCount(Number(e.detail) || 0);
        window.addEventListener("admin:duplicate-count", onCount);
        return () => window.removeEventListener("admin:duplicate-count", onCount);
    }, []);


    /* ----- scrollable nav: edge fades + arrows + keep active link visible ----- */
    const updateEdges = () => {
        const el = navRef.current;
        if (!el) return;
        setEdge({
            left: el.scrollLeft > 4,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        });
    };

    useEffect(() => {
        updateEdges();
        window.addEventListener("resize", updateEdges);
        return () => window.removeEventListener("resize", updateEdges);
    }, []);

    useEffect(() => {
        const el = navRef.current;
        const active = el?.querySelector(".ad-nav-link.active");
        if (el && active) {
            const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
            el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
        }
        updateEdges();
    }, [location.pathname]);



    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("account_type");
        localStorage.removeItem("admin");

        navigate("/admin/login");
    };


    const getPageInfo = () => {

        const path = location.pathname;

        if (path.includes("/organizations")) {
            return { title: "Organizations", subtitle: "Review and manage registered organizations." };
        }
        if (path.includes("/users")) {
            const isList = path.replace(/\/+$/, "") === "/admin/users";
            return {
                title: "User Management",
                subtitle: isList
                    ? "Manage access fairly and protect the community's personal information."
                    : "Manage CivicSolve citizen accounts.",
                ...(isList && {
                    eyebrow: "ADMIN WORKSPACE · 03",
                    action: { label: "Export user directory", event: "admin:export-users" },
                }),
            };
        }
        if (path.includes("/problems")) {
            return {
                title: "Problem Management",
                subtitle: "Monitor and manage reported community problems.",
                action: {
                    label: "AI Duplicate Analysis",
                    event: "admin:open-duplicate-review",
                    ai: true,
                },
            };
        }
        if (path.includes("/assignments")) {
            return { title: "Problem Assignments", subtitle: "Assign reported problems to responsible organizations." };
        }
        if (path.includes("/categories")) {
            return {
                title: "Category Management",
                subtitle: "Manage community problem categories.",
                action: { label: "Add category", event: "admin:new-category" },
            };
        }
        if (path.includes("/solutions")) {
            return { title: "Solution Monitoring", subtitle: "Monitor proposed and completed solutions." };
        }
        if (path.includes("/notifications")) {
            return { title: "Notifications", subtitle: "Monitor CivicSolve system notifications." };
        }
        if (path.includes("/analytics")) {
            return { title: "Analytics", subtitle: "View CivicSolve platform performance and insights." };
        }
        if (path.includes("/profile")) {
            return { title: "Admin Profile", subtitle: "Manage your administrator account." };
        }

        return {
            title: "Platform overview",
            subtitle: "Monitor the community workflow and focus human review where it matters most.",
            sparkle: true,
            eyebrow: "ADMIN WORKSPACE · 02",
            action: { label: "Open review queue", to: "/admin/organizations" },
        };
    };

    const pageInfo = getPageInfo();
    const displayName =
        adminProfile.full_name || adminData.full_name || "Administrator";
    const profileImage = adminProfile.profile_image
        ? new URL(adminProfile.profile_image, `${API_ORIGIN}/`).href
        : "";


    return (
        <header className="ad-header">

            {/* decorative background */}
            <div className="ad-hero-deco" aria-hidden="true">
                <span className="ad-deco ad-deco-1" />
                <span className="ad-deco ad-deco-2" />
                <span className="ad-deco ad-deco-3" />
                <span className="ad-deco-map" />
            </div>

            <div className="ad-header-inner">

                {/* ---------- top bar ---------- */}
                <div className="ad-topbar">

                    <NavLink to="/admin/dashboard" className="ad-brand">
                        <span className="ad-brand-mark">
                            <img src={logo} alt="CivicSolve" width="34" height="34" />
                        </span>
                        <span className="ad-brand-text">
                            <strong>CivicSolve</strong>
                            <em>ADMIN PANEL</em>
                        </span>
                    </NavLink>


                    {/* scrollable navigation */}
                    <div className={`ad-nav-wrap ${edge.left ? "has-left" : ""} ${edge.right ? "has-right" : ""}`}>

                        <nav className="ad-nav" aria-label="Admin navigation"
                            ref={navRef} onScroll={updateEdges}>
                            {NAV_ITEMS.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `ad-nav-link ${isActive ? "active" : ""}`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                    </div>


                    <div className="ad-topbar-right">

                        <NotificationBell
                            renderTrigger={({ isOpen, unreadCount, toggleOpen }) => (
                                <button
                                    type="button"
                                    className={`ad-bell ${isOpen ? "is-active" : ""}`}
                                    title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                                    aria-label={`Notifications, ${unreadCount} unread`}
                                    onClick={toggleOpen}
                                >
                                    <BellIcon />
                                    {unreadCount > 0 && <span className="ad-bell-dot" />}
                                </button>
                            )}
                        />


                        <div className="ad-dropdown-wrap" ref={userRef}>

                            <button
                                type="button"
                                className="ad-user"
                                onClick={() => setUserOpen((o) => !o)}
                                aria-expanded={userOpen}
                            >
                                <span className="ad-avatar">
                                    {profileImage && !adminImageFailed ? (
                                        <img
                                            src={profileImage}
                                            alt=""
                                            onError={() => setAdminImageFailed(true)}
                                        />
                                    ) : (
                                        getInitials(displayName)
                                    )}
                                </span>
                                <span className="ad-user-name">{displayName}</span>
                                <Caret />
                            </button>

                            {userOpen && (
                                <div className="ad-dropdown ad-dropdown-right">
                                    <div className="ad-dropdown-head">
                                        <strong>{displayName}</strong>
                                        <span>Administrator</span>
                                    </div>
                                    <NavLink to="/admin/profile" className="ad-dropdown-item">
                                        Admin Profile
                                    </NavLink>
                                    <button type="button" className="ad-dropdown-item ad-danger" onClick={logout}>
                                        Logout
                                    </button>
                                </div>
                            )}

                        </div>

                    </div>

                </div>


                {/* ---------- page hero ---------- */}
                <div className="ad-hero-body" key={location.pathname}>

                    <div className="ad-hero-text">

                        <span className="ad-eyebrow">
                            {pageInfo.eyebrow || "ADMIN WORKSPACE"}
                        </span>

                        <h1>
                            {pageInfo.title}
                            {pageInfo.sparkle && <span className="ad-sparkle"> ✦</span>}
                        </h1>

                        <p>{pageInfo.subtitle}</p>

                    </div>

                    {pageInfo.action && (
                        <button
                            type="button"
                            className={`ad-hero-btn ${pageInfo.action.ai ? "ad-hero-btn-ai" : ""}`}
                            onClick={() =>
                                pageInfo.action.to
                                    ? navigate(pageInfo.action.to)
                                    : window.dispatchEvent(new CustomEvent(pageInfo.action.event))
                            }
                        >
                            {pageInfo.action.ai && <span className="ad-ai-spark">✦</span>}

                            <span className="ad-ai-text">{pageInfo.action.label}</span>

                            {pageInfo.action.ai && duplicateCount > 0 && (
                                <span
                                    className="ad-ai-badge"
                                    aria-label={`${duplicateCount} pending suggestions`}
                                >
                                    {duplicateCount > 99 ? "99+" : duplicateCount}
                                </span>
                            )}
                        </button>
                    )}

                </div>

            </div>

        </header>
    );
}

export default AdminHeader;