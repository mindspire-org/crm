import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    } catch {}
    window.location.replace("/auth");
  }, []);
  return null;
}
