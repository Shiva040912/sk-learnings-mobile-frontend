import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

// Pages a Trainer could conceivably land on after login, in priority order,
// used to pick a safe redirect target when the page they tried has no
// access. Kept in sync with the routes registered in App.jsx.
const FALLBACK_PAGE_ORDER = ["students", "payments"];
const FALLBACK_PATH_BY_PAGE = {
  students: "/students",
  payments: "/payments",
};

const ProtectedRoute = ({
  allowedRoles,
  pageKey,
  children,
}) => {
  const accessToken =
    localStorage.getItem("accessToken");

  const { user, isReady } = useAuth();
  const { hasPageAccess } = usePermissions();

  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/students" replace />;
  }

  // Wait for the freshly-fetched permissions before deciding — otherwise a
  // trainer with real access could get bounced during the brief window
  // before /auth/me resolves on first load.
  if (pageKey && isReady && !hasPageAccess(pageKey)) {
    const nextPage = FALLBACK_PAGE_ORDER.find(
      (page) =>
        page !== pageKey && hasPageAccess(page)
    );

    return (
      <Navigate
        to={
          nextPage
            ? FALLBACK_PATH_BY_PAGE[nextPage]
            : "/"
        }
        replace
      />
    );
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
