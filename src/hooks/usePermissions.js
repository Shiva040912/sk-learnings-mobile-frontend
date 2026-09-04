import { useAuth } from "../context/AuthContext";

// Central, reusable permission helper — use this instead of scattering
// `user.role === "admin"` / trainer-specific conditions across pages.
//
//   const { hasPageAccess, hasPermission } = usePermissions();
//   hasPageAccess("students")
//   hasPermission("students", "actions", "add")
//   hasPermission("students", "columns", "totalFee")
//   hasPermission("students", "sections", "feeInfo")
//
// Admin always resolves to true for every check (Admin Protection) —
// callers never need a separate isAdmin branch around these calls.
export const usePermissions = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const permissions = user?.permissions || {};

  const hasPageAccess = (page) => {
    if (isAdmin) return true;

    return permissions?.[page]?.access === true;
  };

  const hasPermission = (page, kind, key) => {
    if (isAdmin) return true;

    if (!hasPageAccess(page)) return false;

    return permissions?.[page]?.[kind]?.[key] === true;
  };

  return {
    isAdmin,
    permissions,
    hasPageAccess,
    hasPermission,
  };
};
