import React from "react";
import { Outlet } from "react-router-dom";

import AdminHeader from "./AdminHeader";

import "../../styles/admin/AdminLayout.css";

function AdminLayout() {
    return (
        <div className="ad-layout">

            <AdminHeader />

            <main className="ad-content">
                <Outlet />
            </main>

            <footer className="ad-footer">

                <span>
                    CivicSolve · Illustrative data · Not a government agency
                </span>

                <div className="ad-footer-links">
                    <button type="button">Privacy</button>
                    <button type="button">Terms</button>
                    <button type="button">Accessibility</button>
                    <button type="button">Help</button>
                </div>

            </footer>

        </div>
    );
}

export default AdminLayout;