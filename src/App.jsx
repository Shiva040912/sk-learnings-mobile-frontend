import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Students from "./pages/Student";
import Users from "./pages/Users";
import Payments from "./pages/Payment";
import StudentPayment from "./pages/StudentPayment";
import Settings from "./pages/Settings";
import NoAccess from "./pages/NoAccess";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
          }}
        />

        <Routes>
          <Route
            path="/"
            element={<Login />}
          />

          {/* Public student payment page */}
          <Route
            path="/pay-fees/:studentId"
            element={<StudentPayment />}
          />

          {/* Protected admin routes */}
          <Route
            element={<ProtectedRoute />}
          >
            {/* Rendered full-page (no sidebar/topbar) for a Trainer with
                no page turned on yet — see accessRouting.js */}
            <Route
              path="/no-access"
              element={<NoAccess />}
            />

            <Route
              element={<DashboardLayout />}
            >
              <Route
                path="/students"
                element={
                  <ProtectedRoute
                    pageKey="students"
                  >
                    <Students />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payments"
                element={
                  <ProtectedRoute
                    pageKey="payments"
                  >
                    <Payments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute
                    pageKey="users"
                  >
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute
                    pageKey="settings"
                  >
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
