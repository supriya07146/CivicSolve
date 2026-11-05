
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAdminProfile } from "../services/api";

const SESSION_KEYS = [
    "access_token",
    "refresh_token",
    "account_type"
];

function clearSession() {
    SESSION_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
}

function isTokenExpired(token) {
    try {
        const base64 = token.split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const payload = JSON.parse(atob(base64));

        return payload.exp
            ? payload.exp * 1000 <= Date.now()
            : false;
    } catch {
        return false;
    }
}

function getDashboardPath(accountType) {
    if (accountType === "admin") return "/admin/dashboard";
    if (accountType === "organization") return "/organization/dashboard";
    if (accountType === "citizen") return "/user/dashboard";

    return "/";
}

function PrivateRoute({ children, allowedRoles }) {
    const token = localStorage.getItem("access_token");
    const accountType = localStorage.getItem("account_type");

    const [status, setStatus] = useState("checking");

    useEffect(() => {
        let cancelled = false;

        if (!token || isTokenExpired(token) || !accountType) {
            clearSession();

            setStatus("denied");
            return;
        }

        if (!allowedRoles.includes(accountType)) {
            setStatus("wrong-role");
            return;
        }

        if (accountType === "admin") {
            getAdminProfile()
                .then(() => {
                    if (!cancelled) setStatus("ok");
                })
                .catch(() => {
                    clearSession();

                    if (!cancelled) setStatus("denied");
                });
        } else {
            setStatus("ok");
        }

        return () => {
            cancelled = true;
        };

    }, [token, accountType, allowedRoles]);

    if (status === "checking") {
        return (
            <div style={{
                padding: "40px",
                textAlign: "center"
            }}>
                Verifying session...
            </div>
        );
    }

    if (status === "denied") {
        return <Navigate to="/login" replace />;
    }

    if (status === "wrong-role") {
        return <Navigate to="/403" replace />;
    }

    return children;
}

export default PrivateRoute;
