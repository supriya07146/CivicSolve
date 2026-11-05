/* =========================================================
   Citizen session helpers
   Put this file at:  src/utils/citizenSession.js
   Uses the same localStorage keys as App.js and UserDashboard.js
   ========================================================= */

const SESSION_KEYS = [
    "access_token",
    "refresh_token",
    "account_type",
    "user",
];

/* the logged-in citizen's saved profile (or {} if none) */
export function getCitizenUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}") || {};
    } catch {
        return {};
    }
}

/* full name shown in the header; empty string if not available */
export function getCitizenFullName() {
    const user = getCitizenUser();

    return String(user.full_name || user.name || "").trim();
}

/* remove everything saved at login */
export function clearCitizenSession() {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
}