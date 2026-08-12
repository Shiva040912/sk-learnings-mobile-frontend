import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({
  allowedRoles,
  children,
}) => {
  const accessToken =
    localStorage.getItem("accessToken");

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/students" replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;