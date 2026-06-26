import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabase";

export default function AllActivity({ activities, staffList, onUpdateActivity, currentMonth, currentYear }) {
  const [detailModal, setDetailModal] = useState({ isOpen: false, staffName: "", dateRaw: "", data: [] });
  const [dbStaffInfo, setDbStaffInfo] = useState([]); 
  const [visibleStaff, setVisibleStaff] = useState([]); 
  const [filterCampus, setFilterCampus] = useState("Semua");

  // STATE FILTER TANGGAL BARU
  const [dateFilterType, setDateFilterType] = useState("Semua"); // "Semua" | "Hari Ini" | "Kustom"
  const [customStartDate, setCustomStartDate] = useState("");

  const loadStaffDetails = async () => {
    const { data } = await supabase.from("staff").select("name, color, campus");
    if (data) {
      setDbStaffInfo(data);
      if (visibleStaff.length === 0) {
        setVisibleStaff(data.map(s => s.name));
      }
    }
  };

  useEffect(() => {
    loadStaffDetails();
  }, [staffList]);

  const staffColorMap = useMemo(() => {
    const map = {};
    dbStaffInfo.forEach(s => { map[s.name] = s.color; });
    return map;
  }, [dbStaffInfo]);

  const staffCampusMap = useMemo(() => {
    const map = {};
    dbStaffInfo.forEach(s => { map[s.name] = s.campus || "Surabaya"; });
    return map;
  }, [dbStaffInfo]);

  const allowedStaffByCampus = useMemo(() => {
    return dbStaffInfo.filter(s => {
      if (filterCampus === "Semua") return true;
      return (s.campus || "Surabaya") === filterCampus;
    });
  }, [dbStaffInfo, filterCampus]);

  useEffect(() => {
    if (filterCampus === "Semua") {
      setVisibleStaff(dbStaffInfo.map(s => s.name));
    } else {
      setVisibleStaff(dbStaffInfo.filter(s => (s.campus || "Surabaya") === filterCampus).map(s => s.name));
    }
  }, [filterCampus, dbStaffInfo]);

  // LOGIKA RESPONSIVE DATE RANGE BERDASARKAN FILTER BARU
  const dateRange = useMemo(() => {
    const days = [];
    const validYear = parseInt(currentYear) || new Date().getFullYear();
    const validMonth = parseInt(currentMonth) ? parseInt(currentMonth) - 1 : new Date().getMonth();
    
    // Cari batas total hari dalam bulan berjalan
    const totalDays = new Date(validYear, validMonth + 1, 0).getDate();

    // Dapatkan tanggal hari ini (waktu lokal) format YYYY-MM-DD
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(validYear, validMonth, i);
      const yyyy = d.getFullYear(); 
      const mm = String(d.getMonth() + 1).padStart(2, '0'); 
      const dd = String(i).padStart(2, '0');
      const rawDateStr = `${yyyy}-${mm}-${dd}`;

      // Kondisi Penyaringan Berdasarkan Tombol/Input Pilihan
      if (dateFilterType === "Hari Ini") {
        if (rawDateStr !== todayStr) continue;
      } else if (dateFilterType === "Kustom" && customStartDate) {
        if (rawDateStr < customStartDate) continue; 
      }

      days.push({ 
        raw: rawDateStr, 
        label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) 
      });
    }
    return days;
  }, [currentMonth, currentYear, dateFilterType, customStartDate]);

  const formatTime = (timeStr) => { 
    if (!timeStr) return ""; 
    const parts = timeStr.split(":"); 
    return `${parts[0]}.${parts[1]}`; 
  };

  const handleStaffChecklistChange = (name) => {
    if (visibleStaff.includes(name)) {
      setVisibleStaff(prev => prev.filter(item => item !== name));
    } else {
      setVisibleStaff(prev => [...prev, name]);
    }
  };

  const handleToggleComplete = async (e, activityId, currentStatus) => {
    e.stopPropagation(); 
    const nextStatus = !currentStatus;

    // 1. Langsung tembak pembaruan ke database Supabase
    const { error } = await supabase
      .from("activities")
      .update({ is_completed: nextStatus })
      .eq("id", activityId);

    if (!error) {
      // 2. JIKA BERHASIL: Panggil fungsi dari App.jsx untuk memicu penarikan data baru
      if (onUpdateActivity) {
        onUpdateActivity(); 
      }
    } else {
      console.error("Gagal memperbarui status tugas:", error);
      alert("Koneksi gagal. Gagal memperbarui status ke database.");
    }
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      <style>{`
        .todo-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.2s ease;
        }
        .todo-row:hover {
          background: rgba(0,0,0,0.03);
        }
        .apple-checkbox {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid #d2d2d7;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          opacity: 0; 
          transform: scale(0.8);
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .todo-row:hover .apple-checkbox, .apple-checkbox.checked {
          opacity: 1;
          transform: scale(1);
        }
        .apple-checkbox.checked {
          animation: popCheck 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popCheck {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .filter-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #d2d2d7;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .filter-btn.active {
          background: #0071e3;
          color: #fff;
          border-color: #0071e3;
        }
      `}</style>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>All Activity Matrix</h2>
          <p style={{ color: "#86868b", fontSize: "14px", margin: 0 }}>Arahkan kursor mouse untuk mencentang tugas selesai, atau klik teks untuk detail.</p>
        </div>
      </header>

      {/* PANEL FILTER UTAMA */}
      <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#fff", borderRadius: "12px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        
        {/* ROW 1: WILAYAH KAMPUS & FILTER WAKTU BARU */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          
          {/* Sisi Kiri: Filter Wilayah & Tombol Hari Ini */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>Kampus:</span>
              <select 
                value={filterCampus} 
                onChange={e => setFilterCampus(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
              >
                <option value="Semua">Semua Wilayah</option>
                <option value="Surabaya">Surabaya</option>
                <option value="Makassar">Makassar</option>
                <option value="Jakarta">Jakarta</option>
              </select>
            </div>

            {/* INTEGRASI TOMBOL TIMELINE */}
            <div style={{ display: "flex", gap: "6px", borderLeft: "1px solid #d2d2d7", paddingLeft: "15px" }}>
              <button 
                onClick={() => setDateFilterType("Semua")} 
                className={`filter-btn ${dateFilterType === "Semua" ? "active" : ""}`}
              >
                Semua Hari
              </button>
              <button 
                onClick={() => setDateFilterType("Hari Ini")} 
                className={`filter-btn ${dateFilterType === "Hari Ini" ? "active" : ""}`}
              >
                📅 Hari Ini
              </button>
            </div>

            {/* INPUT PILIHAN TANGGAL S/D AKHIR BULAN */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px", color: "#86868b" }}>Mulai Tgl:</span>
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  if (e.target.value) setDateFilterType("Kustom");
                }}
                style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px", outline: "none" }}
              />
              {dateFilterType === "Kustom" && (
                <span style={{ fontSize: "12px", color: "#0071e3", fontWeight: 500 }}>s/d Akhir Bulan</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setVisibleStaff(allowedStaffByCampus.map(s => s.name))} style={{ background: "none", border: "none", color: "#0071e3", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Pilih Semua</button>
            <button onClick={() => setVisibleStaff([])} style={{ background: "none", border: "none", color: "#ff3b30", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Bersihkan</button>
          </div>
        </div>

        {/* ROW 2: CHECKLIST STAFF ROW */}
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", borderTop: "1px solid #f5f5f7", paddingTop: "12px" }}>
          {allowedStaffByCampus.map(s => (
            <label key={s.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              <input type="checkbox" checked={visibleStaff.includes(s.name)} onChange={() => handleStaffChecklistChange(s.name)} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: s.color, display: "inline-block" }}></span>
              {s.name}
              <span style={{ fontSize: "10px", color: "#86868b", fontStyle: "italic" }}>({s.campus || "Surabaya"})</span>
            </label>
          ))}
          {allowedStaffByCampus.length === 0 && (
            <span style={{ fontSize: "13px", color: "#86868b" }}>Tidak ada staf di wilayah ini.</span>
          )}
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="glass-panel" style={{ overflowX: "auto", padding: "10px", backgroundColor: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "12px", minWidth: "1100px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "12px", color: "#86868b", fontSize: "13px", width: "150px" }}>STAFF NAME</th>
              {dateRange.map(day => (
                <th key={day.raw} style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.03)", borderRadius: "10px", minWidth: "200px" }}>{day.label}</th>
              ))}
              {dateRange.length === 0 && (
                <th style={{ textAlign: "center", padding: "20px", color: "#86868b" }}>Tidak ada tanggal yang cocok dengan filter.</th>
              )}
            </tr>
          </thead>
          <tbody>
            {staffList
              .filter(staff => visibleStaff.includes(staff)) 
              .map(staff => (
                <tr key={staff}>
                  <td style={{ fontWeight: 600, padding: "15px 12px" }}>
                    {staff}
                    <div style={{ fontSize: "11px", color: "#86868b", fontWeight: 400, fontStyle: "italic", marginTop: "2px" }}>
                      {staffCampusMap[staff]}
                    </div>
                  </td>
                  {dateRange.map(day => {
                    const dayActivities = activities
                      .filter(a => a.staff_name === staff && a.activity_date === day.raw)
                      .sort((a, b) => (a.start_time > b.start_time ? 1 : -1));
                    const hasJob = dayActivities.length > 0;
                    const currentStaffColor = staffColorMap[staff] || "#0071e3";

                    return (
                      <td key={day.raw} style={{ verticalAlign: "top" }}>
                        <div 
                          className="glass-panel" 
                          onClick={() => {
                            if (hasJob) {
                              setDetailModal({ isOpen: true, staffName: staff, dateRaw: day.raw, data: dayActivities });
                            }
                          }}
                          style={{ 
                            padding: "12px 8px", 
                            borderRadius: "14px", 
                            minHeight: "85px", 
                            backgroundColor: hasJob ? `${currentStaffColor}08` : "#fff", 
                            border: hasJob ? `1.5px solid ${currentStaffColor}40` : "1px dashed #e5e5ea",
                            cursor: hasJob ? "pointer" : "default",
                            transition: "all 0.2s ease"
                          }}
                        >
                          {hasJob ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
                              {dayActivities.map(act => (
                                <div key={act.id} className="todo-row">
                                  
                                  <div 
                                    className={`apple-checkbox ${act.is_completed ? "checked" : ""}`}
                                    onClick={(e) => handleToggleComplete(e, act.id, act.is_completed)}
                                    style={{ 
                                      borderColor: act.is_completed ? "#34c759" : currentStaffColor,
                                      backgroundColor: act.is_completed ? "#34c759" : "transparent"
                                    }}
                                  >
                                    {act.is_completed && <span style={{ color: "#fff", fontSize: "9px", fontWeight: "bold" }}>✓</span>}
                                  </div>

                                  <div style={{ 
                                    color: act.is_completed ? "#86868b" : "#1d1d1f", 
                                    textDecoration: act.is_completed ? "line-through" : "none",
                                    whiteSpace: "nowrap", 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis",
                                    fontSize: "12px",
                                    opacity: act.is_completed ? 0.55 : 1,
                                    transition: "all 0.2s ease"
                                  }}>
                                    <span style={{ color: act.is_completed ? "#86868b" : currentStaffColor, fontWeight: 700 }}>
                                      ({formatTime(act.start_time)} - {formatTime(act.end_time)}){" "}
                                    </span>
                                    {act.title}
                                  </div>

                                </div>
                              ))}
                            </div>
                          ) : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DETAIL */}
      {detailModal.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="glass-panel" style={{ backgroundColor: "#fff", width: "100%", maxWidth: "550px", padding: "30px", maxHeight: "80vh", overflowY: "auto", borderRadius: "16px", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Aktivitas {detailModal.staffName} ({detailModal.dateRaw})</h3>
              <button onClick={() => setDetailModal(p => ({ ...p, isOpen: false }))} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#86868b" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {detailModal.data.map((job) => (
                <div key={job.id} style={{ padding: "14px", borderRadius: "12px", border: `1.5px solid ${staffColorMap[detailModal.staffName] || '#e5e5ea'}`, backgroundColor: "rgba(0,0,0,0.01)", opacity: job.is_completed ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                    <span style={{ color: staffColorMap[detailModal.staffName] || "#34c759", fontSize: "13px", fontWeight: 700, textDecoration: job.is_completed ? "line-through" : "none" }}>
                      ⏰ {formatTime(job.start_time)} - {formatTime(job.end_time)} {job.is_completed ? "✓ (Selesai)" : ""}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f5f5f7", color: "#86868b" }}>
                      {job.source === "google_calendar" ? "🌐 Google Calendar" : "✏️ Manual"}
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 600, textDecoration: job.is_completed ? "line-through" : "none" }}>{job.title}</h4>
                  <p style={{ fontSize: "14px", color: "#86868b", margin: 0, lineHeight: "1.4" }}>
                    {job.description || "Tidak ada deskripsi rinci."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}