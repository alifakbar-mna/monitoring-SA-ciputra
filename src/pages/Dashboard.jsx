import React, { useEffect, useMemo } from "react";
import { supabase } from "../supabase";

export default function Dashboard({ setCurrentPage, currentUser, activities = [], onUpdateActivity }) {

  // 1. 🌟 REAL-TIME LISTENER: Dengarkan perubahan tabel 'activities' dari Supabase
  useEffect(() => {
    const channel = supabase
      .channel("public:activities-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        (payload) => {
          console.log("Realtime Dashboard: Ada perubahan data di database!", payload);
          // Pemicu fungsi fetch global di App.jsx agar state data activities ter-update
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

  // 2. LOGIKA PEMBAGIAN KOLOM (BOARD) MENGGUNAKAN DATA DARI PROPS
  // Memisahkan aktivitas berdasarkan status is_completed secara real-time
  const todoActivities = useMemo(() => {
    return activities.filter((act) => !act.is_completed && act.staff_name === currentUser?.name);
  }, [activities, currentUser]);

  const doneActivities = useMemo(() => {
    return activities.filter((act) => act.is_completed && act.staff_name === currentUser?.name);
  }, [activities, currentUser]);

  // 3. FUNGSI UNTUK MERUBAH STATUS CHECKLIST (TOGGLE COMPLETE)
  const handleToggleComplete = async (activityId, currentStatus) => {
    const nextStatus = !currentStatus;

    const { error } = await supabase
      .from("activities")
      .update({ is_completed: nextStatus })
      .eq("id", activityId);

    if (!error) {
      console.log("Status berhasil diperbarui di database.");
      // Memicu App.jsx untuk memperbarui data (Opsional jika realtime delay beberapa milidetik)
      if (typeof onUpdateActivity === "function") {
        onUpdateActivity();
      }
    } else {
      console.error("Gagal memperbarui status card:", error.message);
      alert("Gagal memperbarui status. Silakan periksa koneksi Anda.");
    }
  };

  // FORMAT JAM (Contoh: 08:00:00 -> 08.00)
  const formatTime = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return timeStr || "";
    const parts = timeStr.split(":");
    return `${parts[0]}.${parts[1]}`;
  };

  return (
    <div style={{ padding: "30px 40px" }}>
      {/* HEADER DASHBOARD */}
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "26px", fontWeight: 700, margin: 0 }}>Papan Tugas Saya</h2>
        <p style={{ color: "#86868b", fontSize: "14px", margin: "5px 0 0 0" }}>
          Halo <strong>{currentUser?.name}</strong>, berikut adalah ringkasan progres tugas Anda bulan ini.
        </p>
      </div>

      {/* STRUKTUR PAPAN KANBAN / BOARD */}
      <div style={{ display: "flex", gap: "25px", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* KOLOM 1: BELUM SELESAI (TODO) */}
        <div style={{ flex: "1 1 300px", backgroundColor: "#f5f5f7", borderRadius: "12px", padding: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 15px 0", display: "flex", justifyContent: "space-between" }}>
            <span>🕒 Perlu Dikerjakan</span>
            <span style={{ backgroundColor: "#d2d2d7", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" }}>
              {todoActivities.length}
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {todoActivities.length === 0 ? (
              <div style={{ textAlign: "center", color: "#86868b", fontSize: "13px", padding: "20px", fontStyle: "italic" }}>
                Tidak ada tugas tersisa. Bagus!
              </div>
            ) : (
              todoActivities.map((act) => (
                <div key={act.id} style={{ backgroundColor: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", border: "1px solid #e5e5ea" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#0071e3", backgroundColor: "#f2f7ff", padding: "2px 6px", borderRadius: "4px" }}>
                      {formatTime(act.start_time)} - {formatTime(act.end_time)}
                    </span>
                    <button 
                      onClick={() => handleToggleComplete(act.id, act.is_completed)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                      title="Tandai Selesai"
                    >
                      ⬜
                    </button>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 600 }}>{act.title}</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#424245", lineHeight: "1.4" }}>{act.description || "Tidak ada deskripsi."}</p>
                  <div style={{ marginTop: "10px", fontSize: "10px", color: "#86868b", borderTop: "1px solid #f5f5f7", paddingTop: "6px" }}>
                    📅 {act.activity_date}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KOLOM 2: SELESAI (DONE) */}
        <div style={{ flex: "1 1 300px", backgroundColor: "#f5f5f7", borderRadius: "12px", padding: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 15px 0", display: "flex", justifyContent: "space-between" }}>
            <span>✅ Selesai</span>
            <span style={{ backgroundColor: "#34c759", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" }}>
              {doneActivities.length}
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {doneActivities.length === 0 ? (
              <div style={{ textAlign: "center", color: "#86868b", fontSize: "13px", padding: "20px", fontStyle: "italic" }}>
                Belum ada tugas yang diselesaikan.
              </div>
            ) : (
              doneActivities.map((act) => (
                <div key={act.id} style={{ backgroundColor: "#fff", padding: "16px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.01)", border: "1px solid #d2d2d7", opacity: 0.7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#86868b", textDecoration: "line-through" }}>
                      {formatTime(act.start_time)} - {formatTime(act.end_time)}
                    </span>
                    <button 
                      onClick={() => handleToggleComplete(act.id, act.is_completed)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                      title="Kembalikan ke Belum Selesai"
                    >
                      ✅
                    </button>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 600, textDecoration: "line-through", color: "#86868b" }}>{act.title}</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#86868b", lineHeight: "1.4", textDecoration: "line-through" }}>{act.description || "Tidak ada deskripsi."}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}