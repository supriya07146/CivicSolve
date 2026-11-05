
import React from "react";
import { Navigate } from "react-router-dom";

function getDashboardPath(accountType) {
    if (accountType === "admin") return "/admin/dashboard";
    if (accountType === "organization") return "/organization/dashboard";
    if (accountType === "citizen") return "/user/dashboard";

    return "/";
}

function PublicRoute({ children, restricted = false }) {
    const token = localStorage.getItem("access_token");
    const accountType = localStorage.getItem("account_type");

    if (restricted && token && accountType) {
        return <Navigate to={getDashboardPath(accountType)} replace />;
    }

    return children;
}

export default PublicRoute;
