import { useNavigate } from "react-router-dom";
import { FiLock, FiLogOut } from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import "../styles/login.css";
import "../styles/no-access.css";
import logo from "../assets/sk-logo.png";

// Shown instead of the dashboard when a Trainer has been created but no
// admin has switched on any page for them yet — otherwise they'd log in
// successfully and immediately get bounced back to the login screen with
// no explanation (ProtectedRoute finding nowhere it can send them).
const NoAccess = () => {
  const navigate = useNavigate();
  const { user, clearAuthenticatedUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    clearAuthenticatedUser();

    navigate("/", { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="classroom-board classroom-board-left" />
        <div className="classroom-board classroom-board-right" />

        <div className="desk-row desk-row-one" />
        <div className="desk-row desk-row-two" />
        <div className="desk-row desk-row-three" />
      </div>

      <div className="login-dark-overlay" />

      <div className="login-container">
        <section className="login-brand-section">
          <div className="brand-main">
            <img
              src={logo}
              alt="The SK Learnings"
              className="login-logo"
            />

            <div className="brand-text">
              <h1>THE SK LEARNINGS</h1>

              <h2>PRIVATE EDUCATIONAL SERVICES</h2>
            </div>
          </div>
        </section>

        <div className="login-card no-access-card">
          <div className="login-card-glow" />

          <div className="login-shield no-access-lock">
            <FiLock className="shield-icon" />
          </div>

          <div className="login-heading-area">
            <h3 className="login-title">
              Welcome, {user?.name || "there"}!
            </h3>
          </div>

          <div className="login-title-line" />

          <p className="no-access-message">
            Your profile has been created successfully.
          </p>

          <p className="no-access-message">
            As soon as your page access is enabled by our
            admin, you&apos;ll be able to sign in to your
            dashboard.
          </p>

          <button
            type="button"
            className="login-btn no-access-logout-btn"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>LOGOUT</span>
          </button>

          <div className="login-footer">
            <h4>THE SK LEARNINGS</h4>

            <p>Private Educational Services</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAccess;
