import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/organizationRegistration.css";
import LocationPicker from "../components/LocationPicker";
import {
    PersonIllustration,
    PlantIllustration,
    SceneExtras,
} from "../components/OrganizationScene";
import { API_ROOT } from "../services/api";

function OrganizationRegistration() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        organizationName: "",
        organizationType: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        serviceArea: "",
        categories: [],
        description: "",
        document: null,
        password: "",
        confirmPassword: "",
        terms: false,
        location: "",
        latitude: null,
        longitude: null,
    });

    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoryOptions = [
        "Roads & Infrastructure",
        "Water & Sanitation",
        "Waste Management",
        "Public Safety",
        "Healthcare",
        "Education",
        "Environment",
        "Transportation",
        "Electricity",
        "Other",
    ];

    const handleChange = (e) => {
        const {
            name,
            value,
            type,
            checked,
            files,
        } = e.target;

        if (type === "checkbox" && name === "terms") {
            setFormData({
                ...formData,
                terms: checked,
            });
        } else if (type === "file") {
            setFormData({
                ...formData,
                document: files[0] || null,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }

        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: "",
            });
        }
    };

    const handleLocationChange = (locationData) => {
        setFormData((prev) => ({
            ...prev,
            location:
                locationData.location_name || "",
            latitude:
                locationData.latitude || null,
            longitude:
                locationData.longitude || null,
        }));

        if (errors.location) {
            setErrors((prev) => ({
                ...prev,
                location: "",
            }));
        }
    };

    const handleCategoryChange = (category) => {
        let updatedCategories = [
            ...formData.categories,
        ];

        if (updatedCategories.includes(category)) {
            updatedCategories =
                updatedCategories.filter(
                    (item) => item !== category
                );
        } else {
            updatedCategories.push(category);
        }

        setFormData({
            ...formData,
            categories: updatedCategories,
        });

        if (errors.categories) {
            setErrors({
                ...errors,
                categories: "",
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.organizationName.trim()) {
            newErrors.organizationName =
                "Organization name is required.";
        }

        if (!formData.organizationType) {
            newErrors.organizationType =
                "Select organization type.";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email.trim()
            )
        ) {
            newErrors.email =
                "Enter a valid email address.";
        }

        if (!formData.phone.trim()) {
            newErrors.phone =
                "Phone number is required.";
        } else if (
            !/^[6-9]\d{9}$/.test(
                formData.phone.trim()
            )
        ) {
            newErrors.phone =
                "Enter a valid 10-digit phone number.";
        }

        if (!formData.address.trim()) {
            newErrors.address =
                "Address is required.";
        }

        if (!formData.city.trim()) {
            newErrors.city = "City is required.";
        }

        if (!formData.state.trim()) {
            newErrors.state =
                "State is required.";
        }

        if (!formData.serviceArea.trim()) {
            newErrors.serviceArea =
                "Service area is required.";
        }

        if (!formData.location.trim()) {
            newErrors.location =
                "Please select the organization location.";
        }

        if (formData.categories.length === 0) {
            newErrors.categories =
                "Select at least one category handled by your organization.";
        }

        if (!formData.description.trim()) {
            newErrors.description =
                "Organization description is required.";
        } else if (
            formData.description.trim().length < 20
        ) {
            newErrors.description =
                "Description should contain at least 20 characters.";
        }

        if (!formData.document) {
            newErrors.document =
                "Please upload your registration or verification document.";
        }

        if (!formData.password) {
            newErrors.password =
                "Password is required.";
        } else if (
            formData.password.length < 8
        ) {
            newErrors.password =
                "Password must contain at least 8 characters.";
        } else if (
            !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
                formData.password
            )
        ) {
            newErrors.password =
                "Use uppercase, lowercase, number and special character.";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword =
                "Please confirm your password.";
        } else if (
            formData.password !==
            formData.confirmPassword
        ) {
            newErrors.confirmPassword =
                "Passwords do not match.";
        }

        if (!formData.terms) {
            newErrors.terms =
                "You must accept the terms and conditions.";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        const email =
            formData.email.trim().toLowerCase();

        try {
            const formDataToSend = new FormData();

            formDataToSend.append(
                "organization_name",
                formData.organizationName.trim()
            );

            formDataToSend.append(
                "organization_type",
                formData.organizationType
            );

            formDataToSend.append(
                "email",
                email
            );

            formDataToSend.append(
                "phone",
                formData.phone.trim()
            );

            formDataToSend.append(
                "address",
                formData.address.trim()
            );

            formDataToSend.append(
                "city",
                formData.city.trim()
            );

            formDataToSend.append(
                "state",
                formData.state.trim()
            );

            formDataToSend.append(
                "service_area",
                formData.serviceArea.trim()
            );

            formData.categories.forEach(
                (category) => {
                    formDataToSend.append(
                        "categories",
                        category
                    );
                }
            );

            formDataToSend.append(
                "description",
                formData.description.trim()
            );

            if (formData.document) {
                formDataToSend.append(
                    "verification_document",
                    formData.document
                );
            }

            formDataToSend.append(
                "password",
                formData.password
            );

            formDataToSend.append(
                "confirm_password",
                formData.confirmPassword
            );

            formDataToSend.append(
                "latitude",
                formData.latitude ?? ""
            );

            formDataToSend.append(
                "longitude",
                formData.longitude ?? ""
            );

            const response = await fetch(
                `${API_ROOT}/auth/organization/register/`,
                {
                    method: "POST",
                    body: formDataToSend,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const backendErrors = {};

                Object.keys(data || {}).forEach(
                    (field) => {
                        const value = data[field];

                        if (Array.isArray(value)) {
                            backendErrors[field] =
                                value[0];
                        } else if (
                            typeof value === "string"
                        ) {
                            backendErrors[field] =
                                value;
                        }
                    }
                );

                if (backendErrors.organization_name) {
                    backendErrors.organizationName =
                        backendErrors.organization_name;

                    delete backendErrors.organization_name;
                }

                if (backendErrors.organization_type) {
                    backendErrors.organizationType =
                        backendErrors.organization_type;

                    delete backendErrors.organization_type;
                }

                if (backendErrors.service_area) {
                    backendErrors.serviceArea =
                        backendErrors.service_area;

                    delete backendErrors.service_area;
                }

                if (backendErrors.confirm_password) {
                    backendErrors.confirmPassword =
                        backendErrors.confirm_password;

                    delete backendErrors.confirm_password;
                }

                if (backendErrors.verification_document) {
                    backendErrors.document =
                        backendErrors.verification_document;

                    delete backendErrors.verification_document;
                }

                if (
                    Object.keys(backendErrors).length > 0
                ) {
                    setErrors(backendErrors);
                } else {
                    setErrors({
                        submit:
                            data.detail ||
                            data.message ||
                            "Registration failed. Please try again.",
                    });
                }

                return;
            }

            localStorage.setItem(
                "civicsolve_otp_email",
                email
            );

            localStorage.setItem(
                "civicsolve_otp_type",
                "organization"
            );

            localStorage.setItem(
                "civicsolve_otp_message",
                data.message ||
                "OTP sent to your email address."
            );

            navigate(
                `/verify-otp?email=${encodeURIComponent(
                    email
                )}`,
                {
                    state: {
                        email: email,
                        accountType:
                            "organization",
                        message:
                            data.message ||
                            "OTP sent to your email address.",
                        status:
                            data.status ||
                            "pending_verification",
                    },
                }
            );
        } catch (error) {
            console.error(
                "Organization registration error:",
                error
            );

            setErrors({
                submit:
                    "Unable to connect to CivicSolve server. Please make sure the Django backend is running.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="organization-register-page">

            {/* FIXED SCENE: stays in place while the card scrolls */}
            <div className="org-scene" aria-hidden="false">
                <div className="org-scene-floor" />
                <SceneExtras />

                <div className="org-scene-left">
                    <PersonIllustration />
                    <h2>Register your organization</h2>
                    <p>
                        Get verified, accept community problems
                        and show the impact your team creates.
                    </p>
                    <ul>
                        <li>Accept Problems</li>
                        <li>Provide Solutions</li>
                        <li>Create Impact</li>
                    </ul>
                </div>

                <div className="org-scene-right">
                    <PlantIllustration />
                </div>
            </div>
            <div className="organization-register-container">

                <div className="organization-register-layout">

                    <div className="organization-register-card">

                        <div className="organization-header">
                            <span className="organization-label">
                                ORGANIZATION REGISTRATION
                            </span>

                            <h1>
                                Join as an organization
                            </h1>

                            <p>
                                Help your community by accepting
                                verified problems and providing
                                meaningful solutions.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>

                            <div className="section-title">
                                Organization Information
                            </div>

                            <div className="form-group">
                                <label>
                                    Organization Name{" "}
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="organizationName"
                                    value={
                                        formData.organizationName
                                    }
                                    onChange={handleChange}
                                    placeholder="Enter organization name"
                                />

                                {errors.organizationName && (
                                    <small className="org-error">
                                        {
                                            errors.organizationName
                                        }
                                    </small>
                                )}
                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        Organization Type{" "}
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="organizationType"
                                        value={
                                            formData.organizationType
                                        }
                                        onChange={handleChange}
                                    >
                                        <option value="">
                                            Select organization type
                                        </option>

                                        <option value="government">
                                            Government / Local Authority
                                        </option>

                                        <option value="ngo">
                                            NGO / Non-Profit
                                        </option>

                                        <option value="private">
                                            Private Organization
                                        </option>

                                        <option value="community">
                                            Community Organization
                                        </option>

                                        <option value="educational">
                                            Educational Institution
                                        </option>

                                        <option value="other">
                                            Other
                                        </option>
                                    </select>

                                    {errors.organizationType && (
                                        <small className="org-error">
                                            {
                                                errors.organizationType
                                            }
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        Official Email{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="organization@example.com"
                                    />

                                    {errors.email && (
                                        <small className="org-error">
                                            {errors.email}
                                        </small>
                                    )}
                                </div>

                            </div>

                            <div className="form-group">
                                <label>
                                    Contact Phone{" "}
                                    <span>*</span>
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="10-digit phone number"
                                    maxLength="10"
                                />

                                {errors.phone && (
                                    <small className="org-error">
                                        {errors.phone}
                                    </small>
                                )}
                            </div>

                            <div className="section-title">
                                Organization Location
                            </div>

                            <div className="form-group">
                                <label>
                                    Full Address{" "}
                                    <span>*</span>
                                </label>

                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter complete organization address"
                                    rows="3"
                                />

                                {errors.address && (
                                    <small className="org-error">
                                        {errors.address}
                                    </small>
                                )}
                            </div>

                            <LocationPicker
                                value={{
                                    location_name:
                                        formData.location,
                                    latitude:
                                        formData.latitude,
                                    longitude:
                                        formData.longitude,
                                }}
                                onChange={
                                    handleLocationChange
                                }
                            />

                            {errors.location && (
                                <small className="org-error location-form-error">
                                    {errors.location}
                                </small>
                            )}

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        City{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="City"
                                    />

                                    {errors.city && (
                                        <small className="org-error">
                                            {errors.city}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        State{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="State"
                                    />

                                    {errors.state && (
                                        <small className="org-error">
                                            {errors.state}
                                        </small>
                                    )}
                                </div>

                            </div>

                            <div className="form-group">
                                <label>
                                    Service Area{" "}
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="serviceArea"
                                    value={
                                        formData.serviceArea
                                    }
                                    onChange={handleChange}
                                    placeholder="Example: Mumbai City, Andheri, Powai..."
                                />

                                {errors.serviceArea && (
                                    <small className="org-error">
                                        {errors.serviceArea}
                                    </small>
                                )}
                            </div>

                            <div className="section-title">
                                Categories Handled
                            </div>

                            <div className="category-grid">
                                {categoryOptions.map(
                                    (category) => (
                                        <label
                                            key={category}
                                            className="category-checkbox"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.categories.includes(
                                                    category
                                                )}
                                                onChange={() =>
                                                    handleCategoryChange(
                                                        category
                                                    )
                                                }
                                            />

                                            <span>
                                                {category}
                                            </span>
                                        </label>
                                    )
                                )}
                            </div>

                            {errors.categories && (
                                <small className="org-error category-error">
                                    {errors.categories}
                                </small>
                            )}

                            <div className="form-group description-group">
                                <label>
                                    Organization Description{" "}
                                    <span>*</span>
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={handleChange}
                                    placeholder="Describe your organization's purpose, services and community role..."
                                    rows="5"
                                />

                                {errors.description && (
                                    <small className="org-error">
                                        {errors.description}
                                    </small>
                                )}
                            </div>

                            <div className="section-title">
                                Verification
                            </div>

                            <div className="form-group">
                                <label>
                                    Registration / Verification Document{" "}
                                    <span>*</span>
                                </label>

                                <div className="file-upload">
                                    <input
                                        type="file"
                                        name="document"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleChange}
                                    />

                                    <div className="file-upload-text">
                                        <strong>
                                            {formData.document
                                                ? formData.document.name
                                                : "Choose verification document"}
                                        </strong>

                                        <small>
                                            PDF, JPG or PNG
                                        </small>
                                    </div>
                                </div>

                                {errors.document && (
                                    <small className="org-error">
                                        {errors.document}
                                    </small>
                                )}
                            </div>

                            <div className="section-title">
                                Account Security
                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        Password{" "}
                                        <span>*</span>
                                    </label>

                                    <div className="org-password-wrapper">
                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password"
                                            value={
                                                formData.password
                                            }
                                            onChange={handleChange}
                                            placeholder="Create password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword
                                                )
                                            }
                                        >
                                            {showPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>
                                    </div>

                                    {errors.password && (
                                        <small className="org-error">
                                            {errors.password}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        Confirm Password{" "}
                                        <span>*</span>
                                    </label>

                                    <div className="org-password-wrapper">
                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="confirmPassword"
                                            value={
                                                formData.confirmPassword
                                            }
                                            onChange={handleChange}
                                            placeholder="Confirm password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword
                                                )
                                            }
                                        >
                                            {showConfirmPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>
                                    </div>

                                    {errors.confirmPassword && (
                                        <small className="org-error">
                                            {
                                                errors.confirmPassword
                                            }
                                        </small>
                                    )}
                                </div>

                            </div>

                            <div className="org-terms">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="terms"
                                        checked={formData.terms}
                                        onChange={handleChange}
                                    />

                                    <span>
                                        I agree to CivicSolve's
                                        Terms and Conditions
                                        and Privacy Policy.
                                    </span>
                                </label>

                                {errors.terms && (
                                    <small className="org-error">
                                        {errors.terms}
                                    </small>
                                )}
                            </div>

                            {errors.submit && (
                                <div className="org-error submit-error">
                                    {errors.submit}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="organization-submit-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Submitting Registration..."
                                    : "Submit Organization Registration"}
                            </button>

                            <div className="pending-note">
                                <strong>Note:</strong>{" "}
                                Organization accounts require
                                admin verification before they
                                can access the organization panel.
                            </div>

                        </form>

                        <div className="organization-login">
                            Already registered?{" "}
                            <Link to="/login">
                                Login
                            </Link>
                        </div>

                        <Link
                            to="/register"
                            className="organization-back"
                        >
                            ← Back to registration options
                        </Link>

                    </div>

                </div>

                <p className="organization-footer">
                    © 2026 CivicSolve. Building better
                    communities together.
                </p>
            </div>
        </div>
    );
}

export default OrganizationRegistration;