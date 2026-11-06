
// ======================================================
// CivicSolve API Service
// ======================================================

// Central API configuration
// Local development uses localhost.
// Deployment uses REACT_APP_API_URL from the environment.

export const API_ROOT = (
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const API_BASE_URL = `${API_ROOT}/auth`;
const ADMIN_API_BASE_URL = `${API_ROOT}/admin`;
const USER_DASHBOARD_BASE_URL = `${API_ROOT}/user/dashboard`;
const NOTIFICATION_BASE_URL = `${API_ROOT}/notifications`;
const PROBLEMS_API_BASE_URL = `${API_ROOT}/problems`;
const ORGANIZATION_API_BASE_URL = `${API_ROOT}/organization`;

// ======================================================
// SHARED REQUEST FUNCTION
// Authentication, Citizen, and Organization APIs
// ======================================================

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const isLoginRequest = [
    "/login/",
    "/admin/login/",
  ].includes(endpoint);

  const headers = {
    ...(isFormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token && !isLoginRequest) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.join(", ")
          : data.message ||
            data.error ||
            "Request failed";

    throw new Error(message);
  }

  return data;
}

// ======================================================
// ADMIN REQUEST FUNCTION
// ======================================================

async function adminRequest(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(
    `${ADMIN_API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...(isFormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  if (response.status === 401) {
    [
      "access_token",
      "refresh_token",
      "account_type",
    ].forEach((key) => localStorage.removeItem(key));

    window.location.href = "/admin/login";

    throw new Error(
      "Session expired. Please log in again."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      data.error ||
      "Something went wrong."
    );
  }

  return data;
}

// ======================================================
// CITIZEN REGISTRATION
// ======================================================

export const citizenRegister = (data) =>
  request("/citizen/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// CITIZEN OTP VERIFICATION
// ======================================================

export const citizenVerifyOTP = (data) =>
  request("/citizen/verify-otp/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// CITIZEN RESEND OTP
// ======================================================

export const citizenResendOTP = (data) =>
  request("/citizen/resend-otp/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// ORGANIZATION REGISTRATION
// ======================================================

export const organizationRegister = (data) =>
  request("/organization/register/", {
    method: "POST",
    body: data,
  });

// ======================================================
// ORGANIZATION OTP VERIFICATION
// ======================================================

export const organizationVerifyOTP = (data) =>
  request("/organization/verify-otp/", {
    method: "POST",
    body: JSON.stringify({
      email: data.email.trim().toLowerCase(),
      otp: String(data.otp).trim(),
    }),
  });

// ======================================================
// ORGANIZATION RESEND OTP
// ======================================================

export const organizationResendOTP = (data) =>
  request("/organization/resend-otp/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// GENERAL LOGIN
// ======================================================

export const login = (data) =>
  request("/login/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// FORGOT PASSWORD
// ======================================================

export const forgotPassword = (data) =>
  request("/forgot-password/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// VERIFY PASSWORD RESET OTP
// ======================================================

export const verifyResetOTP = (data) =>
  request("/verify-reset-otp/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// RESET PASSWORD
// ======================================================

export const resetPassword = (data) =>
  request("/reset-password/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// ADMIN LOGIN
// ======================================================

export const adminLogin = (data) =>
  request("/admin/login/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// ADMIN - CITIZEN MANAGEMENT
// ======================================================

export const getAdminCitizens = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/users/${queryString}`);
};

export const getAdminCitizen = (id) =>
  adminRequest(`/users/${id}/`);

export const getAdminCitizenProblems = (
  id,
  params = {}
) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(
    `/users/${id}/problems/${queryString}`
  );
};

export const updateCitizenStatus = (id, data) =>
  adminRequest(`/users/${id}/status/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ======================================================
// ADMIN - ORGANIZATION MANAGEMENT
// ======================================================

export const getAdminOrganizations = async ({
  status = "",
  search = "",
} = {}) => {
  const params = new URLSearchParams();

  if (status) params.append("status", status);
  if (search) params.append("search", search);

  const query = params.toString();

  return adminRequest(
    `/organizations/${query ? `?${query}` : ""}`
  );
};

export const getAdminOrganization = (id) =>
  adminRequest(`/organizations/${id}/`);

export const approveAdminOrganization = (id) =>
  adminRequest(`/organizations/${id}/approve/`, {
    method: "PATCH",
  });

export const rejectAdminOrganization = (id) =>
  adminRequest(`/organizations/${id}/reject/`, {
    method: "PATCH",
  });

export const suspendAdminOrganization = (id) =>
  adminRequest(`/organizations/${id}/suspend/`, {
    method: "PATCH",
  });

export const createAdminOrganization = (formData) =>
  adminRequest("/organizations/", {
    method: "POST",
    body: formData,
  });

// ======================================================
// ADMIN - PROBLEM MANAGEMENT
// ======================================================

export const getAdminProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/problems/${queryString}`);
};

export const getAdminProblem = (id) =>
  adminRequest(`/problems/${id}/`);

// ======================================================
// ADMIN DUPLICATE PROBLEM SUGGESTIONS
// ======================================================

export const getDuplicateProblemSuggestions = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return problemRequest(
    `/admin/duplicate-suggestions/${query ? `?${query}` : ""}`
  );
};

export const reviewDuplicateProblemSuggestion = (
  suggestionId,
  reviewStatus
) =>
  problemRequest(
    `/admin/duplicate-suggestions/${suggestionId}/review/`,
    {
      method: "PATCH",
      body: JSON.stringify({
        review_status: reviewStatus,
      }),
    }
  );

// ======================================================
// ADMIN - PROBLEM ASSIGNMENTS
// ======================================================

export const getAdminAssignments = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/assignments/${suffix}`);
};

export const getAdminAssignment = (id) =>
  adminRequest(`/assignments/${id}/`);

export const createAdminAssignment = (data) =>
  adminRequest("/assignments/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// ADMIN - CATEGORY MANAGEMENT
// ======================================================

export const getAdminCategories = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/categories/${suffix}`);
};

export const getAdminCategory = (id) =>
  adminRequest(`/categories/${id}/`);

export const createAdminCategory = (data) =>
  adminRequest("/categories/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateAdminCategory = (id, data) =>
  adminRequest(`/categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const updateAdminCategoryStatus = (
  id,
  is_active
) =>
  adminRequest(`/categories/${id}/status/`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });

// ======================================================
// ADMIN - SOLUTION MANAGEMENT
// ======================================================

export const getAdminSolutions = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/solutions/${suffix}`);
};

export const createAdminSolution = (data) =>
  adminRequest("/solutions/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getAdminSolution = (id) =>
  adminRequest(`/solutions/${id}/`);

export const reviewAdminSolution = (id, data) =>
  adminRequest(`/solutions/${id}/review/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ======================================================
// ADMIN - COMPLAINT MANAGEMENT
// ======================================================

export const getAdminComplaints = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return adminRequest(`/complaints/${suffix}`);
};

export const getAdminComplaint = (complaintCode) =>
  adminRequest(`/complaints/${complaintCode}/`);

export const reviewAdminComplaint = (
  complaintCode,
  data
) =>
  adminRequest(
    `/complaints/${complaintCode}/review/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );

// ======================================================
// ADMIN - ANALYTICS
// ======================================================

export const getAdminAnalytics = () =>
  adminRequest("/analytics/");

export const getAdminOverdueProblems = () =>
  adminRequest("/analytics/overdue/");

export const getAdminEscalatedProblems = () =>
  adminRequest("/analytics/escalated/");

export const updateAdminProblemEscalation = (
  problemCode,
  isEscalated
) =>
  adminRequest(
    `/analytics/problems/${problemCode}/escalation/`,
    {
      method: "PATCH",
      body: JSON.stringify({
        is_escalated: isEscalated,
      }),
    }
  );

export const getAdminAIInsights = () =>
  adminRequest("/analytics/ai-insights/");

// ======================================================
// ADMIN - PROFILE MANAGEMENT
// ======================================================

export const getAdminProfile = () =>
  adminRequest("/profile/", {
    method: "GET",
  });

export const updateAdminProfile = (formData) =>
  adminRequest("/profile/", {
    method: "PATCH",
    body: formData,
  });

// ======================================================
// ADMIN - CHANGE PASSWORD
// ======================================================

export const changeAdminPassword = (data) =>
  adminRequest("/profile/change-password/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// LEGACY ALIASES
// ======================================================

export const getPendingOrganizations = () =>
  getAdminOrganizations({ status: "pending" });

export const approveOrganization =
  approveAdminOrganization;

export const rejectOrganization =
  rejectAdminOrganization;

export const suspendOrganization =
  suspendAdminOrganization;

// ======================================================
// CITIZEN DASHBOARD
// ======================================================

async function citizenDashboardRequest(url, options = {}) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.message ||
      data.error ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

export const getCitizenDashboardSummary = () =>
  citizenDashboardRequest(
    `${USER_DASHBOARD_BASE_URL}/summary/`
  );

export const getCitizenRecentProblems = (limit = 5) =>
  citizenDashboardRequest(
    `${USER_DASHBOARD_BASE_URL}/recent-problems/?limit=${limit}`
  );

export const getCitizenNotifications = (limit = 5) =>
  citizenDashboardRequest(
    `${NOTIFICATION_BASE_URL}/?limit=${limit}`
  );

export const getCitizenUnreadNotificationCount = () =>
  citizenDashboardRequest(
    `${NOTIFICATION_BASE_URL}/unread-count/`
  );

export const markCitizenNotificationRead = (id) =>
  citizenDashboardRequest(
    `${NOTIFICATION_BASE_URL}/${id}/read/`,
    { method: "PATCH" }
  );

export const markAllCitizenNotificationsRead = () =>
  citizenDashboardRequest(
    `${NOTIFICATION_BASE_URL}/read-all/`,
    { method: "POST" }
  );

export const deleteCitizenNotification = (id) =>
  citizenDashboardRequest(
    `${NOTIFICATION_BASE_URL}/${id}/`,
    { method: "DELETE" }
  );

// ======================================================
// CITIZEN - REPORT PROBLEM & DRAFTS
// ======================================================

async function problemRequest(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(
    `${PROBLEMS_API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...(isFormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = "";

    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail.join(", ");
    } else if (data.message) {
      message = data.message;
    } else if (data.error) {
      message = data.error;
    } else if (typeof data === "object" && data !== null) {
      const errorList = [];

      for (const [field, errs] of Object.entries(data)) {
        if (field === "detail") continue;

        const text = Array.isArray(errs)
          ? errs.join(", ")
          : String(errs);

        errorList.push(`${field}: ${text}`);
      }

      if (errorList.length > 0) {
        message = errorList.join(" | ");
      }
    }

    if (!message) {
      message = `Request failed (${response.status})`;
    }

    throw new Error(message);
  }

  return data;
}

// Active problem categories
export const getProblemCategories = () =>
  problemRequest("/categories/");

// ======================================================
// CITIZEN - AI SMART PROBLEM REPORTING
// ======================================================

export const generateAIProblemSuggestions = (description) =>
  problemRequest("/ai-suggestions/", {
    method: "POST",
    body: JSON.stringify({
      description: description.trim(),
    }),
  });

// ======================================================
// CITIZEN - CIVICSOLVE AI ASSISTANT
// ======================================================

export const askCivicSolveAssistant = (message) =>
  problemRequest("/assistant/", {
    method: "POST",
    body: JSON.stringify({
      message: message.trim(),
    }),
  });

// Create an official problem directly
export const createCitizenProblem = (data) =>
  problemRequest("/create/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Upload attachment to an official problem directly
export const uploadProblemAttachment = (problemId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return problemRequest(`/${problemId}/attachments/`, {
    method: "POST",
    body: formData,
  });
};

// ======================================================
// CITIZEN - MY PROBLEMS
// ======================================================

export const getMyProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return problemRequest(`/my/${suffix}`);
};

export const getMyProblemDetails = (problemId) =>
  problemRequest(`/${encodeURIComponent(problemId)}/`);

export const getMyProblemDrafts = () =>
  problemRequest("/drafts/");

export const createProblemDraft = (data) =>
  problemRequest("/drafts/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getProblemDraft = (draftId) =>
  problemRequest(`/drafts/${draftId}/`);

export const updateProblemDraft = (draftId, data) =>
  problemRequest(`/drafts/${draftId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteProblemDraft = (draftId) =>
  problemRequest(`/drafts/${draftId}/`, {
    method: "DELETE",
  });

export const uploadProblemDraftAttachment = (
  draftId,
  file
) => {
  const formData = new FormData();
  formData.append("file", file);

  return problemRequest(
    `/drafts/${draftId}/attachments/`,
    {
      method: "POST",
      body: formData,
    }
  );
};

export const submitProblemDraft = (draftId) =>
  problemRequest(`/drafts/${draftId}/submit/`, {
    method: "POST",
  });

// ======================================================
// CITIZEN - BROWSE COMMUNITY PROBLEMS
// ======================================================

export const getBrowseProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "";

  return problemRequest(`/browse/${suffix}`);
};

// ======================================================
// CITIZEN - PROBLEM DISCUSSION
// ======================================================

export const getProblemDiscussions = (problemId) =>
  problemRequest(
    `/${encodeURIComponent(problemId)}/discussions/`
  );

export const createProblemDiscussion = (
  problemId,
  { message, parent = null }
) =>
  problemRequest(
    `/${encodeURIComponent(problemId)}/discussions/`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        ...(parent !== null ? { parent } : {}),
      }),
    }
  );

export function getCitizenResolutionReview(problemId) {
  return problemRequest(
    `/${encodeURIComponent(problemId)}/resolution-review/`
  );
}

export function submitCitizenResolutionReview(
  problemId,
  { solution_id, decision, feedback = "" }
) {
  return problemRequest(
    `/${encodeURIComponent(problemId)}/resolution-review/`,
    {
      method: "POST",
      body: JSON.stringify({
        solution_id,
        decision,
        feedback,
      }),
    }
  );
}

// ======================================================
// CITIZEN - PROFILE, IMAGE UPLOAD & PASSWORD
// ======================================================

export const getCitizenProfile = () =>
  request("/profile/", {
    method: "GET",
  });

export const updateCitizenProfile = (data) =>
  request("/profile/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const uploadCitizenProfileImage = (file) => {
  const formData = new FormData();
  formData.append("profile_image", file);

  return request("/profile/", {
    method: "PATCH",
    body: formData,
  });
};

export const deleteCitizenProfileImage = () =>
  request("/profile/image/", {
    method: "DELETE",
  });

export const changeCitizenPassword = (data) =>
  request("/profile/change-password/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ======================================================
// ORGANIZATION - AVAILABLE PROBLEMS
// ======================================================

let organizationSessionExpiryHandled = false;

async function organizationRequest(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(
    `${ORGANIZATION_API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...(isFormData
          ? {}
          : options.body
            ? { "Content-Type": "application/json" }
            : {}),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (!organizationSessionExpiryHandled) {
      organizationSessionExpiryHandled = true;

      [
        "access_token",
        "refresh_token",
        "account_type",
      ].forEach((key) => localStorage.removeItem(key));

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("civicsolve:session-expired", {
            detail: { accountType: "organization" },
          })
        );
      }
    }

    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  if (!response.ok) {
    const detail = data.detail;

    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.join(", ")
          : data.message ||
            data.error ||
            `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  organizationSessionExpiryHandled = false;

  return data;
}

// GET available problems
export const getOrganizationAvailableProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return organizationRequest(
    `/available-problems/${queryString}`
  );
};

// GET organization dashboard summary
export const getOrganizationDashboard = () =>
  organizationRequest("/dashboard/");

// ======================================================
// ORGANIZATION - PROBLEM DETAILS
// ======================================================

export const getOrganizationProblemDetails = (problemId) => {
  if (
    problemId === undefined ||
    problemId === null ||
    String(problemId).trim() === ""
  ) {
    throw new Error("A problem ID is required.");
  }

  return organizationRequest(
    `/problems/${encodeURIComponent(problemId)}/details/`
  );
};

// ======================================================
// ORGANIZATION - ACCEPT / CANCEL ASSIGNMENT
// ======================================================

export const acceptOrganizationAssignment = (
  assignmentId,
  acknowledgement
) =>
  organizationRequest(
    `/assignments/${encodeURIComponent(assignmentId)}/accept/`,
    {
      method: "POST",
      body: JSON.stringify({
        acknowledgement: acknowledgement === true,
      }),
    }
  );

export const cancelOrganizationAssignment = (
  assignmentId,
  reason
) =>
  organizationRequest(
    `/assignments/${encodeURIComponent(assignmentId)}/cancel/`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );

// ======================================================
// ORGANIZATION - SOLUTIONS
// ======================================================

export const getOrganizationSolutions = () =>
  organizationRequest("/solutions/");

export const submitOrganizationSolution = (data) =>
  organizationRequest("/solutions/", {
    method: "POST",
    body: JSON.stringify({
      assignment_id: Number(data.assignment_id),
      title: data.title.trim(),
      description: data.description.trim(),
      proposed_action: (data.proposed_action || "").trim(),
    }),
  });

export const getOrganizationSolutionDetails = (solutionId) =>
  organizationRequest(
    `/solutions/${encodeURIComponent(solutionId)}/`
  );

export const uploadOrganizationSolutionEvidence = (
  solutionId,
  { evidence_type, file, caption = "" }
) => {
  const formData = new FormData();
  formData.append("evidence_type", evidence_type);
  formData.append("file", file);

  if (caption.trim()) {
    formData.append("caption", caption.trim());
  }

  return organizationRequest(
    `/solutions/${encodeURIComponent(solutionId)}/evidence/`,
    {
      method: "POST",
      body: formData,
    }
  );
};

// ======================================================
// ORGANIZATION - PROFILE
// ======================================================

export const getOrganizationProfile = () =>
  organizationRequest("/profile/");

export const updateOrganizationProfile = (data) =>
  organizationRequest("/profile/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const uploadOrganizationProfileImage = (imageFile) => {
  const formData = new FormData();
  formData.append("profile_image", imageFile);

  return organizationRequest("/profile/image/", {
    method: "POST",
    body: formData,
  });
};

export const deleteOrganizationProfileImage = () =>
  organizationRequest("/profile/image/", {
    method: "DELETE",
  });

// ======================================================
// ORGANIZATION - ACTIVE PROBLEMS
// ======================================================

export const getOrganizationActiveProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return organizationRequest(
    `/active-problems/${queryString}`
  );
};

// ======================================================
// ORGANIZATION - RESOLVED PROBLEMS
// ======================================================

export const getOrganizationResolvedProblems = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString()
    ? `?${query.toString()}`
    : "";

  return organizationRequest(
    `/resolved-problems/${queryString}`
  );
};

// ======================================================
// ORGANIZATION - UPDATE PROGRESS
// ======================================================

export const getOrganizationProgressAssignments = () =>
  organizationRequest("/progress/");

export const submitOrganizationProgress = (
  assignmentId,
  { progress_percentage, update_notes, evidence }
) => {
  const formData = new FormData();

  formData.append(
    "progress_percentage",
    String(progress_percentage)
  );
  formData.append("update_notes", update_notes.trim());

  if (evidence) {
    formData.append("evidence", evidence);
  }

  return organizationRequest(
    `/progress/assignments/${encodeURIComponent(
      assignmentId
    )}/updates/`,
    {
      method: "POST",
      body: formData,
    }
  );
};

export const getOrganizationProgressHistory = (
  assignmentId
) =>
  organizationRequest(
    `/progress/assignments/${encodeURIComponent(
      assignmentId
    )}/history/`
  );

// ======================================================
// ORGANIZATION - NOTIFICATIONS
// ======================================================

export const getOrganizationNotifications = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const suffix = query.toString()
    ? `?${query.toString()}`
    : "?limit=100";

  return organizationRequest(`/notifications/${suffix}`);
};

export const getOrganizationUnreadNotificationCount = () =>
  organizationRequest("/notifications/unread-count/");

export const markOrganizationNotificationRead = (notificationId) =>
  organizationRequest(
    `/notifications/${encodeURIComponent(notificationId)}/read/`,
    { method: "PATCH" }
  );

export const markAllOrganizationNotificationsRead = () =>
  organizationRequest("/notifications/read-all/", {
    method: "POST",
  });
