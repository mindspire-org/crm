import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export type AdminLoginResponse = { token: string; user: { id: string; email: string; role: string } };

export type TeamLoginResponse = { token: string; user: { id: string; email: string; role: string; name?: string } };

export type ClientLoginResponse = { token: string; user: { id: string; email: string; role: string; name?: string }; client?: any };

export async function adminLogin(
  identifier: string,
  secret: string,
  mode: "password" | "pin" = "password",
): Promise<AdminLoginResponse> {
  const post = (path: string) =>
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "pin" ? { identifier, pin: secret } : { identifier, password: secret }),
    });

  let res = await post(`/api/auth/admin/login`);
  if (res.status === 404) {
    // Fallback alias for some environments
    res = await post(`/api/auth/admin/login1`);
  }
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as AdminLoginResponse;
}

export async function teamLogin(
  identifier: string,
  secret: string,
  mode: "password" | "pin" = "password",
): Promise<TeamLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/team/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mode === "pin" ? { identifier, pin: secret } : { identifier, password: secret }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as TeamLoginResponse;
}

export async function clientLogin(identifier: string, secret: string, mode: "password" | "pin" = "password"): Promise<ClientLoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/client/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mode === "pin" ? { identifier, pin: secret } : { identifier, password: secret }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(e?.error || "Login failed");
  }
  return (await res.json()) as ClientLoginResponse;
}

export async function emailAvailable(email: string): Promise<boolean> {
  const url = `${API_BASE}/api/auth/email-available?email=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const d = await res.json().catch(()=>({ available: false }));
  return !!d?.available;
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean } | void> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Failed to send reset link" }));
    throw new Error(e?.error || "Failed to send reset link");
  }
  return await res.json().catch(() => ({ ok: true }));
}

export async function resetPassword(payload: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: "Reset failed" }));
    throw new Error(e?.error || "Reset failed");
  }
  return await res.json();
}

// PIN Management Services
export interface PinStatus {
  hasPin: boolean;
  hasPassword: boolean;
  canSetPin: boolean;
}

export async function getPinStatus(): Promise<PinStatus> {
  const res = await fetch(`${API_BASE}/api/auth/pin/status`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to get PIN status" }));
    throw new Error(e?.error || "Failed to get PIN status");
  }
  return await res.json();
}

export async function setPin(currentPassword: string, newPin: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/pin/set`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword, newPin })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to set PIN" }));
    throw new Error(e?.error || "Failed to set PIN");
  }
  return await res.json();
}

export async function changePin(currentPin: string, newPin: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/pin/change`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPin, newPin })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to change PIN" }));
    throw new Error(e?.error || "Failed to change PIN");
  }
  return await res.json();
}

export async function removePin(currentPassword: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/pin/remove`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to remove PIN" }));
    throw new Error(e?.error || "Failed to remove PIN");
  }
  return await res.json();
}

// Admin PIN Management Services
export async function adminSetPin(userId: string, newPin: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/admin/pin/set`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ userId, newPin })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to set PIN for user" }));
    throw new Error(e?.error || "Failed to set PIN for user");
  }
  return await res.json();
}

export async function adminRemovePin(userId: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/admin/pin/remove`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Failed to remove PIN for user" }));
    throw new Error(e?.error || "Failed to remove PIN for user");
  }
  return await res.json();
}

export async function clientRegister(payload: {
  type?: "org" | "person";
  companyName?: string;
  clientName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
  industry?: string;
  autoLogin?: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/auth/client/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({ error: "Signup failed" }));
    throw new Error(e?.error || "Signup failed");
  }
  return res.json();
}
