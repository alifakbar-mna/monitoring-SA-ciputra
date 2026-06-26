import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabase";

export default function NotesCalendar() {
  // State Waktu & Kalender
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDateStr, setSelectedDateStr] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  // State Data Catatan
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null); // Menyimpan note aktif
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State Form Input Note Baru
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // State untuk mengontrol status penyimpanan perubahan edit di modal detail
  const [isUpdating, setIsUpdating] = useState(false);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayNames = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // 1. Fungsi Fetch Data Catatan
  const fetchNotes = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
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
  }, [currentDate]);

  // Jalankan fetch setiap kali bulan/tahun kalender berubah
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // 2. REAL-TIME LISTENER: Otomatis mendengarkan perubahan tabel notes
  useEffect(() => {
    const channel = supabase
      .channel("public:notes-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          console.log("Database Notes berubah!", payload);
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotes]);

  // Generasi Grid Tanggal Kalender
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthTotalDays - i).padStart(2, '0')}`
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

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

  // Pengelompokan baris catatan berdasarkan tanggal
  const notesGroupedByDate = useMemo(() => {
    const groups = {};
    notes.forEach(note => {
      if (!groups[note.note_date]) {
        groups[note.note_date] = [];
      }
      groups[note.note_date].push(note);
    });
    return groups;
  }, [notes]);

  // Filter list catatan untuk panel sebelah kanan
  const activeDayNotes = useMemo(() => {
    return notes.filter(note => note.note_date === selectedDateStr);
  }, [notes, selectedDateStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleNoteTextClick = (e, note) => {
    e.stopPropagation(); 
    setSelectedNote({ ...note }); // Menyalin object agar manipulasi input aman
    setIsDetailModalOpen(true);
  };

  // Simpan data catatan baru ke database
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
      setIsFormModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan catatan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Fungsi Update Perubahan Catatan (Simpan Otomatis / Manual dari Editor)
  const handleUpdateNoteDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedNote || !selectedNote.title.trim()) return alert("Judul catatan tidak boleh kosong!");

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title: selectedNote.title.trim(),
          content: selectedNote.content.trim()
        })
        .eq("id", selectedNote.id);

      if (error) throw error;
      console.log("Perubahan catatan berhasil diperbarui.");
    } catch (err) {
      console.error("Gagal memperbarui catatan:", err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Fungsi Hapus Catatan dengan Double-Check
  const handleDeleteNote = async (id) => {
    if (!id) return;
    
    // Tahap Verifikasi Keamanan Penghapusan
    const firstCheck = window.confirm("Apakah Anda yakin ingin menghapus catatan ini?");
    if (!firstCheck) return;

    const secondCheck = window.confirm("⚠️ PERINGATAN: Catatan yang dihapus tidak dapat dikembalikan. Lanjutkan proses hapus?");
    if (!secondCheck) return;

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setIsDetailModalOpen(false);
      setSelectedNote(null);
      alert("Catatan berhasil dihapus dari database.");
    } catch (err) {
      console.error("Gagal menghapus catatan:", err.message);
      alert("Gagal menghapus catatan.");
    }
  };

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${parseInt(d)} ${monthNames[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div style={{ padding: "20px 40px", position: "relative", minHeight: "calc(100vh - 40px)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .day-header { text-align: center; font-size: 13px; font-weight: 600; color: #86868b; padding: 8px 0; }
        
        .calendar-cell { background: #fff; border-radius: 10px; min-height: 115px; padding: 8px; display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; cursor: pointer; border: 1px solid #f5f5f7; transition: all 0.15s ease; box-sizing: border-box; }
        .calendar-cell:hover { background: #f2f7ff; border-color: #0071e3; }
        .calendar-cell.active { background: #f4f8ff !important; border-color: #0071e3; box-shadow: inset 0 0 0 1px #0071e3; }
        .calendar-cell.inactive { opacity: 0.35; background: #fafafa; }
        
        .calendar-note-link { display: block; width: 100%; text-align: left; background-color: #0071e3; color: #fff; border: none; border-radius: 4px; padding: 3px 6px; margin-top: 4px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; transition: background-color 0.1s; }
        .calendar-note-link:hover { background-color: #005bb5; }

        .floating-fab { position: fixed; bottom: 35px; right: 40px; width: 56px; height: 56px; border-radius: 28px; background: #0071e3; color: #fff; border: none; font-size: 28px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,113,227,0.35); transition: transform 0.2s; z-index: 999; }
        .floating-fab:hover { transform: scale(1.06); background: #0077ed; }
        
        .note-card { background: #fff; border-radius: 12px; padding: 16px; border-left: 4px solid #0071e3; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 12px; cursor: pointer; transition: transform 0.15s; }
        .note-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .modal-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #d2d2d7; margin-bottom: 14px; font-size: 14px; box-sizing: border-box; outline: none; }
        
        /* Gaya Khusus Editor Lebar Modern */
        .editor-title-input { width: 100%; font-size: 24px; font-weight: 700; border: none; outline: none; color: #1d1d1f; margin-bottom: 8px; padding: 4px 0; background: transparent; }
        .editor-textarea { width: 100%; min-height: 320px; border: none; outline: none; resize: none; font-size: 15px; line-height: 1.6; color: #333336; background: transparent; padding: 0; }
        .btn-danger { padding: 8px 16px; background-color: #fff; color: #ff3b30; border: 1px solid #ff3b30; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-danger:hover { background-color: #fff2f2; }
      `}</style>

      {/* HEADER UTAMA */}
      <header style={{ marginBottom: "25px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>Notes</h2>
        <p style={{ color: "#86868b", fontSize: "14px", margin: "5px 0 0 0" }}>Manajemen matriks dokumen dan catatan berbasis kalender harian.</p>
      </header>

      {/* WORKSPACE UTAMA */}
      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* PANEL KALENDER */}
        <div style={{ flex: "2 1 650px", backgroundColor: "#fff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
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
              const cellNotes = notesGroupedByDate[cell.dateStr] || [];
              const isToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` === cell.dateStr;

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`calendar-cell ${cell.isCurrentMonth ? "" : "inactive"} ${isCellSelected ? "active" : ""}`}
                >
                  <span style={{ 
                    fontSize: "14px", 
                    fontWeight: 600,
                    color: isToday ? "#0071e3" : (isCellSelected ? "#1d1d1f" : "inherit"),
                    backgroundColor: isToday ? "#e0f2fe" : "transparent",
                    padding: isToday ? "2px 6px" : "0",
                    borderRadius: "4px",
                    width: "fit-content"
                  }}>
                    {cell.dayNum}
                  </span>
                  
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {cellNotes.map(note => (
                      <button
                        key={note.id}
                        className="calendar-note-link"
                        onClick={(e) => handleNoteTextClick(e, note)}
                        title={note.title}
                      >
                        {note.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DAFTAR NOTE HARIAN (SISI KANAN) */}
        <div style={{ flex: "1 1 320px", minWidth: "300px" }}>
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
                <div key={note.id} className="note-card" onClick={(e) => handleNoteTextClick(e, note)}>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 600, color: "#1d1d1f" }}>{note.title}</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#515154", lineHeight: "1.4", whiteSpace: "pre-line", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {note.content || "Tanpa deskripsi isi."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FLOATING ACTION BUTTON (+) */}
      <button className="floating-fab" onClick={() => setIsFormModalOpen(true)} title="Tambah Catatan Baru">+</button>

      {/* MODAL 1: FORM TAMBAH NOTE BARU */}
      {isFormModalOpen && (
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
              <button type="button" onClick={() => { setIsFormModalOpen(false); setNoteTitle(""); setNoteContent(""); }} style={{ padding: "8px 16px", background: "#f5f5f7", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }} disabled={isSaving}>Batal</button>
              <button type="submit" style={{ padding: "8px 16px", background: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }} disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: INTERAKTIF PANEL EDITOR LEBAR (BACA, EDIT INLINE & HAPUS) */}
      {isDetailModalOpen && selectedNote && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div style={{ backgroundColor: "#ffffff", width: "90%", maxWidth: "800px", padding: "35px", borderRadius: "20px", boxShadow: "0 12px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
            
            {/* Header Informasi Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f5f5f7", paddingBottom: "14px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "#86868b", fontWeight: 500 }}>
                📅 Terjadwal: <span style={{ color: "#0071e3", fontWeight: 600 }}>{formatFriendlyDate(selectedNote.note_date)}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#86868b", fontStyle: "italic" }}>
                {isUpdating ? "🔄 Sedang menyimpan..." : "✨ Mode Edit Langsung Aktif"}
              </div>
            </div>

            {/* Area Workspace Penulisan Catatan */}
            <div style={{ backgroundColor: "#fbfbfe", padding: "20px", borderRadius: "12px", border: "1px solid #e5e5ea" }}>
              {/* Input Judul Catatan */}
              <input 
                type="text"
                className="editor-title-input"
                value={selectedNote.title}
                placeholder="Judul Tanpa Nama"
                onChange={e => setSelectedNote({ ...selectedNote, title: e.target.value })}
                onBlur={handleUpdateNoteDetails} // Otomatis simpan saat kursor keluar
              />
              
              {/* Input Konten Catatan */}
              <textarea
                className="editor-textarea"
                value={selectedNote.content}
                placeholder="Mulai ketik isi tulisan atau dokumentasi agenda Anda disini..."
                onChange={e => setSelectedNote({ ...selectedNote, content: e.target.value })}
                onBlur={handleUpdateNoteDetails} // Otomatis simpan saat kursor keluar
              />
            </div>

            {/* Panel Tombol Aksi Bawah */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "25px" }}>
              {/* Tombol Hapus Utama */}
              <button 
                type="button" 
                className="btn-danger"
                onClick={() => handleDeleteNote(selectedNote.id)}
              >
                🗑️ Hapus Catatan
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                {/* Tombol Simpan Manual */}
                <button
                  type="button"
                  onClick={handleUpdateNoteDetails}
                  style={{ padding: "10px 20px", background: "#34c759", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                >
                  Simpan Perubahan
                </button>

                {/* Tombol Selesai */}
                <button 
                  type="button" 
                  onClick={() => { setIsDetailModalOpen(false); setSelectedNote(null); }} 
                  style={{ padding: "10px 20px", background: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                >
                  Selesai & Keluar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}