import React, { useEffect } from "react";

interface NotificationProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
}

const colors = {
  success: "#d4edda",
  error: "#f8d7da",
  info: "#e3eaf2"
};

const Notification: React.FC<NotificationProps> = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        background: colors[type],
        color: "#222",
        padding: "0.75rem 1.5rem",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        zIndex: 1000,
        minWidth: "200px"
      }}
    >
      {message}
    </div>
  );
};

export default Notification;
