import React from "react";
import { Link } from "react-router-dom";

const Header: React.FC = () => (
  <header style={{ padding: "1rem", background: "#e3eaf2", borderBottom: "1px solid #cfd8dc" }}>
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <Link to="/" style={{ fontWeight: "bold", fontSize: "1.5rem", color: "#222", textDecoration: "none" }}>
          Poligon
        </Link>
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link to="/documents">Documents</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/messages">Messages</Link>
      </div>
    </nav>
  </header>
);

export default Header;
