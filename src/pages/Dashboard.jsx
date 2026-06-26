import React, { useEffect } from "react";
import { supabase } from "../supabase"; // Sesuaikan path jika berbeda

// 1. Pastikan komponen menerima props 'activities' dan 'onUpdateActivity' dari App.jsx
export default function Dashboard({ setCurrentPage, currentUser, activities = [], onUpdateActivity }) {

  // 2. Pasang Listener Realtime khusus untuk mendengarkan perubahan data
  useEffect(() => {
    const channel = supabase
      .channel("public:activities-dashboard-local")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        (payload) => {
          console.log("Ada perubahan di Board via Realtime!", payload);
          
          // 🌟 PERBAIKAN: Panggil onUpdateActivity dari props, BUKAN fetchBoardData
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

  // 3. Contoh fungsi saat tombol checklist kartu di board diklik
  const handleToggleComplete = async (activityId, currentStatus) => {
    const { error } = await supabase
      .from("activities")
      .update({ is_completed: !currentStatus })
      .eq("id", activityId);

    if (!error) {
      // 🌟 PERBAIKAN: Memicu render ulang global ke App.jsx setelah checklist sukses
      if (typeof onUpdateActivity === "function") {
        onUpdateActivity();
      }
    } else {
      console.error("Gagal memperbarui status:", error.message);
    }
  };

  return (
    <div>
      {/* 4. Gunakan array 'activities' dari props untuk merender kolom Todo, Doing, Done */}
      {/* Contoh pemetaan data ke board kamu: */}
      {/* activities.filter(act => !act.is_completed).map(...) */}
    </div>
  );
}