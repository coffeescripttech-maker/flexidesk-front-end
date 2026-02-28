// src/services/adminAuth.js
import api from "@/services/api";
import { saveTokens, clearTokens } from "@/services/api";

export const ADMIN_TOKEN_KEY = 'flexidesk_admin_token';
export const ADMIN_REFRESH_TOKEN_KEY = 'flexidesk_admin_refresh_token';
export const CURRENT_KEY = 'flexidesk_current_user_email';

function storeToken(token, refreshToken, remember) {
  if (token) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(ADMIN_TOKEN_KEY, token);
    if (refreshToken) {
      store.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

/**
 * Read the admin token from storage (prefers localStorage, then sessionStorage).
 */
export function getAdminToken() {
  return (
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
    null
  );
}

/**
 * Convenience helper if you need to show who's logged in.
 */
export function getCurrentAdminEmail() {
  return (
    localStorage.getItem(CURRENT_KEY) ||
    sessionStorage.getItem(CURRENT_KEY) ||
    null
  );
}

export async function loginAdmin({ email, password, remember }) {
  const { data } = await api.post("/admin/login", {
    email: String(email || "").trim().toLowerCase(),
    password,
    remember,
  });

  if (!data?.token || !data?.user) {
    throw new Error(data?.error || "Login failed.");
  }

  // Keep a copy client-side for Authorization header (server may also set httpOnly cookie).
  storeToken(data.token, data.refreshToken, remember);

  // Track current email alongside the token in the same storage bucket.
  if (data.user.email) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(CURRENT_KEY, data.user.email);
  }

  return data.user; // { id, email, role, fullName, avatar }
}

export async function getAdminMe() {
  const { data } = await api.get("/admin/me");
  return data?.user; // requires valid token/cookie
}

export async function logoutAdmin() {
  try {
    await api.post("/admin/logout");
  } catch {
    // ignore network errors on logout
  }
  clearTokens();
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(CURRENT_KEY);
  sessionStorage.removeItem(CURRENT_KEY);
}
