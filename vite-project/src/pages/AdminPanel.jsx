import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function AdminPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#0071e3"); 
  const [role, setRole] = useState("staff"); // State role baru
  const [campus, setCampus] = useState("Surabaya"); // State kampus baru
  const [registeredStaff, setRegisteredStaff] = useState([]);
  
  // State untuk filter tampilan di Admin Panel
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

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!name || !email) return alert("Isi semua data!");

    const { error } = await supabase
      .from("staff")
      .insert([{ name, email, color, role, campus }]); // Menyimpan role dan kampus pilihan

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

  const handleUpdateColor = async (id, newColor) => {
    const { error } = await supabase
      .from("staff")
      .update({ color: newColor })
      .eq("id", id);
    
    if (!error) {
      setRegisteredStaff(prev => prev.map(s => s.id === id ? { ...s, color: newColor } : s));
    }
  };

  // PERBAIKAN LOGIKA: Sekarang admin bisa menghapus admin lain
  const handleDeleteStaff = async (id, staffName, staffRole) => {
    const confirmDelete = window.confirm(`Hapus akses ${staffRole} "${staffName}"? Semua data aktivitas terkait juga akan terhapus.`);
    if (confirmDelete) {
      // Hapus aktivitas terkait terlebih dahulu agar tidak melanggar foreign key constraint
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

  // Filter daftar staf yang muncul di bagian kanan berdasarkan pilihan kampus
  const displayedStaff = registeredStaff.filter(s => {
    if (filterCampus === "Semua") return true;
    return s.campus === filterCampus;
  });

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
            
            {/* INPUT PADA ROLE */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "13px", color: "#86868b", fontWeight: 500 }}>Hak Akses Sistem:</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d2d2d7", backgroundColor: "#fff" }}>
                <option value="staff">Staff (Akses Terbatas)</option>
                <option value="admin">Admin (Akses Penuh)</option>
              </select>
            </div>

            {/* INPUT PILIHAN WILAYAH KAMPUS */}
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
            
            {/* FILTER KAMPUS (Mengontrol checklist nama staf yang muncul) */}
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
                
                {/* ADMIN SEKARANG BISA MENCABUT AKSES SESAMA ADMIN */}
                <button onClick={() => handleDeleteStaff(s.id, s.name, s.role)} style={{ padding: "6px 12px", backgroundColor: "#fff", color: "#ff3b30", border: "1px solid #ff3b30", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  Cabut Akses
                </button>
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