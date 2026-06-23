import React, { useState } from "react";

export default function AddActivityModal({ isOpen, onClose, selectedStaff, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("08:00"); // Default jam mulai
  const [endTime, setEndTime] = useState("09:30");   // Default jam selesai
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("normal");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return alert("Judul aktivitas wajib diisi!");
    if (!startTime || !endTime) return alert("Jam mulai dan selesai wajib diisi!");

    onSave({
      staff_name: selectedStaff,
      title,
      description,
      activity_date: date,
      start_time: startTime,
      end_time: endTime,
      deadline: deadline || null,
      priority,
      status: "not_started"
    });
    setTitle("");
    setDescription("");
    setStartTime("08:00");
    setEndTime("09:30");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: "100%", maxWidth: "450px", backgroundColor: "#fff", padding: "30px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)", margin: "20px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Aktivitas Baru: {selectedStaff}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "var(--apple-text-sub)" }}>Tutup</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>JUDUL AKTIVITAS</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Rekap Absensi Kuliah" style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>DESKRIPSI</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detail pengerjaan..." style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px", minHeight: "60px", fontFamily: "inherit" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>TANGGAL PELAKSANAAN</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} />
          </div>

          {/* INPUT BARU: JAM MULAI & SELESAI */}
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>JAM MULAI</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>JAM SELESAI</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>DEADLINE</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--apple-text-sub)" }}>SKALA PRIORITAS</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }}>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "var(--apple-text-main)", color: "#fff", fontWeight: 600, fontSize: "14px", marginTop: "10px", cursor: "pointer" }}>
            Simpan ke Jadwal
          </button>
        </form>
      </div>
    </div>
  );
}