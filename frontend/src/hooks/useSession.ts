import { useState, useEffect } from "react";

export type Role = "visitor" | "student" | "mentor" | "admin";

export interface SessionInfo {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: Role;
  theme?: string;
  sidebar_state?: string;
}

function setInfoCookie(data: SessionInfo) {
  document.cookie = `poligon_info=${encodeURIComponent(JSON.stringify(data))}; path=/;`;
}

function clearInfoCookie() {
  document.cookie = "poligon_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

export function useSession() {
  const [session, setSession] = useState<SessionInfo>({});
  const [role, setRole] = useState<Role>("visitor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/status", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.user && data.session) {
          const info: SessionInfo = {
            user_id: data.user.user_id,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            email: data.user.email,
            role: data.user.role,
            theme: data.session.theme,
            sidebar_state: data.session.sidebar_state
          };
          setInfoCookie(info);
          setSession(info);
          setRole(data.user.role);
        } else {
          clearInfoCookie();
          setSession({});
          setRole("visitor");
        }
        setLoading(false);
      })
      .catch(() => {
        clearInfoCookie();
        setSession({});
        setRole("visitor");
        setLoading(false);
      });
  }, []);

  return { session, role, loading };
}