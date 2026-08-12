import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Students from "./pages/Student";
import Users from "./pages/Users";
import Payments from "./pages/Payment";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/students"
              element={<Students />}
            />

            <Route
              path="/payments"
              element={<Payments />}
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute
                  allowedRoles={["admin"]}
                >
                  <Users />
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
    </BrowserRouter>
  );
};

export default App;