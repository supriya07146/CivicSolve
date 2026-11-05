import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    getAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    updateAdminCategoryStatus,
    // deleteAdminCategory,   <- uncomment after adding it to services/api.js
} from "../../services/api";
import "../../styles/admin/CategoryManagement.css";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const EXPERTISE_OPTIONS = [
    "Road maintenance",
    "Electrical works",
    "Waste management",
    "Water & drainage",
    "General services",
];

const EMPTY_FORM = {
    name: "",
    description: "",
    expertise: "",
    is_active: true,
};

/* accent colours cycle down the list, like the design */
const ACCENTS = ["teal", "amber", "indigo", "teal", "amber"];

/* replace with the real API function once it exists in services/api.js */
const deleteAdminCategory = async () => {
    throw new Error("Delete API is not connected yet. Add deleteAdminCategory to services/api.js.");
};

const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function CategoryManagement() {
    const [categories, setCategories] = useState([]);
    const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });

    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const pageRef = useRef(null);
    const firstLoad = useRef(true);

    /* ---------------- data loading ---------------- */

    const loadCategories = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminCategories({});
            const list = result.categories || [];

            setCategories(list);
            setSummary(
                result.summary || {
                    total: list.length,
                    active: list.filter((c) => c.is_active).length,
                    inactive: list.filter((c) => !c.is_active).length,
                }
            );

            return list;
        } catch (err) {
            setError(err.message || "Unable to load categories.");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    /* ---------------- derived data ---------------- */

    const totalReports = useMemo(
        () => categories.reduce((sum, c) => sum + (c.problem_count ?? 0), 0),
        [categories]
    );

    const selected = useMemo(
        () => categories.find((c) => c.id === editingId) || null,
        [categories, editingId]
    );

    const linked = selected?.problem_count ?? 0;

    /* ---------------- form helpers ---------------- */

    const fillForm = (category) => {
        setEditingId(category.id);
        setForm({
            name: category.name || "",
            description: category.description || "",
            expertise: category.suggested_expertise || "",
            is_active: !!category.is_active,
        });
    };

    const startNew = useCallback(() => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError("");
        setSuccess("");
        pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    /* open the first category in the editor once, like the design */
    useEffect(() => {
        if (firstLoad.current && categories.length) {
            firstLoad.current = false;
            fillForm(categories[0]);
        }
    }, [categories]);

    /* header's "+ Add category" button dispatches this event */
    useEffect(() => {
        window.addEventListener("admin:new-category", startNew);
        return () => window.removeEventListener("admin:new-category", startNew);
    }, [startNew]);

    const handleInputChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleCancel = () => {
        setError("");
        if (selected) fillForm(selected);
        else setForm(EMPTY_FORM);
    };

    const handleEdit = (category) => {
        fillForm(category);
        setError("");
        setSuccess("");
    };

    /* ---------------- actions ---------------- */

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name.trim()) {
            setError("Please enter a category name.");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                suggested_expertise: form.expertise,
                is_active: form.is_active,
            };

            if (editingId !== null) {
                await updateAdminCategory(editingId, payload);
                setSuccess("Category updated successfully.");
            } else {
                await createAdminCategory(payload);
                setSuccess("Category created successfully.");
                setForm(EMPTY_FORM);
            }

            const list = await loadCategories();

            if (editingId !== null) {
                const fresh = list.find((c) => c.id === editingId);
                if (fresh) fillForm(fresh);
            }
        } catch (err) {
            setError(err.message || "Unable to save category.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (category) => {
        const action = category.is_active ? "deactivate" : "activate";

        if (!window.confirm(`Are you sure you want to ${action} "${category.name}"?`)) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await updateAdminCategoryStatus(category.id, !category.is_active);
            setSuccess(`Category ${action}d successfully.`);

            const list = await loadCategories();
            if (editingId === category.id) {
                const fresh = list.find((c) => c.id === category.id);
                if (fresh) fillForm(fresh);
            }
        } catch (err) {
            setError(err.message || "Unable to update category status.");
        }
    };

    const handleDelete = async (category) => {
        if ((category.problem_count ?? 0) > 0) return;

        if (!window.confirm(`Permanently delete "${category.name}"? This cannot be undone.`)) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await deleteAdminCategory(category.id);
            setSuccess(`Category "${category.name}" deleted.`);

            if (editingId === category.id) {
                setEditingId(null);
                setForm(EMPTY_FORM);
            }

            await loadCategories();
        } catch (err) {
            setError(err.message || "Unable to delete category.");
        }
    };

    const handleExport = () => {
        const rows = [
            ["Category", "Description", "Problems", "Status"],
            ...categories.map((c) => [
                c.name,
                c.description || "",
                c.problem_count ?? 0,
                c.is_active ? "Active" : "Inactive",
            ]),
        ];

        const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "civicsolve-categories.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    /* ---------------- render ---------------- */

    return (
        <div className="category-page" ref={pageRef}>
            <div className="cm-container">

                {success && <div className="cm-success" role="status">{success}</div>}
                {error && <div className="cm-error" role="alert">{error}</div>}

                <div className="cm-layout">

                    {/* ---------- left: list ---------- */}
                    <div className="cm-main">
                        <section className="cm-list-card">
                            <div className="cm-card-head">
                                <div>
                                    <h2>Service categories</h2>
                                    <p>
                                        {summary.total} categories · {summary.active} active · {totalReports} reports
                                    </p>
                                </div>
                                <button type="button" className="cm-ghost-btn" onClick={handleExport}
                                    disabled={!categories.length}>
                                    Export ↗
                                </button>
                            </div>

                            {loading ? (
                                <div className="cm-empty">Loading categories...</div>
                            ) : categories.length === 0 ? (
                                <div className="cm-empty">
                                    <strong>No categories found</strong>
                                    <span>Use “+ Add category” to create your first one.</span>
                                </div>
                            ) : (
                                <div className="cm-table-wrap">
                                    <table className="cm-table">
                                        <thead>
                                            <tr>
                                                <th>Category / Description</th>
                                                <th>Problems</th>
                                                <th>State</th>
                                                <th>Manage</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories.map((category, index) => {
                                                const count = category.problem_count ?? 0;
                                                const accent = category.is_active
                                                    ? ACCENTS[index % ACCENTS.length]
                                                    : "grey";
                                                const canDelete = !category.is_active && count === 0;

                                                return (
                                                    <tr
                                                        key={category.id}
                                                        className={`cm-row accent-${accent} ${category.id === editingId ? "is-editing" : ""}`}
                                                    >
                                                        <td>
                                                            <div className="cm-name-cell">
                                                                <strong>{category.name}</strong>
                                                                <span>{category.description || "No description provided"}</span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span className={`cm-count count-${accent}`}>{count}</span>
                                                        </td>

                                                        <td>
                                                            <span className={`cm-state ${category.is_active ? "state-active" : "state-inactive"}`}>
                                                                {category.is_active ? "● Active" : "○ Inactive"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="cm-actions">
                                                                <button type="button" className="cm-link"
                                                                    onClick={() => handleEdit(category)}>
                                                                    Edit →
                                                                </button>
                                                                {canDelete && (
                                                                    <button type="button" className="cm-link cm-link-danger"
                                                                        onClick={() => handleDelete(category)}>
                                                                        Delete →
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <p className="cm-footnote">
                                {totalReports} illustrative reports across active categories. Historical category labels remain in audit records.
                            </p>
                        </section>

                        <section className="cm-safe">
                            <span className="cm-safe-icon">!</span>
                            <div>
                                <strong>Safe deletion</strong>
                                <p>
                                    Categories with linked problems cannot be deleted. Move the records to a suitable
                                    category or deactivate the category for new reports.
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* ---------- right: editor + delete ---------- */}
                    <aside className="cm-side">

                        <form className="cm-edit-card" onSubmit={handleSubmit}>
                            <h2>
                                <span className="cm-title-icon">✎</span>
                                {editingId !== null ? `Edit category · ${selected?.name || ""}` : "Add new category"}
                            </h2>

                            <div className="cm-field">
                                <label htmlFor="category-name">Category name *</label>
                                <input id="category-name" name="name" type="text" required maxLength={100}
                                    value={form.name} onChange={handleInputChange}
                                    placeholder="e.g. Road Maintenance" />
                            </div>

                            <div className="cm-field">
                                <label htmlFor="category-description">Description</label>
                                <textarea id="category-description" name="description" rows={3}
                                    value={form.description} onChange={handleInputChange}
                                    placeholder="Describe the types of problems in this category..." />
                            </div>

                            <div className="cm-field">
                                <label htmlFor="category-expertise">Suggested responsible expertise</label>
                                <select id="category-expertise" name="expertise"
                                    value={form.expertise} onChange={handleInputChange}>
                                    <option value="">Not specified</option>
                                    {EXPERTISE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="cm-check">
                                <input type="checkbox" name="is_active"
                                    checked={form.is_active} onChange={handleInputChange} />
                                <span>Active for new reports</span>
                            </label>

                            <div className="cm-form-actions">
                                <button type="submit" className="cm-primary-btn" disabled={saving}>
                                    {saving ? "Saving..." : editingId !== null ? "Save category" : "Create category"}
                                </button>
                                <button type="button" className="cm-secondary-btn"
                                    onClick={handleCancel} disabled={saving}>
                                    Cancel
                                </button>
                            </div>
                        </form>

                        {selected && (
                            <section className="cm-delete-card">
                                <h2>
                                    <span className="cm-title-icon cm-title-icon-red">▤</span>
                                    Delete category
                                </h2>

                                <div className={`cm-linked ${linked > 0 ? "has-links" : "no-links"}`}>
                                    <i />
                                    {selected.name} · {linked} linked problem{linked === 1 ? "" : "s"}
                                </div>

                                <p className="cm-delete-text">
                                    {linked > 0
                                        ? "Deletion is unavailable while records are linked. Deactivate to stop new reports without losing history."
                                        : selected.is_active
                                            ? "No problems are linked. Deactivate the category first, then it can be deleted."
                                            : "No problems are linked, so this category can be deleted safely."}
                                </p>

                                {selected.is_active ? (
                                    <button type="button" className="cm-outline-btn"
                                        onClick={() => handleToggleStatus(selected)}>
                                        Deactivate instead
                                    </button>
                                ) : (
                                    <button type="button" className="cm-outline-btn"
                                        onClick={() => handleToggleStatus(selected)}>
                                        Activate again
                                    </button>
                                )}

                                <div className="cm-danger">
                                    <strong>Danger zone</strong>
                                    <p>Permanently disabled when 0 linked reports remain.</p>
                                    {linked === 0 && !selected.is_active && (
                                        <button type="button" className="cm-danger-btn"
                                            onClick={() => handleDelete(selected)}>
                                            Delete category permanently
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default CategoryManagement;