import { useEffect, useState } from "react";

export interface Session {
  user_id?: string;
  name?: string;
  email?: string;
  role?: string;
  theme?: string;
  sidebar?: boolean;
}

export default function useSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        document.cookie = `poligon_info=${JSON.stringify(data)}; path=/`;
      })
      .catch(() => {
        setSession(null);
        document.cookie = "poligon_info=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      });
  }, []);

  return session;
}
