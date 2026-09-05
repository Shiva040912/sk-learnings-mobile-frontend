// Single place that decides "where does this user belong" after login/on a
// blocked route — reused by Login (initial redirect) and ProtectedRoute
// (redirect when the page a user is on/heading to isn't allowed).
export const FALLBACK_PAGE_ORDER = ["students", "payments", "users", "settings"];

export const FALLBACK_PATH_BY_PAGE = {
  students: "/students",
  payments: "/payments",
  users: "/users",
  settings: "/settings",
};

// A Trainer created without any page turned on has nowhere to land — send
// them to the pending-access screen instead of bouncing them back to Login.
export const NO_ACCESS_PATH = "/no-access";

export const resolveLandingPath = (user) => {
  if (!user) return "/";

  if (user.role === "admin") {
    return FALLBACK_PATH_BY_PAGE.students;
  }

  const permissions = user.permissions || {};

  const accessiblePage = FALLBACK_PAGE_ORDER.find(
    (page) => permissions?.[page]?.access === true
  );

  return accessiblePage
    ? FALLBACK_PATH_BY_PAGE[accessiblePage]
    : NO_ACCESS_PATH;
};
