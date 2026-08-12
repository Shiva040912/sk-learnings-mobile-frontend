import { NavLink } from "react-router-dom";
import {
  FiUsers,
  FiCreditCard,
  FiUser,
  FiX,
} from "react-icons/fi";

import logo from "../assets/sk-logo.png";

const Sidebar = ({ isOpen, onClose }) => {
  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const isAdministrator =
    user.role === "admin";

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand-area">
          <div className="sidebar-logo-wrap">
            <img
              src={logo}
              alt="The SK Learnings"
              className="sidebar-logo"
            />
          </div>

          <div className="sidebar-brand-text">
            <h1>
              THE <span>SK</span> LEARNINGS
            </h1>

            <p>
              Private Educational Services
            </p>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/students"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <FiUsers />
            </span>

            <span className="sidebar-label">
              Students
            </span>
          </NavLink>

          <NavLink
            to="/payments"
            className={({ isActive }) =>
              `sidebar-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon">
              <FiCreditCard />
            </span>

            <span className="sidebar-label">
              Payments
            </span>
          </NavLink>

          {isAdministrator && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "active" : ""
                }`
              }
              onClick={onClose}
            >
              <span className="sidebar-icon">
                <FiUser />
              </span>

              <span className="sidebar-label">
                Users
              </span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom-line" />
      </aside>
    </>
  );
};

export default Sidebar;