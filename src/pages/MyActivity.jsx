import React, { useState } from "react";
import { supabase } from "../supabase";

export default function MyActivity({ activities, selectedStaff, currentMonth, currentYear, onOpenAddModal, onUpdateActivity }) {
  // State untuk Asisten AI Gemini
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [targetDate, setTargetDate] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // Fungsi Toggle Complete langsung dari komponen Card List jika diperlukan
  const handleToggleCardComplete = async (activityId, currentStatus) => {
    const { error } = await supabase
      .from("activities")
      .update({ is_completed: !currentStatus })
      .eq("id", activityId);

    if (!error && onUpdateActivity) {
      onUpdateActivity();
    }
  };

  // Fungsi untuk mengirim pesan chat ke Serverless Function /api/generate-todo di Vercel
  const handleSendAiMessage = async () => {
    if (!inputMessage) return;
    if (!targetDate) return alert("Pilih tanggal target kegiatan terlebih dahulu di panel AI!");

    const updatedHistory = [...chatHistory, { role: "user", parts: [{ text: inputMessage }] }];
    setChatHistory(updatedHistory);
    const userMessageCopy = inputMessage;
    setInputMessage("");
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/generate-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessageCopy, chatHistory: chatHistory })
      });
      const data = await res.json();

      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: data.text }] }]);

      // Cek apakah balasan Gemini mengandung tag <DATA> (User setuju)
      if (data.text.includes("<DATA>")) {
        const jsonString = data.text.match(/<DATA>([\s\S]*?)<\/DATA>/)[1].trim();
        const todoItems = JSON.parse(jsonString);

        // Map data agar sesuai skema tabel 'activities' Supabase yang sudah di-update
        const insertData = todoItems.map(item => ({
          staff_name: selectedStaff,
          title: item.title,
          activity_date: targetDate,
          start_time: item.start_time || "08:00",
          end_time: item.end_time || "09:00",
          priority: item.priority || "normal",                // Menangkap prioritas otomatis dari Gemini
          is_completed: item.is_completed ?? false,          // Menangkap status completion default dari Gemini
          source: "manual",
          description: item.description || "Dibuat otomatis oleh Asisten Gemini AI." // Deskripsi detail dari Gemini
        }));

        const { error } = await supabase.from("activities").insert(insertData);
        if (!error) {
          alert(`🎉 Sukses! ${todoItems.length} To-Do List berhasil disimpan ke database.`);
          setChatHistory([]); // Reset obrolan setelah sukses dimasukkan
          if (onUpdateActivity) onUpdateActivity(); // Trigger fetch ulang data agar langsung muncul di sisi kanan
        } else {
          console.error("Gagal menyimpan ke Supabase:", error);
        }
      }
    } catch (err) {
      console.error("Gagal terhubung dengan API Gemini:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      {/* HEADER UTAMA */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
            Aktivitas {selectedStaff}
          </h2>
          <p style={{ color: "var(--apple-text-sub)", fontSize: "14px", margin: "5px 0 0 0" }}>
            Menampilkan list tugas personal pada bulan <strong>{monthNames[currentMonth - 1]} {currentYear}</strong>.
          </p>
        </div>

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

      {/* TAMPILAN DUA KOLOM: KIRI ASSISTANT AI, KANAN TUGAS AKTIVITAS */}
      <div style={{ display: "flex", gap: "30px", alignItems: "flex-start", flexWrap: "wrap" }}>
        
        {/* KOLOM KIRI: JALUR INTERAKSI GEMINI CHATAGENT */}
        <div className="glass-panel" style={{ flex: "1 1 350px", backgroundColor: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: 700 }}>🪄 Gemini To-Do Asisten</h3>
          <p style={{ fontSize: "12px", color: "var(--apple-text-sub)", margin: "0 0 15px 0" }}>Ketik instruksi kegiatan, konfirmasi drafnya, lalu ketik "Setuju" untuk menyimpan.</p>
          
          {/* Input Tanggal Penempatan */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "15px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-main)" }}>Target Tanggal Tugas:</label>
            <input 
              type="date" 
              value={targetDate} 
              onChange={e => setTargetDate(e.target.value)} 
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px" }}
            />
          </div>

          {/* Chat History Box */}
          <div style={{ height: "260px", overflowY: "auto", border: "1px solid #f5f5f7", borderRadius: "10px", backgroundColor: "#f5f5f7", padding: "12px", marginBottom: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {chatHistory.length === 0 && (
              <div style={{ color: "#86868b", fontSize: "13px", textAlign: "center", marginTop: "100px", fontStyle: "italic" }}>
                "Buatkan draf to-do list untuk agenda kordinasi SA besok pagi..."
              </div>
            )}
            {chatHistory.map((chat, idx) => (
              <div key={idx} style={{ textAlign: chat.role === "user" ? "right" : "left" }}>
                <div style={{ 
                  display: "inline-block", 
                  padding: "10px 14px", 
                  borderRadius: "14px", 
                  fontSize: "13px",
                  lineHeight: "1.4",
                  maxWidth: "85%", 
                  whiteSpace: "pre-line",
                  backgroundColor: chat.role === "user" ? "#0071e3" : "#e5e5ea", 
                  color: chat.role === "user" ? "#fff" : "#000" 
                }}>
                  {chat.parts[0].text.replace(/<DATA>[\s\S]*?<\/DATA>/g, "").trim()}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div style={{ textAlign: "left", color: "#86868b", fontSize: "12px", fontStyle: "italic" }}>🤖 Gemini sedang menyusun tugas...</div>
            )}
          </div>

          {/* Kotak Input Chat */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSendAiMessage(); }}
              placeholder="Tulis instruksi / ketik 'Setuju'..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "13px" }}
            />
            <button 
              onClick={handleSendAiMessage}
              style={{ padding: "10px 16px", backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Kirim
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: CARD LIST AKTIVITAS USER */}
        <div style={{ flex: "2 1 500px" }}>
          {filteredActivities.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--apple-text-sub)", backgroundColor: "#fff", borderRadius: "14px" }}>
              Tidak ada data aktivitas khusus untuk {selectedStaff} di bulan ini.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              {filteredActivities.map(act => (
                <div 
                  key={act.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: "20px", 
                    position: "relative", 
                    backgroundColor: "#fff", 
                    borderRadius: "14px", 
                    boxShadow: "0 4px 12px rgba(0,0,0,0.01)",
                    border: act.is_completed ? "1px solid #d2d2d7" : "1px solid transparent",
                    opacity: act.is_completed ? 0.65 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* Badge Priority */}
                  <span style={{
                    position: "absolute", top: "20px", right: "20px", fontSize: "11px", fontWeight: 700,
                    padding: "4px 8px", borderRadius: "20px", textTransform: "uppercase",
                    backgroundColor: act.is_completed ? "#f5f5f7" : (act.priority === "urgent" ? "rgba(255,59,48,0.1)" : "rgba(0,0,0,0.05)"),
                    color: act.is_completed ? "#86868b" : (act.priority === "urgent" ? "var(--apple-red)" : "var(--apple-text-sub)"),
                    textDecoration: act.is_completed ? "line-through" : "none"
                  }}>
                    {act.is_completed ? "Selesai" : (act.priority || "normal")}
                  </span>

                  {/* Waktu Kegiatan */}
                  <div 
                    onClick={() => handleToggleCardComplete(act.id, act.is_completed)}
                    style={{ 
                      fontSize: "12px", 
                      color: act.is_completed ? "#86868b" : "var(--apple-green)", 
                      fontWeight: 600, 
                      marginBottom: "6px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title="Klik untuk mengubah status selesai"
                  >
                    {act.is_completed ? "✅" : "🕒"} {formatTime(act.start_time)} - {formatTime(act.end_time)}
                  </div>

                  {/* Judul Kegiatan */}
                  <h3 style={{ 
                    margin: "0 0 10px 0", 
                    fontSize: "17px", 
                    fontWeight: 600, 
                    paddingRight: "70px",
                    textDecoration: act.is_completed ? "line-through" : "none",
                    color: act.is_completed ? "#86868b" : "var(--apple-text-main)"
                  }}>
                    {act.title}
                  </h3>
                  
                  {/* Deskripsi Detail */}
                  <p style={{ 
                    color: act.is_completed ? "#86868b" : "#424245", 
                    fontSize: "13px", 
                    lineHeight: "1.4", 
                    marginBottom: "20px",
                    textDecoration: act.is_completed ? "line-through" : "none"
                  }}>
                    {act.description || "Tidak ada deskripsi rinci."}
                  </p>

                  {/* Footer Card */}
                  <div style={{ borderTop: "1px solid #e5e5ea", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--apple-text-sub)" }}>
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

      </div>
    </div>
  );
}