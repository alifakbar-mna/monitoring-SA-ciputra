import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabase";

export default function MyActivity({ activities = [], selectedStaff, currentMonth, currentYear, onOpenAddModal, onUpdateActivity, staffList = [] }) {
  // State untuk Asisten AI Gemini
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [targetDate, setTargetDate] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State Fitur Assign To (Menyimpan Teks Email yang Diketik Manual)
  const [assignType, setAssignType] = useState("self"); 
  const [targetStaffEmail, setTargetStaffEmail] = useState(""); // Menyimpan email hasil ketikan user

  // State Referensi Data Staff Langsung dari Tabel Database Staff
  const [dbStaffReferences, setDbStaffReferences] = useState([]);

  // State Manajemen Aksi Edit & Delete Modal
  const [editingActivity, setEditingActivity] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State Filter Tanggal
  const [dateFilterType, setDateFilterType] = useState("Semua"); 
  const [customStartDate, setCustomStartDate] = useState("");

  /**
   * 🔄 AMBIL DATA REFERENSI EMAIL DARI TABEL STAFF SUPABASE
   * Mengambil data asli agar fitur pengetikan email untuk orang lain bisa divalidasi dengan akurat.
   */
  useEffect(() => {
    const fetchRealStaffData = async () => {
      // Tambahkan log untuk memastikan fungsi ini berjalan
      console.log("Memulai fetching data dari tabel 'staff'...");
      
      const { data, error } = await supabase
        .from("staff")
        .select("name, email");
      
      if (error) {
        console.error("❌ ERROR SUPABASE:", error.message);
      }

      if (data) {
        console.log("✅ DATA STAFF DARI DATABASE:", data);
        setDbStaffReferences(data);
      }
    };
    
    fetchRealStaffData();
  }, []);

  /**
   * 🔍 JALUR RESOLUSI EMAIL KE NAMA STAFF (Diri Sendiri):
   * Mengambil nama lengkap staff dari array objek `dbStaffReferences` berdasarkan email di `selectedStaff`.
   */
  const currentStaffName = useMemo(() => {
    if (!selectedStaff) return "";
    
    const cleanedSelected = selectedStaff.trim().toLowerCase();
    const foundStaff = dbStaffReferences.find(
      (s) => s && s.email?.toLowerCase() === cleanedSelected
    );

    if (foundStaff && foundStaff.name) {
      return foundStaff.name;
    }
    
    return selectedStaff.includes("@") ? selectedStaff.split("@")[0] : selectedStaff;
  }, [selectedStaff, dbStaffReferences]);

  /**
   * 🔍 JALUR RESOLUSI EMAIL KE NAMA STAFF (Orang Lain) - SOLUSI FIX AKURAT:
   * Mencari nama lengkap staff tujuan berdasarkan teks `targetStaffEmail` yang diketik manual.
   * COCOK LANGSUNG DENGAN DATA REAL TABEL STAFF SUPABASE.
   */
  const targetStaffName = useMemo(() => {
    const cleanedEmail = targetStaffEmail.trim().toLowerCase();
    if (!cleanedEmail) return null;

    // Mencari kecocokan email langsung dari data baris tabel staff
    const foundStaff = dbStaffReferences.find(
      (s) => s && s.email?.toLowerCase() === cleanedEmail
    );

    // Jika ditemukan, kembalikan nama aslinya dari database staff (Contoh: "Kak Dinda", "Pak Yosia")
    if (foundStaff && foundStaff.name) {
      return foundStaff.name;
    }

    // JIKA TIDAK COCOK kembalikan null agar sistem tahu email ini tidak terdaftar
    return null;
  }, [targetStaffEmail, dbStaffReferences]);


  // LOGIKA PENYARINGAN DATA AKTIVITAS
  const filteredActivities = useMemo(() => {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const safeActivities = Array.isArray(activities) ? activities : [];

    return safeActivities
      .filter(act => {
        const isAssignedToMe = act.staff_name === currentStaffName;
        const isAssignedByMe = act.description && act.description.includes(`Ditugaskan oleh ${currentStaffName}`);

        if (!isAssignedToMe && !isAssignedByMe) {
          return false;
        }
        
        if (dateFilterType === "Hari Ini") {
          return act.activity_date === todayStr;
        } else if (dateFilterType === "Kustom" && customStartDate) {
          return act.activity_date >= customStartDate;
        }
        
        return true; 
      })
      .sort((a, b) => {
        if (a.activity_date === b.activity_date) {
          return (a.start_time || "") > (b.start_time || "") ? 1 : -1;
        }
        return (a.activity_date || "") > (b.activity_date || "") ? 1 : -1;
      });
  }, [activities, currentStaffName, dateFilterType, customStartDate]);

  const formatTime = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return timeStr || "";
    const parts = timeStr.split(":");
    return `${parts[0]}.${parts[1]}`;
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const handleToggleCardComplete = async (activityId, currentStatus) => {
    const { error } = await supabase
      .from("activities")
      .update({ is_completed: !currentStatus })
      .eq("id", activityId);

    if (!error) {
      if (onUpdateActivity) onUpdateActivity(); 
    } else {
      console.error("Gagal merubah status card:", error);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus tugas manual ini?")) {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id);

      if (!error) {
        alert("Tugas manual berhasil dihapus.");
        if (onUpdateActivity) onUpdateActivity();
      } else {
        console.error("Gagal menghapus:", error);
        alert("Gagal menghapus tugas dari database.");
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("activities")
      .update({
        title: editingActivity.title,
        description: editingActivity.description,
        start_time: editingActivity.start_time,
        end_time: editingActivity.end_time,
        activity_date: editingActivity.activity_date
      })
      .eq("id", editingActivity.id);

    if (!error) {
      alert("Perubahan berhasil disimpan.");
      setIsEditModalOpen(false);
      setEditingActivity(null);
      if (onUpdateActivity) onUpdateActivity();
    } else {
      console.error("Gagal memperbarui:", error);
      alert("Gagal memperbarui tugas.");
    }
  };

  // LOGIKA KIRIM TUGAS DENGAN VALIDASI DATABASE KETAT
  const handleSendAiMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!targetDate) return alert("Pilih tanggal target kegiatan terlebih dahulu di panel AI!");

    let finalAssignee = currentStaffName;
    
    if (assignType === "other") {
      const cleanedEmail = targetStaffEmail.trim().toLowerCase();
      if (!cleanedEmail) {
        return alert("Silakan isi alamat email staff tujuan terlebih dahulu!");
      }

      // Validasi ketat: Jika email tidak ditemukan di tabel staff Supabase
      if (!targetStaffName) {
        return alert("❌ Email tidak ditemukan! Alamat email tersebut tidak terdaftar di database staff kami. Silakan periksa kembali.");
      }

      // Jika lolos validasi, gunakan nama resmi hasil lookup database staff (Misal: "Kak Dinda")
      finalAssignee = targetStaffName;
    }

    const updatedHistory = [
      ...chatHistory,
      {
        role: "user",
        parts: [{ text: `[Assignee Target: ${finalAssignee}] ${inputMessage.trim()}` }]
      }
    ];

    setChatHistory(updatedHistory);
    const userMessageCopy = inputMessage.trim();
    setInputMessage("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/generate-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Buatkan to-do list untuk staff bernama: ${finalAssignee}. Detail instruksi: ${userMessageCopy}`,
          chatHistory: updatedHistory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memanggil API Gemini");

      const aiText = data?.text || "";
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: aiText }] }]);

      if (aiText.includes("<DATA>")) {
        const match = aiText.match(/<DATA>([\s\S]*?)<\/DATA>/);
        if (!match?.[1]) throw new Error("Format DATA dari Gemini tidak valid");

        const jsonString = match[1].trim();
        const todoItems = JSON.parse(jsonString);

        const insertData = todoItems.map(item => {
          let baseDesc = item.description || "Dibuat otomatis oleh Asisten Gemini AI.";
          if (finalAssignee !== currentStaffName) {
            baseDesc = `${baseDesc} (Ditugaskan oleh ${currentStaffName})`;
          }

          return {
            staff_name: finalAssignee, // Nama resmi asli (Misal: "Kak Dinda") masuk ke field staff_name tabel activities
            title: item.title || "Tanpa Judul",
            activity_date: targetDate,
            start_time: item.start_time || "08:00",
            end_time: item.end_time || "09:00",
            is_completed: item.is_completed ?? false,
            source: "manual",
            description: baseDesc
          };
        });

        const { error } = await supabase.from("activities").insert(insertData);
        if (error) throw error;

        alert(`🎉 Sukses! ${todoItems.length} To-Do List berhasil disimpan untuk ${finalAssignee}.`);
        setChatHistory([]);
        if (onUpdateActivity) onUpdateActivity();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      <style>{`
        .filter-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid #d2d2d7; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
        .filter-btn.active { background: #0071e3; color: #fff; border-color: #0071e3; }
        
        .text-action-btn { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 6px; transition: all 0.2s ease; }
        .text-action-btn.edit { color: #0071e3; }
        .text-action-btn.edit:hover { background: #f2f7ff; }
        .text-action-btn.delete { color: #ff3b30; }
        .text-action-btn.delete:hover { background: #fff2f2; }

        .edit-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #d2d2d7; margin-bottom: 12px; font-size: 13px; box-sizing: border-box; }
      `}</style>

      {/* HEADER UTAMA */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>Aktivitas {currentStaffName}</h2>
          <p style={{ color: "var(--apple-text-sub)", fontSize: "14px", margin: "5px 0 0 0" }}>
            Menampilkan list tugas personal pada bulan <strong>{monthNames[currentMonth - 1]} {currentYear}</strong>.
          </p>
        </div>
        
        <button 
          onClick={() => {
            if (typeof onOpenAddModal === 'function') {
              onOpenAddModal();
            } else {
              console.error("Props onOpenAddModal tidak terdefinisi atau bukan fungsi!");
              alert("Gagal membuka form: Fungsi penambah belum terhubung dari Parent Component.");
            }
          }} 
          style={{ padding: "10px 20px", backgroundColor: "var(--apple-blue, #0071e3)", color: "#fff", border: "none", borderRadius: "20px", fontWeight: 600, fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,113,227,0.2)", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>+</span> Tambah Tugas Baru
        </button>
      </header>

      {/* TOOLBAR FILTER WAKTU */}
      <div className="glass-panel" style={{ padding: "12px 20px", backgroundColor: "#fff", borderRadius: "12px", marginBottom: "25px", display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setDateFilterType("Semua")} className={`filter-btn ${dateFilterType === "Semua" ? "active" : ""}`}>Semua Hari</button>
          <button onClick={() => setDateFilterType("Hari Ini")} className={`filter-btn ${dateFilterType === "Hari Ini" ? "active" : ""}`}>📅 Hari Ini</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", borderLeft: "1px solid #d2d2d7", paddingLeft: "15px" }}>
          <span style={{ fontSize: "13px", color: "#86868b" }}>Mulai Tgl:</span>
          <input type="date" value={customStartDate} onChange={(e) => { setCustomStartDate(e.target.value); if (e.target.value) setDateFilterType("Kustom"); }} style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px", outline: "none" }} />
          {dateFilterType === "Kustom" && <span style={{ fontSize: "12px", color: "#0071e3", fontWeight: 500 }}>s/d Akhir Bulan</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "30px", alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* PANEL GEMINI ASISTEN */}
        <div className="glass-panel" style={{ flex: "1 1 350px", backgroundColor: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: 700 }}>🪄 Gemini To-Do Asisten</h3>
          <p style={{ fontSize: "12px", color: "var(--apple-text-sub)", margin: "0 0 15px 0" }}>Ketik instruksi kegiatan, konfirmasi drafnya, lalu ketik "Setuju" untuk menyimpan.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-main)" }}>Penugasan Tugas (*Assign To):</label>
            <select value={assignType} onChange={e => { setAssignType(e.target.value); setTargetStaffEmail(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px", backgroundColor: "#fff" }}>
              <option value="self">Diri Sendiri ({currentStaffName})</option>
              <option value="other">Assign ke Orang Lain</option>
            </select>
          </div>

          {/* INPUT EMAIL DENGAN FEEDBACK VISUAL REAL-TIME */}
          {assignType === "other" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#86868b" }}>Email Staff Tujuan:</label>
              <input 
                type="email" 
                placeholder="Silahkan tulis email yg ingin dituju..." 
                value={targetStaffEmail} 
                onChange={e => setTargetStaffEmail(e.target.value)} 
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px", outline: "none" }} 
              />
              
              {/* Logika Deteksi Feedback Visual Langsung dari Database */}
              {targetStaffEmail.trim() && (
                targetStaffName ? (
                  <span style={{ fontSize: "11px", color: "#34c759", fontWeight: "500" }}>
                    ✅ Terdeteksi sebagai: <strong>{targetStaffName}</strong>
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "#ff3b30", fontWeight: "500" }}>
                    ❌ Email tidak terdaftar di database staff!
                  </span>
                )
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "15px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-main)" }}>Target Tanggal Tugas:</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px" }} />
          </div>

          <div style={{ height: "260px", overflowY: "auto", border: "1px solid #f5f5f7", borderRadius: "10px", backgroundColor: "#f5f5f7", padding: "12px", marginBottom: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {chatHistory.length === 0 && <div style={{ color: "#86868b", fontSize: "13px", textAlign: "center", marginTop: "100px", fontStyle: "italic" }}>"Buatkan draf to-do list untuk agenda kordinasi SA besok pagi..."</div>}
            {chatHistory.map((chat, idx) => (
              <div key={idx} style={{ textAlign: chat.role === "user" ? "right" : "left" }}>
                <div style={{ display: "inline-block", padding: "10px 14px", borderRadius: "14px", fontSize: "13px", lineHeight: "1.4", maxWidth: "85%", whiteSpace: "pre-line", backgroundColor: chat.role === "user" ? "#0071e3" : "#e5e5ea", color: chat.role === "user" ? "#fff" : "#000" }}>
                  {chat.parts?.[0]?.text ? chat.parts[0].text.replace(/<DATA>[\s\S]*?<\/DATA>/g, "").trim() : ""}
                </div>
              </div>
            ))}
            {isAiLoading && <div style={{ textAlign: "left", color: "#86868b", fontSize: "12px", fontStyle: "italic" }}>🤖 Gemini sedang menyusun tugas...</div>}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSendAiMessage(); }} placeholder="Tulis instruksi / ketik 'Setuju'..." style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px" }} />
            <button onClick={handleSendAiMessage} style={{ padding: "10px 16px", backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Kirim</button>
          </div>
        </div>

        {/* LIST CARD TUGAS */}
        <div style={{ flex: "2 1 500px" }}>
          {filteredActivities.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--apple-text-sub)", backgroundColor: "#fff", borderRadius: "14px" }}>Tidak ada data aktivitas yang sesuai dengan filter filter tanggal ini.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              {filteredActivities.map(act => (
                <div key={act.id} className="glass-panel" style={{ padding: "20px", position: "relative", backgroundColor: "#fff", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.01)", border: act.is_completed ? "1px solid #d2d2d7" : "1px solid transparent", opacity: act.is_completed ? 0.65 : 1, transition: "all 0.2s ease" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div onClick={() => handleToggleCardComplete(act.id, act.is_completed)} style={{ fontSize: "12px", color: act.is_completed ? "#86868b" : "var(--apple-green)", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }} title="Klik untuk merubah status">
                      {act.is_completed ? "✅" : "🕒"} {formatTime(act.start_time)} - {formatTime(act.end_time)}
                    </div>

                    {act.source === "manual" && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="text-action-btn edit" onClick={() => { setEditingActivity({ ...act }); setIsEditModalOpen(true); }}>Edit</button>
                        <button className="text-action-btn delete" onClick={() => handleDeleteActivity(act.id)}>Hapus</button>
                      </div>
                    )}
                  </div>

                  {/* Label Visual Indikator Delegasi */}
                  {act.staff_name !== currentStaffName && (
                    <div style={{ backgroundColor: "#f2f7ff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", color: "#0071e3", marginBottom: "8px", fontWeight: "600", display: "inline-block" }}>
                      👤 Ditugaskan ke: {act.staff_name}
                    </div>
                  )}

                  <h3 style={{ margin: "0 0 10px 0", fontSize: "17px", fontWeight: 600, textDecoration: act.is_completed ? "line-through" : "none", color: act.is_completed ? "#86868b" : "var(--apple-text-main)" }}>{act.title}</h3>
                  <p style={{ color: act.is_completed ? "#86868b" : "#424245", fontSize: "13px", lineHeight: "1.4", marginBottom: "20px", textDecoration: act.is_completed ? "line-through" : "none" }}>{act.description || "Tidak ada deskripsi rinci."}</p>

                  <div style={{ borderTop: "1px solid #e5e5ea", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--apple-text-sub)" }}>
                    <div><strong>Tanggal:</strong> {act.activity_date || "-"}</div>
                    <div><strong>Source:</strong> {act.source === "google_calendar" ? "🌐 GCal" : "✏️ Manual"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL EDIT DATA TUGAS */}
      {isEditModalOpen && editingActivity && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <form onSubmit={handleSaveEdit} className="glass-panel" style={{ backgroundColor: "#fff", width: "100%", maxWidth: "420px", padding: "25px", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 700 }}>✏️ Edit Tugas Manual</h3>
            
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Judul Kegiatan:</label>
            <input type="text" className="edit-input" value={editingActivity.title} onChange={e => setEditingActivity({...editingActivity, title: e.target.value})} required />

            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Deskripsi:</label>
            <textarea className="edit-input" rows="3" value={editingActivity.description} onChange={e => setEditingActivity({...editingActivity, description: e.target.value})} style={{ resize: "none" }} />

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Jam Mulai:</label>
                <input type="time" className="edit-input" value={editingActivity.start_time} onChange={e => setEditingActivity({...editingActivity, start_time: e.target.value})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Jam Selesai:</label>
                <input type="time" className="edit-input" value={editingActivity.end_time} onChange={e => setEditingActivity({...editingActivity, end_time: e.target.value})} required />
              </div>
            </div>

            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Tanggal Pelaksanaan:</label>
            <input type="date" className="edit-input" value={editingActivity.activity_date} onChange={e => setEditingActivity({...editingActivity, activity_date: e.target.value})} required />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingActivity(null); }} style={{ padding: "8px 16px", background: "#f5f5f7", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Batal</button>
              <button type="submit" style={{ padding: "8px 16px", background: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}