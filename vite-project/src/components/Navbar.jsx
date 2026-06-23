import React from "react";

export default function Navbar({ 
  currentPage, setCurrentPage, currentUser, onLogout 
}) {
  return (
    <nav className="glass-panel" style={{ position: "sticky", top: 15, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 30px", margin: "15px 20px" }}>
      <div onClick={() => setCurrentPage("dashboard")} style={{ fontSize: "18px", fontWeight: 600, cursor: "pointer" }}>
         Monitoring SA
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
        <span onClick={() => setCurrentPage("all_activity")} style={{ cursor: "pointer", fontSize: "14px", color: currentPage === "all_activity" ? "var(--apple-blue)" : "var(--apple-text-sub)" }}>All Matrix</span>
        <span onClick={() => setCurrentPage("my_activity")} style={{ cursor: "pointer", fontSize: "14px", color: currentPage === "my_activity" ? "var(--apple-blue)" : "var(--apple-text-sub)" }}>My Board</span>
        
        {/* Render Link Admin khusus jika role bernilai 'admin' */}
        {currentUser?.role === "admin" && (
          <span onClick={() => setCurrentPage("admin_panel")} style={{ cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: currentPage === "admin_panel" ? "var(--apple-blue)" : "var(--apple-red)" }}>
            ⚙ Admin Panel
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", borderLeft: "1px solid #d2d2d7", paddingLeft: "15px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{currentUser?.name}</span>
          <button onClick={onLogout} style={{ padding: "4px 10px", backgroundColor: "#ff3b30", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
            Keluar
          </button>
        </div>
      </div>
    </nav>
  );
}