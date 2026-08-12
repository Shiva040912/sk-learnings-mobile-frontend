import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../styles/layout.css";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="dashboard-main">
        <Topbar
          onMenuClick={() =>
            setIsSidebarOpen(true)
          }
        />

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;