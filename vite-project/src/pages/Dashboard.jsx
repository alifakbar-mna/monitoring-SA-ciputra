import React from "react";

export default function Dashboard({ setCurrentPage }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "75vh", padding: "0 20px", textAlign: "center"
    }}>
      <h1 style={{
        fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-1.5px",
        marginBottom: "10px", color: "var(--apple-text-main)"
      }}>
        Monitoring SA Activity
      </h1>
      <p style={{ color: "var(--apple-text-sub)", fontSize: "18px", marginBottom: "40px", maxWidth: "500px" }}>
        Sistem manajemen performa dan pelacakan aktivitas Student Assistant secara berkala.
      </p>

      {/* Grid Tombol Utama */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <button 
          onClick={() => setCurrentPage("all_activity")}
          className="glass-panel"
          style={{
            padding: "20px 40px", fontSize: "16px", fontWeight: 600, border: "none",
            backgroundColor: "var(--apple-text-main)", color: "#fff", cursor: "pointer",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
          }}
        >
          Lihat Semua Kerja SA (Matrix)
        </button>

        <button 
          onClick={() => setCurrentPage("my_activity")}
          className="glass-panel"
          style={{
            padding: "20px 40px", fontSize: "16px", fontWeight: 600, border: "none",
            backgroundColor: "#fff", color: "var(--apple-blue)", cursor: "pointer",
          }}
        >
          Lihat Aktivitas Saya
        </button>
      </div>
    </div>
  );
}