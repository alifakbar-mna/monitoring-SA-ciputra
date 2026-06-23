import React from "react";

export default function MyActivity({ activities, selectedStaff, currentMonth, currentYear, onOpenAddModal }) {
  const filteredActivities = activities
    .filter(act => act.staff_name === selectedStaff)
    .sort((a, b) => {
      if (a.activity_date === b.activity_date) {
        return a.start_time > b.start_time ? 1 : -1;
      }
      return a.activity_date > b.activity_date ? 1 : -1;
    });

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    return `${parts[0]}.${parts[1]}`;
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div style={{ padding: "20px 40px" }}>
      {/* HEADER DENGAN TOMBOL TAMBAH JADWAL BARU */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
            Aktivitas {selectedStaff}
          </h2>
          <p style={{ color: "var(--apple-text-sub)", fontSize: "14px", margin: "5px 0 0 0" }}>
            Menampilkan list tugas personal pada bulan <strong>{monthNames[currentMonth - 1]} {currentYear}</strong>.
          </p>
        </div>

        {/* --- TOMBOL + TAMBAH TUGAS BARU DI MY BOARD --- */}
        <button 
          onClick={onOpenAddModal} 
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "var(--apple-blue, #0071e3)", 
            color: "#fff", 
            border: "none", 
            borderRadius: "20px", 
            fontWeight: 600, 
            fontSize: "14px", 
            cursor: "pointer", 
            boxShadow: "0 4px 12px rgba(0,113,227,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>+</span> Tambah Tugas Baru
        </button>
      </header>

      {filteredActivities.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--apple-text-sub)", backgroundColor: "#fff", borderRadius: "14px" }}>
          Tidak ada data aktivitas khusus untuk {selectedStaff} di bulan ini.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {filteredActivities.map(act => (
            <div key={act.id} className="glass-panel" style={{ padding: "20px", position: "relative", backgroundColor: "#fff", borderRadius: "14px" }}>
              <span style={{
                position: "absolute", top: "20px", right: "20px", fontSize: "11px", fontWeight: 700,
                padding: "4px 8px", borderRadius: "20px", textTransform: "uppercase",
                backgroundColor: act.priority === "urgent" ? "rgba(255,59,48,0.1)" : "rgba(0,0,0,0.05)",
                color: act.priority === "urgent" ? "var(--apple-red)" : "var(--apple-text-sub)"
              }}>
                {act.priority}
              </span>

              <div style={{ fontSize: "12px", color: "var(--apple-green)", fontWeight: 600, marginBottom: "4px" }}>
                🕒 {formatTime(act.start_time)} - {formatTime(act.end_time)}
              </div>

              <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: 600, paddingRight: "60px" }}>
                {act.title}
              </h3>
              
              <p style={{ color: "#424245", fontSize: "14px", lineHeight: "1.4", marginBottom: "20px" }}>
                {act.description || "Tidak ada deskripsi rinci."}
              </p>

              <div style={{ borderTop: "1px solid #e5e5ea", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--apple-text-sub)" }}>
                <div>
                  <strong>Tanggal:</strong> {act.activity_date || "-"}
                </div>
                <div>
                  <strong>Source:</strong> {act.source === "google_calendar" ? "🌐 GCal" : "✏️ Manual"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}