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
      <p style={{ color: "var(--apple-text-sub)", fontSize: "17px", marginBottom: "40px", maxWidth: "600px", lineHeight: "1.5" }}>
        Sistem manajemen aktivitas dan pendampingan <strong>Organisasi Mahasiswa (Ormawa)</strong> Universitas Ciputra Surabaya oleh divisi Student Affairs.
      </p>

      {/* Grid Tombol Utama */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <button 
          onClick={() => setCurrentPage("all_activity")}
          className="glass-panel"
          style={{
            padding: "20px 40px", fontSize: "16px", fontWeight: 600, border: "none",
            backgroundColor: "var(--apple-text-main)", color: "#fff", cursor: "pointer",
            boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
            borderRadius: "14px",
            transition: "transform 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          Lihat Semua Kerja SA (Matrix)
        </button>

        <button 
          onClick={() => setCurrentPage("my_activity")}
          className="glass-panel"
          style={{
            padding: "20px 40px", fontSize: "16px", fontWeight: 600, border: "1px solid #d2d2d7",
            backgroundColor: "#fff", color: "var(--apple-blue)", cursor: "pointer",
            borderRadius: "14px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.backgroundColor = "#f5f5f7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.backgroundColor = "#fff";
          }}
        >
          Lihat Aktivitas Saya
        </button>
      </div>
    </div>
  );
}