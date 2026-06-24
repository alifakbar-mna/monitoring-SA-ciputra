import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function AdminPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#0071e3"); 
  const [role, setRole] = useState("staff"); 
  const [campus, setCampus] = useState("Surabaya"); 
  const [registeredStaff, setRegisteredStaff] = useState([]);
  
  // STATE PAGE: Menyimpan data staf yang sedang diedit di halaman terpisah
  const [editingStaff, setEditingStaff] = useState(null);

  // State untuk filter tampilan di sisi kanan
  const [filterCampus, setFilterCampus] = useState("Semua");

  const loadStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRegisteredStaff(data);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Fungsi tambah staf baru
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!name || !email) return alert("Isi semua data!");

    const { error } = await supabase
      .from("staff")
      .insert([{ name: name.trim(), email: email.trim().toLowerCase(), color, role, campus }]);

    if (!error) {
      alert(`Staf ${name} berhasil didaftarkan sebagai ${role}!`);
      setName("");
      setEmail("");
      setColor("#0071e3");
      setRole("staff");
      setCampus("Surabaya");
      loadStaff();
    } else {
      alert("Gagal mendaftarkan staf. Email mungkin sudah digunakan.");
    }
  };

  // FUNGSI UPDATE DATA (Dengan Pelacakan Counter & Force Trim)
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff.name || !editingStaff.email) return alert("Isi semua data!");

    try {
      // 1. Ambil nama asli dari DB berdasarkan ID staf yang sedang diedit
      const { data: oldStaffData, error: fetchError } = await supabase
        .from("staff")
        .select("name")
        .eq("id", editingStaff.id)
        .single();

      if (fetchError) throw new Error("Gagal mengambil data staf lama dari database.");

      // Lakukan .trim() untuk mengantisipasi adanya spasi tidak sengaja
      const oldName = oldStaffData.name.trim();
      const newName = editingStaff.name.trim();

      console.log(`Mencoba sinkronisasi nama: dari "${oldName}" ke "${newName}"`);

      // 2. Jika nama berubah, paksa update di tabel activities
      if (oldName !== newName) {
        // Kita tambahkan opsi count: 'exact' untuk melihat berapa baris yang ter-update
        const { count, error: activityError } = await supabase
          .from("activities")
          .update({ staff_name: newName })
          .eq("staff_name", oldName)
          .select('*', { count: 'exact' }); 

        if (activityError) {
          console.error("Detail Error Supabase Activities:", activityError);
          return alert(`Gagal update tabel activities: ${activityError.message}`);
        }

        console.log(`Berhasil mengubah ${count} baris aktivitas dari "${oldName}" menjadi "${newName}"`);
      }

      // 3. Jalankan update pada profil master staff
      const { error: staffError } = await supabase
        .from("staff")
        .update({ 
          name: newName, 
          email: editingStaff.email.trim().toLowerCase(), 
          role: editingStaff.role, 
          campus: editingStaff.campus,
          color: editingStaff.color 
        })
        .eq("id", editingStaff.id);

      if (!staffError) {
        alert(`Data ${newName} berhasil diperbarui!`);
        setEditingStaff(null);
        loadStaff();
      } else {
        console.error("Detail Error Supabase Staff:", staffError);
        alert(`Gagal memperbarui profil staf: ${staffError.message}`);
      }

    } catch (err) {
      console.error("Catch Error:", err);
      alert(`Terjadi kesalahan sistem: ${err.message}`);
    }
  };

  const handleUpdateColor = async (id, newColor) => {
    const { error } = await supabase
      .from("staff")
      .update({ color: newColor })
      .eq("id", id);
    
    if (!error) {
      setRegisteredStaff(prev => prev.map(s => s.id === id ? { ...s, color: newColor } : s));
    }
  };

  const handleDeleteStaff = async (id, staffName, staffRole) => {
    const confirmDelete = window.confirm(`Hapus akses ${staffRole} "${staffName}"? Semua data aktivitas terkait juga akan terhapus.`);
    if (confirmDelete) {
      await supabase.from("activities").delete().eq("staff_name", staffName);
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (!error) {
        alert(`Akses ${staffName} berhasil dicabut.`);
        loadStaff();
      } else {
        alert("Gagal mencabut akses.");
      }
    }
  };

  const displayedStaff = registeredStaff.filter(s => {
    if (filterCampus === "Semua") return true;
    return s.campus === filterCampus;
  });

  // ==========================================================
  // JIKA TAMPILAN DALAM MODE EDIT STAFF (HALAMAN BERBEDA)
  // ==========================================================
  if (editingStaff) {
    return (
      <div style={{ padding: "20px 40px" }}>
        {/* Tombol kembali ala Apple */}
        <button 
          onClick={() => setEditingStaff(null)} 
          style={{ background: "none", border: "none", color: "#0071e3", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", marginBottom: "20px", padding: 0 }}
        >
          ⟨ Kembali ke Panel Kontrol
        </button>

        <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}>📝 Edit Profil Staf</h2>
        
        <div className="glass-panel" style={{ padding: "30px", backgroundColor: "#fff", maxWidth: "550px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <form onSubmit={handleUpdateStaff} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#86868b", fontWeight: 500 }}>Nama Lengkap Staf:</label>
              <input 
                type="text" 
                value={editingStaff.name} 
                onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} 
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#86868b", fontWeight: 500 }}>Email Google Staf:</label>
              <input 
                type="email" 
                value={editingStaff.email} 
                onChange={e => setEditingStaff({...editingStaff, email: e.target.value})} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "14px" }} 
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#86868b", fontWeight: 500 }}>Hak Akses Sistem (Role):</label>
              <select 
                value={editingStaff.role || "staff"} 
                onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff", fontSize: "14px" }}
              >
                <option value="staff">Staff (Akses Terbatas)</option>
                <option value="admin">Admin (Akses Penuh)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", color: "#86868b", fontWeight: 500 }}>Lokasi Wilayah Kampus:</label>
              <select 
                value={editingStaff.campus || "Surabaya"} 
                onChange={e => setEditingStaff({...editingStaff, campus: e.target.value})} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff", fontSize: "14px" }}
              >
                <option value="Surabaya">Surabaya</option>
                <option value="Makassar">Makassar</option>
                <option value="Jakarta">Jakarta</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "5px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500 }}>Warna Penanda:</label>
              <input 
                type="color" 
                value={editingStaff.color || "#0071e3"} 
                onChange={e => setEditingStaff({...editingStaff, color: e.target.value})} 
                style={{ border: "none", width: "45px", height: "45px", cursor: "pointer", borderRadius: "6px" }} 
              />
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
              <button type="submit" style={{ flex: 1, padding: "14px", backgroundColor: "#34c759", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
                Simpan Perubahan
              </button>
              <button type="button" onClick={() => setEditingStaff(null)} style={{ padding: "14px 24px", backgroundColor: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>
                Batal
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  // ==========================================================
  // HALAMAN UTAMA ADMIN CONTROL PANEL
  // ==========================================================
  return (
    <div style={{ padding: "20px 40px" }}>
      <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}> Admin Control Panel</h2>
      
      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* Form Pendaftaran */}
        <div className="glass-panel" style={{ padding: "25px", backgroundColor: "#fff", flex: "1 1 350px", borderRadius: "16px" }}>
          <h3 style={{ margin: "0 0 15px 0" }}>Hubungkan Akun Staf Baru</h3>
          <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input type="text" placeholder="Nama Lengkap Staf" value={name} onChange={e => setName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7" }} />
            <input type="email" placeholder="Email Google Staf" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7" }} />
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "13px", color: "#86868b", fontWeight: 500 }}>Hak Akses Sistem:</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff" }}>
                <option value="staff">Staff (Akses Terbatas)</option>
                <option value="admin">Admin (Akses Penuh)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "13px", color: "#86868b", fontWeight: 500 }}>Lokasi Kampus:</label>
              <select value={campus} onChange={e => setCampus(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff" }}>
                <option value="Surabaya">Surabaya</option>
                <option value="Makassar">Makassar</option>
                <option value="Jakarta">Jakarta</option>
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}>
              <label style={{ fontSize: "14px", fontWeight: 500 }}>Warna Penanda Jadwal:</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ border: "none", width: "40px", height: "40px", cursor: "pointer", borderRadius: "5px" }} />
            </div>

            <button type="submit" style={{ padding: "12px", backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", marginTop: "5px" }}>
              Otorisasi Akses Akun
            </button>
          </form>
        </div>

        {/* List Staf */}
        <div className="glass-panel" style={{ padding: "25px", backgroundColor: "#fff", flex: "1 1 450px", borderRadius: "16px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0 }}>Daftar Staf Memiliki Akses</h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#86868b" }}>Filter Wilayah:</span>
              <select value={filterCampus} onChange={e => setFilterCampus(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d2d2d7", backgroundColor: "#fff", fontSize: "13px" }}>
                <option value="Semua">Semua Kampus</option>
                <option value="Surabaya">Surabaya</option>
                <option value="Makassar">Makassar</option>
                <option value="Jakarta">Jakarta</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {displayedStaff.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f5f5f7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input type="color" value={s.color || "#0071e3"} onChange={e => handleUpdateColor(s.id, e.target.value)} style={{ border: "none", width: "25px", height: "25px", cursor: "pointer", borderRadius: "5px" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "15px" }}>
                      {s.name} 
                      <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", backgroundColor: s.role === 'admin' ? '#e6f2ff' : '#f5f5f7', color: s.role === 'admin' ? '#0071e3' : '#86868b', fontWeight: 600 }}>
                        {s.role.toUpperCase()}
                      </span>
                    </strong>
                    <span style={{ color: "#86868b", fontSize: "13px" }}>{s.email} • <span style={{ fontStyle: "italic" }}>{s.campus || "Surabaya"}</span></span>
                  </div>
                </div>
                
                {/* GRUP TOMBOL BERDAMPINGAN: EDIT & CABUT AKSES */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => setEditingStaff(s)} // <-- Membuka Halaman Edit khusus
                    style={{ padding: "6px 12px", backgroundColor: "#fff", color: "#0071e3", border: "1px solid #0071e3", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(s.id, s.name, s.role)} 
                    style={{ padding: "6px 12px", backgroundColor: "#fff", color: "#ff3b30", border: "1px solid #ff3b30", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Cabut Akses
                  </button>
                </div>

              </div>
            ))}
            {displayedStaff.length === 0 && (
              <p style={{ color: "#86868b", fontSize: "14px", textAlign: "center", marginTop: "20px" }}>Tidak ada staf di wilayah ini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}