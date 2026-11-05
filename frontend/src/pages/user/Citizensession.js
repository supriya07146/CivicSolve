// Small helpers for the logged-in citizen.
// App.js stores access_token / refresh_token / account_type.
// The name is read from whatever your login saved; add your key here if different.

export const SESSION_KEYS = [
    "access_token",
    "refresh_token",
    "account_type",
    "civicsolve_user",
    "citizen",
    "user",
];

export function getStoredCitizen() {
    let found = {};

    for (const key of ["civicsolve_user", "citizen", "user"]) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    found = parsed;
                    break;
                }
            }
        } catch (error) {
            /* ignore invalid JSON */
        }
    }

    ["full_name", "name", "user_name", "username", "first_name", "email"].forEach((key) => {
        const value = localStorage.getItem(key);
        if (value && !found[key]) found[key] = value;
    });

    return found;
}

export function getCitizenFullName() {
    const user = getStoredCitizen();
    return user.full_name || user.name || user.user_name || user.username || user.first_name || "";
}

export function clearCitizenSession() {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
}