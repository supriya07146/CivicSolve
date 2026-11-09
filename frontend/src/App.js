
import React from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

// Route Protection
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";

// Public Pages
import LandingPage from "./pages/LandingPage";
import Register from "./pages/Register";
import CitizenRegistration from "./pages/CitizenRegistration";
import OrganizationRegistration from "./pages/OrganizationRegistration";
import VerifyOTP from "./pages/VerifyOTP";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetOTP from "./pages/VerifyResetOTP";
import ResetPassword from "./pages/ResetPassword";

// Citizen Pages
import UserDashboard from "./pages/user/UserDashboard";
import CitizenLayout from "./components/CitizenLayout";
import CitizenReportProblem from "./pages/user/CitizenReportProblem";
import MyProblems from "./pages/user/MyProblems";
import CitizenProblemDetails from "./pages/user/CitizenProblemDetails";
import BrowseProblems from "./pages/user/BrowseProblems";
import ProblemDiscussion from "./pages/user/ProblemDiscussion";
import VerifyResolution from "./pages/user/VerifyResolution";
import UserProfile from "./pages/user/UserProfile";
import CitizenNotifications from "./pages/user/CitizenNotifications";

// Organization Pages
import OrganizationDashboard from "./pages/organization/OrganizationDashboard";
import OrganizationLayout from "./components/organization/OrganizationLayout";
import AvailableProblems from "./pages/organization/AvailableProblems";
import OrganizationProblemDetails from "./pages/organization/ProblemDetails";
import AcceptProblem from "./pages/organization/AcceptProblem";
import Solutions from "./pages/organization/Solutions";
import ActiveProblems from "./pages/organization/ActiveProblems";
import ResolvedProblems from "./pages/organization/ResolvedProblems";
import UpdateProgress from "./pages/organization/UpdateProgress";
import Notifications from "./pages/organization/Notifications";
import OrganizationProfile from "./pages/organization/OrganizationProfile";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import CitizenProfile from "./pages/admin/CitizenProfile";
import AdminLayout from "./components/admin/AdminLayout";
import OrganizationManagement from "./pages/admin/OrganizationManagement";
import ProblemManagement from "./pages/admin/ProblemManagement";
import AssignmentManagement from "./pages/admin/AssignmentManagement";
import Complaints from "./pages/admin/Complaints";
import SolutionManagement from "./pages/admin/SolutionManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import Analytics from "./pages/admin/Analytics";
import AdminProfile from "./pages/admin/AdminProfile";
import AddOrganization from "./pages/admin/AddOrganization";
import AdminNotifications from "./pages/admin/Notifications";

// Global Styles
import "./styles/LandingPage.css";
import "./styles/dashboard.css";

// Toast Provider
import { ToastProvider } from "./components/toast/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";


function App() {

    return (
        <BrowserRouter>
          <AuthProvider>

            <ToastProvider>

                <Routes>

                    {/* ================================= */}
                    {/* PUBLIC ROUTES */}
                    {/* ================================= */}

                    {/* Landing Page */}
                    <Route
                        path="/"
                        element={<LandingPage />}
                    />

                    {/* Registration */}
                    <Route
                        path="/register"
                        element={
                            <PublicRoute restricted>
                                <Register />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/register/citizen"
                        element={
                            <PublicRoute restricted>
                                <CitizenRegistration />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/register/organization"
                        element={
                            <PublicRoute restricted>
                                <OrganizationRegistration />
                            </PublicRoute>
                        }
                    />

                    {/* OTP Verification */}
                    <Route
                        path="/verify-otp"
                        element={
                            <PublicRoute restricted>
                                <VerifyOTP />
                            </PublicRoute>
                        }
                    />

                    {/* Login */}
                    <Route
                        path="/login"
                        element={
                            <PublicRoute restricted>
                                <Login />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/admin/login"
                        element={
                            <PublicRoute restricted>
                                <AdminLogin />
                            </PublicRoute>
                        }
                    />

                    {/* Forgot and Reset Password */}
                    <Route
                        path="/forgot-password"
                        element={
                            <PublicRoute>
                                <ForgotPassword />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/verify-reset-otp"
                        element={
                            <PublicRoute>
                                <VerifyResetOTP />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/reset-password"
                        element={
                            <PublicRoute>
                                <ResetPassword />
                            </PublicRoute>
                        }
                    />


                    {/* ================================= */}
                    {/* CITIZEN PRIVATE ROUTES */}
                    {/* ================================= */}

                    <Route
                        path="/user"
                        element={
                            <PrivateRoute allowedRoles={["citizen"]}>
                                <CitizenLayout />
                            </PrivateRoute>
                        }
                    >

                        <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                        />

                        <Route
                            path="dashboard"
                            element={<UserDashboard />}
                        />

                        <Route
                            path="report"
                            element={<CitizenReportProblem />}
                        />

                        <Route
                            path="my-problems"
                            element={<MyProblems />}
                        />

                        <Route
                            path="problem/:problemId"
                            element={<CitizenProblemDetails />}
                        />

                        <Route
                            path="browse"
                            element={<BrowseProblems />}
                        />

                        <Route
                            path="problem-discussion"
                            element={<ProblemDiscussion />}
                        />

                        <Route
                            path="problem/:problemId/discussion"
                            element={<ProblemDiscussion />}
                        />

                        <Route
                            path="verify/:problemId"
                            element={<VerifyResolution />}
                        />

                        <Route
                            path="notifications"
                            element={<CitizenNotifications />}
                        />

                        <Route
                            path="profile"
                            element={<UserProfile />}
                        />

                    </Route>


                    {/* ================================= */}
                    {/* ORGANIZATION PRIVATE ROUTES */}
                    {/* ================================= */}

                    <Route
                        path="/organization"
                        element={
                            <PrivateRoute allowedRoles={["organization"]}>
                                <OrganizationLayout />
                            </PrivateRoute>
                        }
                    >

                        <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                        />

                        <Route
                            path="dashboard"
                            element={<OrganizationDashboard />}
                        />

                        <Route
                            path="available-problems"
                            element={<AvailableProblems />}
                        />

                        <Route
                            path="problems/:problemId/accept"
                            element={<AcceptProblem />}
                        />

                        <Route
                            path="problems/:problemId/details"
                            element={<OrganizationProblemDetails />}
                        />

                        <Route
                            path="solutions"
                            element={<Solutions />}
                        />

                        <Route
                            path="notifications"
                            element={<Notifications />}
                        />

                        <Route
                            path="profile"
                            element={<OrganizationProfile />}
                        />

                        <Route
                            path="active-problems"
                            element={<ActiveProblems />}
                        />

                        <Route
                            path="resolved-problems"
                            element={<ResolvedProblems />}
                        />

                        <Route
                            path="progress"
                            element={<UpdateProgress />}
                        />

                    </Route>


                    {/* ================================= */}
                    {/* ADMIN PRIVATE ROUTES */}
                    {/* ================================= */}

                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute allowedRoles={["admin"]}>
                                <AdminLayout />
                            </PrivateRoute>
                        }
                    >

                        <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                        />

                        <Route
                            path="dashboard"
                            element={<AdminDashboard />}
                        />

                        <Route
                            path="organizations"
                            element={<OrganizationManagement />}
                        />

                        <Route
                            path="organizations/new"
                            element={<AddOrganization />}
                        />

                        <Route
                            path="users"
                            element={<UserManagement />}
                        />

                        <Route
                            path="users/:userId"
                            element={<CitizenProfile />}
                        />

                        <Route
                            path="problems"
                            element={<ProblemManagement />}
                        />

                        <Route
                            path="assignments"
                            element={<AssignmentManagement />}
                        />

                        <Route
                            path="categories"
                            element={<CategoryManagement />}
                        />

                        <Route
                            path="solutions"
                            element={<SolutionManagement />}
                        />

                        <Route
                            path="complaints"
                            element={<Complaints />}
                        />

                        <Route
                            path="notifications"
                            element={<AdminNotifications />}
                        />

                        <Route
                            path="analytics"
                            element={<Analytics />}
                        />

                        <Route
                            path="profile"
                            element={<AdminProfile />}
                        />

                    </Route>


                    {/* ================================= */}
                    {/* FALLBACK ROUTE */}
                    {/* ================================= */}

                    <Route
                        path="/403"
                        element={<AccessDenied />}
                    />
                    <Route
                        path="*"
                        element={<NotFound />}
                    />

                </Routes>

            </ToastProvider>

        </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
