import React, {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    getAdminCitizen,
    getAdminCitizenProblems,
    updateCitizenStatus,
} from "../../services/api";

import "../../styles/admin/CitizenProfile.css";


function CitizenProfile() {

    const {
        userId,
    } = useParams();

    const navigate =
        useNavigate();


    const [citizen, setCitizen] =
        useState(null);

    const [problems, setProblems] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [problemLoading, setProblemLoading] =
        useState(true);


    const [actionLoading, setActionLoading] =
        useState(false);


    const [problemFilter, setProblemFilter] =
        useState("");


    const [error, setError] =
        useState("");


    const loadProfile = useCallback(async () => {

        try {

            setLoading(true);

            const response =
                await getAdminCitizen(
                    userId
                );

            setCitizen(
                response.data
            );

        } catch (error) {

            setError(
                error.message ||
                "Unable to load citizen profile."
            );

        } finally {

            setLoading(false);

        }
    }, [userId]);


    const loadProblems = useCallback(async () => {

        try {

            setProblemLoading(true);

            const response =
                await getAdminCitizenProblems(
                    userId,
                    {
                        status:
                            problemFilter,
                        page_size: 20,
                    }
                );

            setProblems(
                response.results || []
            );

        } catch (error) {

            console.error(error);

        } finally {

            setProblemLoading(false);

        }
    }, [problemFilter, userId]);


    useEffect(() => {

        loadProfile();

    }, [loadProfile]);


    useEffect(() => {

        loadProblems();

    }, [loadProblems]);


    const changeStatus = async () => {

        if (!citizen) {
            return;
        }


        const newStatus =
            !citizen.is_active;


        const message =
            newStatus
                ? "Activate this citizen account?"
                : "Deactivate this citizen account?";


        if (!window.confirm(message)) {
            return;
        }


        try {

            setActionLoading(true);


            await updateCitizenStatus(
                citizen.id,
                {
                    is_active:
                        newStatus,

                    reason:
                        newStatus
                            ? "Account reactivated by administrator."
                            : "Account deactivated by administrator.",
                }
            );


            setCitizen({
                ...citizen,
                is_active:
                    newStatus,
            });


            alert(
                newStatus
                    ? "Citizen account activated successfully."
                    : "Citizen account deactivated successfully."
            );


        } catch (error) {

            alert(
                error.message ||
                "Unable to update account status."
            );

        } finally {

            setActionLoading(false);

        }
    };


    const formatDate = (date) => {

        if (!date) {
            return "—";
        }

        return new Date(date)
            .toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                }
            );
    };


    const getProblemStatusClass =
        (status) => {

            return `cp-problem-status ${status}`;
        };


    if (loading) {

        return (

            <div className="cp-loading">

                <div className="cp-loader"></div>

                <p>
                    Loading citizen profile...
                </p>

            </div>

        );
    }


    if (error || !citizen) {

        return (

            <div className="cp-error">

                <div className="cp-error-icon">
                    !
                </div>

                <h2>
                    Citizen profile unavailable
                </h2>

                <p>
                    {error ||
                        "The requested citizen could not be found."}
                </p>

                <button
                    onClick={() =>
                        navigate(
                            "/admin/users"
                        )
                    }
                >
                    Return to citizen registry
                </button>

            </div>

        );
    }


    return (

        <div className="citizen-profile">

            {/* =========================
                BACK
            ========================= */}

            <button
                className="cp-back"
                onClick={() =>
                    navigate(
                        "/admin/users"
                    )
                }
            >
                ← Citizen Registry
            </button>


            {/* =========================
                PROFILE HEADER
            ========================= */}

            <section className="cp-profile-header">

                <div className="cp-identity">

                    <div className="cp-avatar">

                        {citizen.full_name
                            ?.split(" ")
                            .slice(0, 2)
                            .map(
                                (part) =>
                                    part[0]
                            )
                            .join("")
                            .toUpperCase()}

                    </div>


                    <div>

                        <div className="cp-title-row">

                            <h1>
                                {citizen.full_name}
                            </h1>

                            <span
                                className={
                                    citizen.is_active
                                        ? "cp-account active"
                                        : "cp-account inactive"
                                }
                            >
                                {citizen.is_active
                                    ? "Active Account"
                                    : "Inactive Account"}
                            </span>

                        </div>

                        <p>
                            CivicSolve Citizen
                            <span>•</span>
                            Citizen ID:
                            CS-
                            {String(
                                citizen.id
                            ).padStart(
                                5,
                                "0"
                            )}
                        </p>

                    </div>

                </div>


                <div className="cp-header-actions">

                    <button
                        className={
                            citizen.is_active
                                ? "cp-deactivate"
                                : "cp-activate"
                        }
                        onClick={
                            changeStatus
                        }
                        disabled={
                            actionLoading
                        }
                    >

                        {actionLoading
                            ? "Updating..."
                            : citizen.is_active
                                ? "Deactivate Account"
                                : "Activate Account"}

                    </button>

                </div>

            </section>


            {/* =========================
                ACCOUNT SUMMARY
            ========================= */}

            <section className="cp-summary-grid">

                <div className="cp-summary-card">

                    <span>
                        Total Reports
                    </span>

                    <strong>
                        {citizen.total_problems}
                    </strong>

                    <small>
                        Problems submitted
                    </small>

                </div>


                <div className="cp-summary-card">

                    <span>
                        Open
                    </span>

                    <strong>
                        {citizen.open_problems}
                    </strong>

                    <small>
                        Awaiting action
                    </small>

                </div>


                <div className="cp-summary-card">

                    <span>
                        In Progress
                    </span>

                    <strong>
                        {citizen.in_progress_problems}
                    </strong>

                    <small>
                        Currently being handled
                    </small>

                </div>


                <div className="cp-summary-card">

                    <span>
                        Resolved
                    </span>

                    <strong>
                        {citizen.resolved_problems}
                    </strong>

                    <small>
                        Successfully resolved
                    </small>

                </div>

            </section>


            <div className="cp-main-grid">

                {/* =========================
                    PERSONAL INFORMATION
                ========================= */}

                <section className="cp-card">

                    <div className="cp-card-header">

                        <div>

                            <h2>
                                Citizen Information
                            </h2>

                            <p>
                                Registered account details
                            </p>

                        </div>

                    </div>


                    <div className="cp-information-grid">

                        <div>
                            <label>
                                Full Name
                            </label>
                            <strong>
                                {citizen.full_name}
                            </strong>
                        </div>

                        <div>
                            <label>
                                Email Address
                            </label>
                            <strong>
                                {citizen.email}
                            </strong>
                        </div>

                        <div>
                            <label>
                                Phone Number
                            </label>
                            <strong>
                                {citizen.phone}
                            </strong>
                        </div>

                        <div>
                            <label>
                                Location
                            </label>
                            <strong>
                                {citizen.location ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <label>
                                Email Verification
                            </label>

                            <strong
                                className={
                                    citizen.email_verified
                                        ? "cp-verified"
                                        : "cp-unverified"
                                }
                            >
                                {citizen.email_verified
                                    ? "Verified"
                                    : "Not verified"}
                            </strong>
                        </div>

                        <div>
                            <label>
                                Registration Date
                            </label>

                            <strong>
                                {formatDate(
                                    citizen.created_at
                                )}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* =========================
                    PROBLEM SUMMARY
                ========================= */}

                <section className="cp-card">

                    <div className="cp-card-header">

                        <div>

                            <h2>
                                Case Activity
                            </h2>

                            <p>
                                Citizen problem distribution
                            </p>

                        </div>

                    </div>


                    <div className="cp-case-list">

                        <div>
                            <span>Open</span>
                            <strong>
                                {citizen.open_problems}
                            </strong>
                        </div>

                        <div>
                            <span>Under Review</span>
                            <strong>
                                {citizen.under_review_problems}
                            </strong>
                        </div>

                        <div>
                            <span>Assigned</span>
                            <strong>
                                {citizen.assigned_problems}
                            </strong>
                        </div>

                        <div>
                            <span>In Progress</span>
                            <strong>
                                {citizen.in_progress_problems}
                            </strong>
                        </div>

                        <div>
                            <span>Resolved</span>
                            <strong>
                                {citizen.resolved_problems}
                            </strong>
                        </div>

                        <div>
                            <span>Closed</span>
                            <strong>
                                {citizen.closed_problems}
                            </strong>
                        </div>

                    </div>

                </section>

            </div>


            {/* =========================
                REPORTED PROBLEMS
            ========================= */}

            <section className="cp-card cp-problems-card">

                <div className="cp-card-header">

                    <div>

                        <h2>
                            Reported Problems
                        </h2>

                        <p>
                            Community issues submitted
                            by this citizen.
                        </p>

                    </div>


                    <select
                        value={problemFilter}
                        onChange={(e) =>
                            setProblemFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All statuses
                        </option>

                        <option value="open">
                            Open
                        </option>

                        <option value="under_review">
                            Under Review
                        </option>

                        <option value="assigned">
                            Assigned
                        </option>

                        <option value="in_progress">
                            In Progress
                        </option>

                        <option value="resolved">
                            Resolved
                        </option>

                        <option value="rejected">
                            Rejected
                        </option>

                        <option value="closed">
                            Closed
                        </option>

                    </select>

                </div>


                {problemLoading ? (

                    <div className="cp-problem-loading">
                        Loading reported problems...
                    </div>

                ) : problems.length === 0 ? (

                    <div className="cp-no-problems">

                        <strong>
                            No reported problems
                        </strong>

                        <span>
                            This citizen has not reported
                            any problems matching the
                            selected status.
                        </span>

                    </div>

                ) : (

                    <div className="cp-problem-list">

                        {problems.map(
                            (problem) => (

                                <div
                                    className="cp-problem"
                                    key={
                                        problem.id
                                    }
                                >

                                    <div className="cp-problem-code">

                                        {String(
                                            problem.problem_code
                                        ).slice(
                                            0,
                                            8
                                        ).toUpperCase()}

                                    </div>


                                    <div className="cp-problem-main">

                                        <h3>
                                            {problem.title}
                                        </h3>

                                        <p>
                                            {problem.description}
                                        </p>

                                        <div className="cp-problem-meta">

                                            <span>
                                                {
                                                    problem.category_name
                                                }
                                            </span>

                                            <span>
                                                {
                                                    problem.location
                                                }
                                            </span>

                                            <span>
                                                {formatDate(
                                                    problem.created_at
                                                )}
                                            </span>

                                        </div>

                                    </div>


                                    <div className="cp-problem-side">

                                        <span
                                            className={
                                                getProblemStatusClass(
                                                    problem.status
                                                )
                                            }
                                        >
                                            {
                                                problem.status
                                                    .replace(
                                                        "_",
                                                        " "
                                                    )
                                            }
                                        </span>

                                        <span
                                            className={
                                                `cp-priority ${problem.priority}`
                                            }
                                        >
                                            {
                                                problem.priority
                                            }
                                        </span>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

            </section>

        </div>
    );
}

export default CitizenProfile;