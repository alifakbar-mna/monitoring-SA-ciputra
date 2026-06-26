import React, { useEffect } from "react";
import { supabase } from "../supabase"; // Sesuaikan path jika berbeda

// 1. Tambahkan props currentUser, activities, dan onUpdateActivity ke parameter fungsi
export default function Dashboard({ 
  setCurrentPage, 
  currentUser, 
  activities = [], 
  onUpdateActivity 
}) {

  // 2. 🌟 REAL-TIME LISTENER: Memantau database Supabase langsung dari Dashboard
  useEffect(() => {
    const channel = supabase
      .channel("public:dashboard-landing-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        (payload) => {
          console.log("Realtime Landing Dashboard: Ada perubahan data!", payload);
          // Picu fungsi penarik data ulang yang ada di App.jsx
          if (typeof onUpdateActivity === "function") {
            onUpdateActivity();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdateActivity]);

  // 3. Menghitung ringkasan tugas milik staf yang sedang login secara real-time
  const myTotalTasks = activities.filter(
    (act) => act.staff_name?.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim()
  ).length;

  const myPendingTasks = activities.filter(
    (act) => !act.is_completed && act.staff_name?.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim()
  ).length;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "75vh", padding: "0 20px", textAlign: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <h1 style={{
        fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-1.5px",
        marginBottom: "10px", color: "var(--apple-text-main)"
      }}>
        Monitoring SA Activity
      </h1>
      <p style={{ color: "var(--apple-text-sub)", fontSize: "17px", marginBottom: "30px", maxWidth: "600px", lineHeight: "1.5" }}>
        Sistem manajemen aktivitas dan pendampingan <strong>Organisasi Mahasiswa (Ormawa)</strong> Universitas Ciputra Surabaya oleh divisi Student Affairs.
      </p>

      {/* 🌟 BARU: Widget Ringkasan Aktivitas Real-time Pendek */}
      {currentUser && (
        <div style={{ 
          backgroundColor: "#f5f5f7", padding: "12px 25px", borderRadius: "20px", 
          marginBottom: "40px", fontSize: "14px", color: "var(--apple-text-main)",
          border: "1px solid #e5e5ea", display: "flex", gap: "15px"
        }}>
          <span>Halo, <strong>{currentUser.name}</strong></span>
          <span>•</span>
          <span>Total Tugasmu: <strong>{myTotalTasks}</strong></span>
          <span>•</span>
          <span>Belum Selesai: <strong style={{ color: myPendingTasks > 0 ? "#ff3b30" : "#34c759" }}>{myPendingTasks}</strong></span>
        </div>
      )}

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