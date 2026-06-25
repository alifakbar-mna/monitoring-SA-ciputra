import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";

export default function NotesCalendar() {
  // State Waktu & Kalender
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDateStr, setSelectedDateStr] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  // State Data
  const [notes, setNotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State Form Note Baru
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayNames = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Fetch seluruh data notes untuk bulan yang sedang aktif di kalender
  const fetchNotes = async () => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    // Ambil data dari awal bulan sampai akhir bulan tersebut
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-${new Date(year, currentDate.getMonth() + 1, 0).getDate()}`;

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .gte("note_date", startOfMonth)
        .lte("note_date", endOfMonth)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Gagal mengambil data catatan:", err.message);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [currentDate]);

  // Generasi Grid Tanggal Kalender
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Hari dari bulan sebelumnya (Padding awal)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
      });
    }

    // Hari di bulan aktif berjalan
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // Hari dari bulan berikutnya (Padding akhir ke kelipatan 7 grid)
    const totalStoredCells = cells.length;
    const remainingCells = totalStoredCells % 7 === 0 ? 0 : 7 - (totalStoredCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return cells;
  }, [currentDate]);

  // Memisahkan list judul note berdasarkan dateStr untuk indikator titik kalender
  const notesCountByDate = useMemo(() => {
    const counts = {};
    notes.forEach(note => {
      counts[note.note_date] = (counts[note.note_date] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Filter notes yang tampil di panel kanan berdasarkan hari terpilih
  const activeDayNotes = useMemo(() => {
    return notes.filter(note => note.note_date === selectedDateStr);
  }, [notes, selectedDateStr]);

  // Navigasi Kalender Bulan
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Simpan Catatan Baru ke Supabase
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) return alert("Judul Catatan tidak boleh kosong!");

    setIsSaving(true);
    try {
      const { error } = await supabase.from("notes").insert([{
        title: noteTitle.trim(),
        content: noteContent.trim(),
        note_date: selectedDateStr
      }]);

      if (error) throw error;

      setNoteTitle("");
      setNoteContent("");
      setIsModalOpen(false);
      fetchNotes(); // Refresh data kalender
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan catatan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Format ke readable header text
  const formatFriendlyDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d)} ${monthNames[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ padding: "20px 40px", position: "relative", minHeight: "calc(100vh - 40px)" }}>
      <style>{`
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .day-header { text-align: center; font-size: 13px; font-weight: 600; color: #86868b; padding: 8px 0; }
        .calendar-cell { background: #fff; border-radius: 10px; aspect-ratio: 1.1; padding: 8px; display: flex; flexDirection: column; justifyContent: space-between; cursor: pointer; border: 1px solid #f5f5f7; transition: all 0.15s ease; box-sizing: border-box; }
        .calendar-cell:hover { background: #f2f7ff; border-color: #0071e3; }
        .calendar-cell.active { background: #0071e3 !important; border-color: #0071e3; color: #fff !important; }
        .calendar-cell.inactive { opacity: 0.35; background: #fafafa; }
        
        .floating-fab { position: fixed; bottom: 35px; right: 40px; width: 56px; height: 56px; border-radius: 28px; background: #0071e3; color: #fff; border: none; font-size: 28px; font-weight: bold; cursor: pointer; display: flex; alignItems: center; justifyContent: center; box-shadow: 0 4px 16px rgba(0,113,227,0.35); transition: transform 0.2s; z-index: 999; }
        .floating-fab:hover { transform: scale(1.06); background: #0077ed; }
        
        .note-card { background: #fff; border-radius: 12px; padding: 16px; border-left: 4px solid #0071e3; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 12px; }
        .modal-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #d2d2d7; margin-bottom: 14px; font-size: 14px; box-sizing: border-box; outline: none; }
      `}</style>

      {/* HEADER UTAMA */}
      <header style={{ marginBottom: "25px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>Notes</h2>
        <p style={{ color: "#86868b", fontSize: "14px", margin: "5px 0 0 0" }}>Manajemen matriks dokumen dan catatan berbasis kalender harian.</p>
      </header>

      {/* WORKSPACE UTAMA (SPLIT KALENDER DAN KONTEN) */}
      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* PANEL KALENDER */}
        <div style={{ flex: "1 1 500px", backgroundColor: "#fff", padding: "20px", borderRadius: "14px", boxShaddow: "0 4px 20px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "17px", fontWeight: 700 }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handlePrevMonth} style={{ padding: "6px 12px", border: "1px solid #d2d2d7", background: "#fff", borderRadius: "6px", cursor: "pointer" }}>&lt;</button>
              <button onClick={handleNextMonth} style={{ padding: "6px 12px", border: "1px solid #d2d2d7", background: "#fff", borderRadius: "6px", cursor: "pointer" }}>&gt;</button>
            </div>
          </div>

          <div className="calendar-grid">
            {dayNames.map((d, i) => <div key={i} className="day-header">{d}</div>)}
            
            {calendarCells.map((cell, idx) => {
              const isCellSelected = selectedDateStr === cell.dateStr;
              const hasNotes = notesCountByDate[cell.dateStr] > 0;
              
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`calendar-cell ${cell.isCurrentMonth ? "" : "inactive"} ${isCellSelected ? "active" : ""}`}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{cell.dayNum}</span>
                  
                  {/* Indikator Titik jika ada note di tanggal tersebut */}
                  {hasNotes && (
                    <div style={{ 
                      width: "6px", 
                      height: "6px", 
                      borderRadius: "3px", 
                      backgroundColor: isCellSelected ? "#fff" : "#0071e3", 
                      alignSelf: "center",
                      marginTop: "4px"
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DAFTAR NOTE HARIAN */}
        <div style={{ flex: "1 1 350px", minWidth: "300px" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "18px", fontWeight: 700 }}>
            Agenda: <span style={{ color: "#0071e3" }}>{formatFriendlyDate(selectedDateStr)}</span>
          </h3>

          {activeDayNotes.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#86868b", backgroundColor: "#fff", borderRadius: "14px", border: "1px dashed #d2d2d7", fontSize: "13px" }}>
              📭 Tidak ada catatan untuk hari ini. Tekan tombol (+) di sudut bawah untuk menambahkan.
            </div>
          ) : (
            <div>
              {activeDayNotes.map(note => (
                <div key={note.id} className="note-card">
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 600, color: "#1d1d1f" }}>{note.title}</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#515154", lineHeight: "1.4", whiteSpace: "pre-line" }}>{note.content || "Tanpa deskripsi isi."}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FLOATING ACTION BUTTON */}
      <button className="floating-fab" onClick={() => setIsModalOpen(true)} title="Tambah Catatan Baru">+</button>

      {/* MODAL FORM TAMBAH NOTE */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <form onSubmit={handleSaveNote} style={{ backgroundColor: "#fff", width: "100%", maxWidth: "440px", padding: "25px", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700 }}>📝 Catatan Baru</h3>
            <p style={{ fontSize: "12px", color: "#86868b", margin: "0 0 16px 0" }}>Menambahkan catatan untuk tanggal: <strong>{formatFriendlyDate(selectedDateStr)}</strong></p>
            
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Judul Catatan:</label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Masukkan judul..." 
              value={noteTitle} 
              onChange={e => setNoteTitle(e.target.value)} 
              required 
            />

            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Detail / Isi Catatan:</label>
            <textarea 
              className="modal-input" 
              rows="5" 
              placeholder="Tulis detail catatan Anda disini..." 
              value={noteContent} 
              onChange={e => setNoteContent(e.target.value)} 
              style={{ resize: "none" }} 
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="button" onClick={() => { setIsModalOpen(false); setNoteTitle(""); setNoteContent(""); }} style={{ padding: "8px 16px", background: "#f5f5f7", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }} disabled={isSaving}>Batal</button>
              <button type="submit" style={{ padding: "8px 16px", background: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }} disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}