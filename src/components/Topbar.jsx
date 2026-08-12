import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import {
  FiMenu,
  FiUser,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";

import logo from "../assets/sk-logo.png";

const Topbar = ({ onMenuClick }) => {
  const location = useLocation();

  const [
    isProfileOpen,
    setIsProfileOpen,
  ] = useState(false);

  const profileRef = useRef(null);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const formatRole = (role) => {
    if (role === "admin") {
      return "Administrator";
    }

    if (role === "Trainer") {
      return "Trainer";
    }

    return "User";
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const getPageDetails = () => {
    if (
      location.pathname.startsWith(
        "/students"
      )
    ) {
      return {
        title: "Students",
        subtitle:
          "Manage student records and academic details",
      };
    }

    if (
      location.pathname.startsWith(
        "/payments"
      )
    ) {
      return {
        title: "Payments",
        subtitle:
          "Manage fee payments and payment records",
      };
    }

    if (
      location.pathname.startsWith(
        "/users"
      )
    ) {
      return {
        title: "Users",
        subtitle:
          "Manage administrator and Trainer accounts",
      };
    }

    return {
      title: "Dashboard",
      subtitle:
        "The SK Learnings Management Portal",
    };
  };

  const page = getPageDetails();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-btn"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <FiMenu />
        </button>

        <div className="mobile-app-brand">
          <div className="mobile-brand-logo">
            <img
              src={logo}
              alt="The SK Learnings"
            />
          </div>

          <div className="mobile-brand-content">
            <h1>
              THE <span>SK</span> LEARNINGS
            </h1>

            <p>{page.title}</p>
          </div>
        </div>

        <div className="topbar-page-info">
          <div className="topbar-title-row">
            <span className="topbar-accent" />

            <h2>{page.title}</h2>
          </div>

          <p>{page.subtitle}</p>
        </div>
      </div>

      <div className="topbar-right">
        <div
          className="topbar-profile-wrapper"
          ref={profileRef}
        >
          <button
            type="button"
            className={`topbar-user ${
              isProfileOpen
                ? "topbar-user-open"
                : ""
            }`}
            onClick={() =>
              setIsProfileOpen(
                (currentValue) =>
                  !currentValue
              )
            }
            aria-label="Open profile menu"
          >
            <div className="topbar-user-avatar">
              <FiUser />
            </div>

            <div className="topbar-user-info">
              <strong>
                {user.name || "User"}
              </strong>

              <span>
                {formatRole(user.role)}
              </span>
            </div>

            <FiChevronDown
              className={`profile-chevron ${
                isProfileOpen
                  ? "open"
                  : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-info">
                <div className="profile-dropdown-avatar">
                  <FiUser />
                </div>

                <div>
                  <strong>
                    {user.name || "User"}
                  </strong>

                  <span>
                    {formatRole(
                      user.role
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="profile-logout"
                onClick={handleLogout}
              >
                <FiLogOut />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;