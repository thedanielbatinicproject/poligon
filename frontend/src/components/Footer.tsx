import React from "react";

const Footer: React.FC = () => (
  <footer style={{ padding: "1rem", background: "#e3eaf2", borderTop: "1px solid #cfd8dc", textAlign: "center" }}>
    <small>&copy; {new Date().getFullYear()} Poligon. All rights reserved.</small>
  </footer>
);

export default Footer;
