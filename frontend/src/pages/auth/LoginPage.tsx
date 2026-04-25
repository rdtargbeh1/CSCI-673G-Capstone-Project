// src/pages/auth/LoginPage.tsx

import React, { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { apiClient } from "../../shared/lib/apiClient";
import { useAuthStore } from "../../shared/store/authStore";

// ✅ ADD: decode token roles to detect SYSTEM_ADMIN reliably
import { getSystemAdminFromToken } from "../../shared/lib/jwtRole";

type LoginResponse = {
  accessToken: string;
  expiresIn: number;
  defaultOrgId: string | null;
  defaultOrgName?: string | null;
  defaultOrgType?: string | null;
  isSystemAdmin?: boolean;
};

function shouldShowAdminFooter(msg: string) {
  const m = (msg || "").toLowerCase();
  if (
    m.includes("contact") &&
    (m.includes("administrator") || m.includes("admin"))
  )
    return false;
  if (m.includes("deactivated") || m.includes("disabled")) return false;
  return true;
}

const LoginPage: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem("rememberUser") === "true"
  );

  // ✅ use setAuth so the store has a user (fixes blank role for system admin)
  const setAuth = useAuthStore((s) => s.setAuth);

  const setCurrentOrg = useAuthStore((s) => s.setCurrentOrg);
  const setDashboardMode = useAuthStore((s) => s.setDashboardMode);
  const setTenantMeta = useAuthStore((s) => s.setTenantMeta);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const navigate = useNavigate();

  useEffect(() => {
    if (rememberMe) {
      const savedUser = localStorage.getItem("rememberedUserName");
      if (savedUser) setUserName(savedUser);
    }
  }, [rememberMe]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const res = await apiClient.post<LoginResponse>("/auth/login", {
        userName,
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      // remember username
      if (rememberMe) {
        localStorage.setItem("rememberUser", "true");
        localStorage.setItem("rememberedUserName", userName);
      } else {
        localStorage.removeItem("rememberUser");
        localStorage.removeItem("rememberedUserName");
      }

      // ✅ derive system admin from JWT (roles: ROLE_SYSTEM_ADMIN, etc.)
      const parsed = getSystemAdminFromToken(data.accessToken);

      // ✅ MUST populate store.user (otherwise Role stays blank)
      setAuth({
        token: data.accessToken,
        user: {
          userId: parsed.userId,
          userName: parsed.userName || userName,

          firstName: "",
          lastName: "",
          email: "",
          position: "",

          isSystemAdmin: parsed.isSystemAdmin || data.isSystemAdmin === true,
          globalRoleName:
            parsed.isSystemAdmin || data.isSystemAdmin === true
              ? "SYSTEM_ADMIN"
              : null,

          orgMemberships: [],
        },
      });

      // ✅ SYSTEM admin: no org required
      if (!data.defaultOrgId || parsed.isSystemAdmin || data.isSystemAdmin) {
        setCurrentOrg(null);
        setTenantMeta(null);
        setDashboardMode("SYSTEM");
        navigate("/dashboard/system", { replace: true });
        return;
      }

      // ✅ tenant path
      setCurrentOrg(data.defaultOrgId);
      const orgType = String(data.defaultOrgType ?? "").toUpperCase();
      setDashboardMode(orgType === "NEC" ? "NEC" : "TENANT");
      setTenantMeta({
        orgId: data.defaultOrgId,
        orgName: data.defaultOrgName ?? "—",
        orgType: data.defaultOrgType ?? null,
      });

      navigate("/dashboard", { replace: true });
    },
    onError: (error: unknown) => {
      clearAuth();
      if (axios.isAxiosError(error)) {
        const msg =
          (error.response?.data as any)?.message ||
          error.response?.data ||
          error.message ||
          "Login failed. Please try again.";
        setErrorMessage(msg);
      } else {
        setErrorMessage("Unexpected error occurred. Please try again.");
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-500 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Sign in to your Election Management System
        </h1>
        <p className="text-xl text-slate-600 mb-7">
          Enter your credentials to continue.
        </p>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-base font-medium text-red-800">{errorMessage}</p>
            {shouldShowAdminFooter(errorMessage) && (
              <p className="mt-1 text-sm text-red-700">
                Please contact your organization administrator.
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-sm flex-col items-center space-y-5"
        >
          <div className="w-full">
            <label className="block text-lg font-medium text-slate-700 mb-1 text-center">
              Username (or Email)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg text-xl text-center
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter username or email"
              required
            />
          </div>

          <div className="w-full">
            <label className="block text-lg font-medium text-slate-700 mb-1 text-center">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border text-xl rounded-lg text-center pr-14
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-4 text-base font-medium text-slate-500 hover:text-slate-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-base text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Remember username
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg
                       text-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
