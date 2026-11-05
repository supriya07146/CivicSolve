
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../../styles/organization/OrganizationLayout.css";
import { getOrganizationProfile } from "../../services/api";
import { useToast } from "../../components/toast/ToastContext";
import logo from "../../assets/logo-mark-white.png";

/*
  Logo: an SVG recreation of the CivicSolve mark.
  To use your real logo file, put it in /public
  (e.g. /public/civicsolve-logo.png)
  and set LOGO_SRC = "/civicsolve-logo.png".
*/


const PRIMARY_NAV = [
    { label: "Dashboard", path: "/organization/dashboard" },
    { label: "Available Problems", path: "/organization/available-problems" },
    { label: "Active Problems", path: "/organization/active-problems" },
    { label: "Resolved Problems", path: "/organization/resolved-problems" },
    { label: "Provide Solutions", path: "/organization/solutions" },
    { label: "Update Progress", path: "/organization/progress" },
];

const MORE_NAV = [];

const DJANGO_BASE_URL = "http://127.0.0.1:8000";

export function getOrganizationImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== "string") {
        return null;
    }

    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
        return null;
    }

    if (
        trimmedUrl.startsWith("http://") ||
        trimmedUrl.startsWith("https://") ||
        trimmedUrl.startsWith("data:")
    ) {
        return trimmedUrl;
    }

    return `${DJANGO_BASE_URL}${trimmedUrl.startsWith("/") ? "" : "/"}${trimmedUrl}`;
}

function CivicLogo() {
    return (
        <span className="org-brand-mark">
            <img src={logo} alt="CivicSolve" width="24" height="24" />
        </span>
    );
}

export default function OrganizationLayout() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

    const [org, setOrg] = useState({
        name: "",
        profile_image_url: null,
    });

    const [menu, setMenu] = useState(null);
    const headerRef = useRef(null);

    /*
     * Centralized organization state updater.
     *
     * OrganizationProfile can pass either an object or a functional
     * updater. This wrapper ensures every image URL is converted into
     * a valid Django media URL before it reaches the header.
     */
    const updateOrganization = (updater) => {
        setOrg((previous) => {
            const updated =
                typeof updater === "function"
                    ? updater(previous)
                    : updater;

            if (!updated) {
                return previous;
            }

            return {
                ...previous,
                ...updated,
                profile_image_url: getOrganizationImageUrl(
                    updated.profile_image_url
                ),
            };
        });
    };

    // Reset the image error state when the image URL changes.
    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [org.profile_image_url]);

    /*
     * Load organization details into the persistent header.
     * The existing image is preserved if the API does not return
     * the profile_image_url field.
     */
    useEffect(() => {
        let isMounted = true;

        const loadOrganizationHeader = async () => {
            try {
                const response = await getOrganizationProfile();
                const data = response?.profile || response;

                if (!isMounted || !data) {
                    return;
                }

                const hasImageField = Object.prototype.hasOwnProperty.call(
                    data,
                    "profile_image_url"
                );

                const imageUrl = hasImageField
                    ? getOrganizationImageUrl(data.profile_image_url)
                    : undefined;

                setOrg((previous) => ({
                    ...previous,
                    name:
                        data.organization_name ||
                        data.name ||
                        previous.name,
                    profile_image_url: hasImageField
                        ? imageUrl
                        : previous.profile_image_url,
                }));
            } catch (error) {
                console.error(
                    "Unable to load organization header profile:",
                    error
                );
            }
        };

        // Initial load
        loadOrganizationHeader();

        // Reload on route changes to ensure image persists
        const unlisten = () => {};
        // We'll use a separate effect below for route changes.
        return () => {
            isMounted = false;
        };
    }, []);

    // Reload organization header when the route changes to keep the avatar visible across modules
    useEffect(() => {
        // Re-fetch header without resetting image if already present
        const loadHeaderOnNav = async () => {
            try {
                const response = await getOrganizationProfile();
                const data = response?.profile || response;
                if (!data) return;
                const hasImageField = Object.prototype.hasOwnProperty.call(
                    data,
                    "profile_image_url"
                );
                const imageUrl = hasImageField
                    ? getOrganizationImageUrl(data.profile_image_url)
                    : undefined;
                setOrg((previous) => ({
                    ...previous,
                    name:
                        data.organization_name ||
                        data.name ||
                        previous.name,
                    profile_image_url: hasImageField
                        ? imageUrl
                        : previous.profile_image_url,
                }));
            } catch (e) {
                console.error(e);
            }
        };
        loadHeaderOnNav();
    }, [location.pathname]);

    // Handle organization session expiry.
    useEffect(() => {
        const handleSessionExpired = (event) => {
            if (event.detail?.accountType !== "organization") {
                return;
            }

            showToast(
                "error",
                "Session Expired",
                "Your session has expired. Please log in again."
            );

            navigate("/login", { replace: true });
        };

        window.addEventListener(
            "civicsolve:session-expired",
            handleSessionExpired
        );

        return () => {
            window.removeEventListener(
                "civicsolve:session-expired",
                handleSessionExpired
            );
        };
    }, [showToast, navigate]);

    // Close menus when the route changes.
    useEffect(() => {
        setMenu(null);
    }, [location.pathname]);

    // Close menus when clicking outside the header or pressing Escape.
    useEffect(() => {
        const onDown = (event) => {
            if (
                headerRef.current &&
                !headerRef.current.contains(event.target)
            ) {
                setMenu(null);
            }
        };

        const onKey = (event) => {
            if (event.key === "Escape") {
                setMenu(null);
                setShowLogoutConfirm(false);
            }
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const toggle = (name) => {
        setMenu((current) => (current === name ? null : name));
    };

    const handleLogout = () => {
        setMenu(null);
        setShowLogoutConfirm(true);
    };

    const TOAST_DURATION = 3000;

    const confirmLogout = () => {
        setShowLogoutConfirm(false);
        setMenu(null);

        showToast(
            "success",
            "Logged Out",
            "You have logged out successfully."
        );

        setTimeout(() => {
            ["access_token", "refresh_token", "account_type"].forEach(
                (key) => localStorage.removeItem(key)
            );

            navigate("/login", { replace: true });
        }, TOAST_DURATION);
    };

    const linkClass = ({ isActive }) =>
        `org-nav-link${isActive ? " active" : ""}`;

    const initials = (org.name || "Org")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

    return (
        <div className="org-layout">
            <header className="org-header" ref={headerRef}>
                <div className="org-header-inner">
                    <div className="org-pill">
                        <NavLink
                            to="/organization/dashboard"
                            className="org-brand"
                        >
                            <CivicLogo />

                            <span className="org-brand-text">
                                <strong>CivicSolve</strong>
                                <small>Civic resolution</small>
                            </span>
                        </NavLink>

                        <nav className="org-nav" aria-label="Organization">
                            {PRIMARY_NAV.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={linkClass}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="org-header-actions">
                            <NavLink
                                to="/organization/notifications"
                                className="org-bell"
                                title="Notifications"
                                aria-label="Notifications"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
                                    <path d="M10 19a2 2 0 0 0 4 0" />
                                </svg>
                                <span className="org-bell-dot" />
                            </NavLink>

                            <div className="org-dropdown">
                                <button
                                    type="button"
                                    className="org-user"
                                    aria-expanded={menu === "user"}
                                    onClick={() => toggle("user")}
                                >
                                    <span className="org-avatar">
                                        {org.profile_image_url &&
                                            !avatarLoadFailed && (
                                                <img
                                                    key={org.profile_image_url}
                                                    src={org.profile_image_url}
                                                    alt="Organization profile"
                                                    className="org-avatar-image"
                                                    onLoad={() => {
                                                        console.log(
                                                            "Organization header avatar loaded successfully:",
                                                            org.profile_image_url
                                                        );
                                                    }}
                                                    onError={() => {
                                                        console.error(
                                                            "Unable to render organization header avatar:",
                                                            org.profile_image_url
                                                        );
                                                        setAvatarLoadFailed(true);
                                                    }}
                                                />
                                            )}

                                        <span className="org-avatar-initials">
                                            {initials}
                                        </span>
                                    </span>

                                    <span className="org-user-name">
                                        {org.name || "Organization"}
                                    </span>

                                    <span
                                        className={`org-caret${menu === "user" ? " open" : ""
                                            }`}
                                    >
                                        ⌄
                                    </span>
                                </button>

                                {menu === "user" && (
                                    <div className="org-menu org-menu-right">
                                        <NavLink
                                            to="/organization/profile"
                                            className="org-menu-item"
                                        >
                                            <span>⚙</span> Organization profile
                                        </NavLink>

                                        <button
                                            type="button"
                                            className="org-menu-item"
                                            onClick={handleLogout}
                                        >
                                            <span>↪</span> Sign out
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                className={`org-burger${menu === "mobile" ? " open" : ""
                                    }`}
                                aria-label="Menu"
                                aria-expanded={menu === "mobile"}
                                onClick={() => toggle("mobile")}
                            >
                                <i />
                                <i />
                                <i />
                            </button>
                        </div>
                    </div>

                    {menu === "mobile" && (
                        <nav
                            className="org-mobile-nav"
                            aria-label="Organization mobile"
                        >
                            {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={linkClass}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    )}
                </div>
            </header>

            {showLogoutConfirm && (
                <div
                    className="org-logout-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowLogoutConfirm(false);
                        }
                    }}
                >
                    <div
                        className="org-logout-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="org-logout-title"
                        aria-describedby="org-logout-description"
                    >
                        <div className="org-logout-icon">↪</div>

                        <h2 id="org-logout-title">Sign out?</h2>

                        <p id="org-logout-description">
                            Are you sure you want to sign out of your
                            CivicSolve organization account?
                        </p>

                        <div className="org-logout-actions">
                            <button
                                type="button"
                                className="org-logout-cancel"
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="org-logout-confirm"
                                onClick={confirmLogout}
                            >
                                Yes, sign out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="org-page">
                <Outlet context={{ setOrg: updateOrganization }} />
            </main>
        </div>
    );
}
