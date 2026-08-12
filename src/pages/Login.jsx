import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
} from "react-icons/fi";
import {
  FaGraduationCap,
  FaShieldAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";

import api from "../services/axios";
import "../styles/login.css";
import logo from "../assets/sk-logo.png";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsLoggingIn(true);

      const response = await api.post("/auth/login", formData);

      localStorage.setItem(
        "accessToken",
        response.data.accessToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      toast.success("Login successful");

      navigate("/students");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setIsLoggingIn(false);
    }
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

              <p>
                MEDICAL / ENGINEERING / FOUNDATIONS / JUNIOR IAS
              </p>
            </div>
          </div>
        </section>

        <div className="mobile-welcome">
          <span className="mobile-welcome-badge">
            <FaGraduationCap />
          </span>

          <h2>Welcome Back</h2>

          <p>
            Sign in to continue to your institute dashboard
          </p>
        </div>

        <div className="brand-divider">
          <span />

          <div className="brand-divider-icon">
            <FaGraduationCap />
          </div>

          <span />
        </div>

        <div className="login-card">
          <div className="mobile-sheet-handle" />

          <div className="login-card-glow" />

          <div className="login-shield">
            <FaShieldAlt className="shield-icon" />

            <FaGraduationCap className="shield-cap" />
          </div>

          <div className="login-heading-area">
            <h3 className="login-title">
              ADMIN LOGIN
            </h3>

            <p className="mobile-login-description">
              Enter your account details to continue
            </p>
          </div>

          <div className="login-title-line" />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>

              <div className="input-box">
                <div className="input-icon-box">
                  <FiMail className="input-icon" />
                </div>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="input-box">
                <div className="input-icon-box">
                  <FiLock className="input-icon" />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="eye-btn"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember">
                <input type="checkbox" />

                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="forgot-btn"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoggingIn}
            >
              <FiLock />

              <span>
                {isLoggingIn
                  ? "LOGGING IN..."
                  : "LOGIN"}
              </span>
            </button>
          </form>

          <div className="login-footer">
            <h4>THE SK LEARNINGS</h4>

            <p>Private Educational Services</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;