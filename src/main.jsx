import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import MaintenancePage from "./pages/MaintenancePage";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Check if maintenance mode is enabled
const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isMaintenanceMode ? <MaintenancePage /> : <RouterProvider router={router} />}
  </React.StrictMode>
);
