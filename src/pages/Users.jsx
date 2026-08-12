import { useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiMail,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
  FiLock,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../services/axios";
import "../styles/users.css";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "trainer",
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const response = await api.get("/users");

      setUsers(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load users"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.role?.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData(initialForm);
    setShowPassword(false);
    setShowFormModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);

    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "trainer",
    });

    setShowPassword(false);
    setShowFormModal(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingUser(null);
    setFormData(initialForm);
    setShowPassword(false);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedUser(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("User name is required");
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim()
      )
    ) {
      toast.error("Enter a valid email address");
      return false;
    }

    if (!editingUser && formData.password.length < 6) {
      toast.error(
        "Password must contain at least 6 characters"
      );
      return false;
    }

    if (
      editingUser &&
      formData.password &&
      formData.password.length < 6
    ) {
      toast.error(
        "Password must contain at least 6 characters"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSaving(true);

      if (editingUser) {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
        };

        if (formData.password.trim()) {
          payload.password = formData.password;
        }

        await api.patch(
          `/users/${editingUser.id}`,
          payload
        );

        toast.success("User updated successfully");
      } else {
        await api.post("/users/create-admin", {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });

        toast.success("User created successfully");
      }

      closeFormModal();
      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to save user"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await api.delete(
        `/users/${selectedUser.id}`
      );

      toast.success("User deleted successfully");

      setShowDeleteModal(false);
      setSelectedUser(null);

      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete user"
      );
    }
  };

  const formatRole = (role) => {
    if (!role) return "Administrator";

    return role
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="users-page">
<section className="users-directory">
        <div className="users-toolbar">
          <div className="users-search">
            <FiSearch />

            <input
              type="text"
              placeholder="Search name, email or role..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="add-user-btn"
            onClick={openAddModal}
          >
            <FiPlus />
            <span>Add User</span>
          </button>
        </div>

        <div className="users-table-card">
          {isLoading ? (
            <div className="users-message">
              <div className="users-loader" />
              <span>Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="users-message">
              <FiUsers />

              <strong>No users found</strong>

              <span>
                Try changing your search
              </span>
            </div>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.name
                              ?.charAt(0)
                              ?.toUpperCase() || "A"}
                          </div>

                          <div className="user-name">
                            <strong>
                              {user.name}
                            </strong>

                            <span>
                              {formatRole(user.role)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="user-email-cell">
                          <FiMail />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td>
                        <span className="user-role-badge">
                          <FiShield />

                          {formatRole(user.role)}
                        </span>
                      </td>

                      <td>
                        <div className="user-actions">
                          <button
                            type="button"
                            title="View User"
                            onClick={() =>
                              openViewModal(user)
                            }
                          >
                            <FiEye />
                          </button>

                          <button
                            type="button"
                            title="Edit User"
                            onClick={() =>
                              openEditModal(user)
                            }
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            type="button"
                            className="user-delete-btn"
                            title="Delete User"
                            onClick={() =>
                              openDeleteModal(user)
                            }
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
{showFormModal && (
        <div className="user-modal-overlay">
          <div className="user-modal user-form-modal">
            <div className="user-modal-header">
              <div className="user-modal-title">
                <div className="user-modal-icon">
                  <FiUser />
                </div>

                <div>
                  <h2>
                    {editingUser
                      ? "Edit User"
                      : "Add User"}
                  </h2>

                  <p>
                    {editingUser
                      ? "Update user account details"
                      : "Create a new portal user account"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="user-modal-close"
                onClick={closeFormModal}
              >
                <FiX />
              </button>
            </div>

            <form
              className="user-form"
              onSubmit={handleSubmit}
            >
              <div className="user-form-group">
                <label>User Name *</label>

                <div className="user-input-box">
                  <FiUser />

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter user name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label>Email Address *</label>

                <div className="user-input-box">
                  <FiMail />

                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="user-form-group">
                <label>
                  {editingUser
                    ? "New Password"
                    : "Password *"}
                </label>

                <div className="user-input-box">
                  <FiLock />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current password"
                        : "Minimum 6 characters"
                    }
                    value={formData.password}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="user-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {editingUser && (
                  <small className="password-help">
                    Password change panna venam na blank-ah
                    vidu.
                  </small>
                )}
              </div>

              <div className="user-form-group">
                <label>Role *</label>

                <div className="user-input-box user-select-box">
                  <FiShield />

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="admin">
                      Administrator
                    </option>

                    <option value="trainer">
                     Trainer
                    </option>
                  </select>
                </div>
              </div>

              <div className="user-form-actions">
                <button
                  type="button"
                  className="user-secondary-btn"
                  onClick={closeFormModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="user-primary-btn"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingUser
                      ? "Update User"
                      : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{showViewModal && selectedUser && (
        <div className="user-modal-overlay">
          <div className="user-profile-modal">
            <button
              type="button"
              className="user-profile-close"
              onClick={closeViewModal}
            >
              <FiX />
            </button>

            <div className="user-profile-top">
              <span>THE SK LEARNINGS</span>

              <small>
                {formatRole(selectedUser.role).toUpperCase()} PROFILE
              </small>
            </div>

            <div className="user-profile-main">
              <div className="user-profile-avatar">
                {selectedUser.name
                  ?.charAt(0)
                  ?.toUpperCase() || "A"}
              </div>

              <div>
                <span className="user-profile-label">
                  USER NAME
                </span>

                <h2>{selectedUser.name}</h2>

                <div className="user-profile-role">
                  <FiShield />
                  {formatRole(selectedUser.role)}
                </div>
              </div>
            </div>

            <div className="user-profile-details">
              <div className="user-profile-detail">
                <div>
                  <FiMail />
                </div>

                <span>Email Address</span>

                <strong>
                  {selectedUser.email}
                </strong>
              </div>

              <div className="user-profile-detail">
                <div>
                  <FiShield />
                </div>

                <span>Account Role</span>

                <strong>
                  {formatRole(
                    selectedUser.role
                  )}
                </strong>
              </div>
            </div>

            <div className="user-profile-footer">
              <span>
                MEDICAL • ENGINEERING • FOUNDATIONS •
                JUNIOR IAS
              </span>

              <strong>
                THE SK LEARNINGS
              </strong>
            </div>
          </div>
        </div>
      )}
{showDeleteModal && selectedUser && (
        <div className="user-modal-overlay">
          <div className="user-delete-modal">
            <div className="user-delete-icon">
              <FiTrash2 />
            </div>

            <h2>Delete User?</h2>

            <p>
              <strong>{selectedUser.name}</strong>{" "}
              account delete panna sure-ah? Indha action
              undo panna mudiyadhu.
            </p>

            <div className="user-delete-actions">
              <button
                type="button"
                className="user-secondary-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="user-confirm-delete"
                onClick={handleDelete}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;