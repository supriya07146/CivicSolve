import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

import "../../styles/admin/AdminSidebar.css";

function AdminSidebar() {
    const navigate = useNavigate();

    const adminData = JSON.parse(
        localStorage.getItem("admin") || "{}"
    );

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("account_type");
        localStorage.removeItem("admin");

        navigate("/admin/login");
    };

    return (
        <aside className="admin-sidebar">

            {/* Logo */}
            <div className="admin-sidebar-logo">
                <div className="admin-logo-mark">
                    CS
                </div>

                <div className="admin-logo-text">
                    <span>Civic</span>Solve
                </div>
            </div>


            {/* Admin Information */}
            <div className="admin-sidebar-profile">

                <div className="admin-profile-avatar">
                    {adminData.full_name
                        ? adminData.full_name
                            .charAt(0)
                            .toUpperCase()
                        : "A"}
                </div>

                <div className="admin-profile-info">

                    <strong>
                        {adminData.full_name || "Administrator"}
                    </strong>

                    <span>
                        Administrator
                    </span>

                </div>

            </div>


            {/* Navigation */}
            <nav className="admin-navigation">

                <div className="admin-nav-section">
                    <span className="admin-nav-title">
                        MAIN
                    </span>

                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ▦
                        </span>

                        <span>
                            Dashboard
                        </span>
                    </NavLink>
                </div>


                <div className="admin-nav-section">

                    <span className="admin-nav-title">
                        MANAGEMENT
                    </span>


                    <NavLink
                        to="/admin/organizations"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ◈
                        </span>

                        <span>
                            Organizations
                        </span>
                    </NavLink>


                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ◉
                        </span>

                        <span>
                            Users
                        </span>
                    </NavLink>


                    <NavLink
                        to="/admin/problems"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            !
                        </span>

                        <span>
                            Problems
                        </span>
                    </NavLink>


                    <NavLink
                        to="/admin/assignments"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ⇄
                        </span>

                        <span>
                            Assignments
                        </span>
                    </NavLink>


                    <NavLink
                        to="/admin/categories"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            #
                        </span>

                        <span>
                            Categories
                        </span>
                    </NavLink>

                </div>


                <div className="admin-nav-section">

                    <span className="admin-nav-title">
                        MONITORING
                    </span>


                    <NavLink
                        to="/admin/solutions"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ✓
                        </span>

                        <span>
                            Solutions
                        </span>
                    </NavLink>


                    <NavLink
                        to="/admin/notifications"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ♢
                        </span>

                        <span>
                            Notifications
                        </span>
                    </NavLink>

                </div>


                <div className="admin-nav-section">

                    <span className="admin-nav-title">
                        INSIGHTS
                    </span>


                    <NavLink
                        to="/admin/analytics"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ◫
                        </span>

                        <span>
                            Analytics
                        </span>
                    </NavLink>

                </div>


                <div className="admin-nav-section">

                    <span className="admin-nav-title">
                        ACCOUNT
                    </span>


                    <NavLink
                        to="/admin/profile"
                        className={({ isActive }) =>
                            `admin-nav-link ${
                                isActive ? "active" : ""
                            }`
                        }
                    >
                        <span className="admin-nav-icon">
                            ◯
                        </span>

                        <span>
                            Admin Profile
                        </span>
                    </NavLink>

                </div>

            </nav>


            {/* Logout */}
            <div className="admin-sidebar-footer">

                <button
                    className="admin-logout-button"
                    onClick={logout}
                >
                    <span className="admin-nav-icon">
                        ↪
                    </span>

                    <span>
                        Logout
                    </span>
                </button>

            </div>

        </aside>
    );
}

export default AdminSidebar;