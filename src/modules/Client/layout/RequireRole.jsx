// src/modules/Client/layout/RequireRole.jsx
import { Navigate, useLocation } from "react-router-dom";
import { getUserToken, getCurrentUser } from "../../../services/userAuth";

export default function RequireRole({ role, children }) {
  const token = getUserToken();
  const loc = useLocation();
  const user = getCurrentUser?.(); 

  // Debug logging
  console.log("[RequireRole] Auth check:", {
    path: loc.pathname,
    hasToken: !!token,
    tokenPreview: token?.slice(0, 30) + "...",
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    requiredRole: role,
    localStorage: !!localStorage.getItem("flexidesk_user_token"),
    sessionStorage: !!sessionStorage.getItem("flexidesk_user_token")
  });

  if (!token) {
    console.log("[RequireRole] ❌ No token found, redirecting to login");
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const allowedRoles = role
    ? (Array.isArray(role) ? role : [role]).map(r => String(r).toLowerCase())
    : [];

  const userRole = String(user?.role || "").toLowerCase();

  if (allowedRoles.length && userRole) {
    const ok = allowedRoles.includes(userRole);
    if (!ok) {
      if (userRole === "owner") {
        return <Navigate to="/owner" replace />;
      }
      if (userRole === "admin") {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  // ✅ Token present & role allowed
  return children;
}
