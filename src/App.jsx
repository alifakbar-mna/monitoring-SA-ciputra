import React, { useEffect, useState, useCallback } from "react";
import { supabase, fetchGoogleCalendarEvents } from "./supabase";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import AllActivity from "./pages/AllActivity";
import MyActivity from "./pages/MyActivity";
import AdminPanel from "./pages/AdminPanel"; 
import NotesCalendar from "./pages/NotesCalendar"; 
import AddActivityModal from "./components/AddActivityModal";

function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [currentPage, setCurrentPage] = useState("dashboard"); 
  const [selectedStaff, setSelectedStaff] = useState(""); 
  const [staffList, setStaffList] = useState([]); 
  const [activities, setActivities] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 

  const currentLocalDate = new Date();
  const currentMonth = currentLocalDate.getMonth() + 1; 
  const currentYear = currentLocalDate.getFullYear();

  // 1. Sinkronisasi Data Aktivitas dari Supabase dan Google Calendar
  const fetchAllActivities = useCallback(async (userObj, currentSession) => {
    if (!userObj) return;
    console.log("Token Google saat ini:", currentSession?.provider_token);
    
    try {
      const paddedMonth = String(currentMonth).padStart(2, '0');
      const startDateStr = `${currentYear}-${paddedMonth}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDateStr = `${currentYear}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;

      // Ambil data lokal dari Supabase
      let { data: localActs, error: dbError } = await supabase
        .from("activities")
        .select("*")
        .gte("activity_date", startDateStr)
        .lte("activity_date", endDateStr);
      
      if (dbError) throw dbError;
      localActs = localActs || [];

      setActivities(localActs);

      const providerToken = currentSession?.provider_token;
      let { data: allStaff } = await supabase.from("staff").select("email, name, campus");
      
      // Sinkronisasi Google Calendar jika token tersedia
      if (providerToken && allStaff) {
        let allGCalEvents = [];

        for (const staff of allStaff) {
          try {
            const gcalEvents = await fetchGoogleCalendarEvents(
              providerToken, 
              startDateStr, 
              staff.email,
              endDateStr
            );
            
            if (gcalEvents && gcalEvents.length > 0) {
              const formatted = gcalEvents.map(event => {
                if (event.status === "cancelled") return null;

                const start = event.start?.dateTime || event.start?.date;
                const end = event.end?.dateTime || event.end?.date;
                if (!start) return null;

                return {
                  staff_name: staff.name,
                  title: event.summary || "No Title",
                  description: event.description || "Diambil dari Google Calendar",
                  activity_date: start.split("T")[0],
                  start_time: start.includes("T") ? start.split("T")[1].substring(0, 5) : "08:00",
                  end_time: end.includes("T") ? end.split("T")[1].substring(0, 5) : "17:00",
                  source: "google_calendar",
                  gcal_event_id: event.id
                };
              }).filter(Boolean);

              allGCalEvents = [...allGCalEvents, ...formatted];
            }
          } catch (err) {
            console.error(`Gagal akses kalender ${staff.email}:`, err);
          }
        }

        const existingGCalIds = new Set(localActs.map(act => act.gcal_event_id).filter(Boolean));
        const filteredNewEvents = allGCalEvents.filter(gAct => !existingGCalIds.has(gAct.gcal_event_id));

        const uniqueEventsMap = new Map();
        filteredNewEvents.forEach(event => {
          if (event.gcal_event_id) uniqueEventsMap.set(event.gcal_event_id, event);
        });
        const newEventsToInsert = Array.from(uniqueEventsMap.values());

        if (newEventsToInsert.length > 0) {
          const { data: insertedData, error: upsertError } = await supabase
            .from("activities")
            .upsert(newEventsToInsert, { onConflict: 'gcal_event_id' })
            .select();
          
          if (!upsertError && insertedData) {
            setActivities(prev => {
              const localMap = new Map(prev.map(item => [item.gcal_event_id || item.id, item]));
              insertedData.forEach(item => localMap.set(item.gcal_event_id, item));
              return Array.from(localMap.values());
            });
          }
        }
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data bulan ini:", err);
    }
  }, [currentMonth, currentYear]);

  // 2. Fungsi Validasi User Terdaftar di Tabel Staff
  const validateStaffUser = useCallback(async (email, currentSession) => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("email", email.toLowerCase().trim());
        
      if (error) throw error;

      if (data && data.length > 0) {
        const loggedInUser = data[0];
        setCurrentUser(loggedInUser);
        fetchStaff();
        fetchAllActivities(loggedInUser, currentSession);

        // Routing awal saat berhasil masuk
        if (loggedInUser.role === "admin") {
          setCurrentPage("dashboard"); 
        } else {
          setCurrentPage("dashboard");
        }
      } else {
        alert("Akses ditolak. Email Google Anda belum didaftarkan oleh Admin.");
        await supabase.auth.signOut();
        setCurrentUser(null);
        setSession(null);
      }
    } catch (err) {
      console.error("Error validasi user:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllActivities]);

  // 3. Efek Autentikasi Awal via Google Auth
  useEffect(() => {
    fetchStaff();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        validateStaffUser(session.user.email, session);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        validateStaffUser(session.user.email, session);
      } else {
        setCurrentUser(null);
        setSession(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [validateStaffUser]);

  // 4. Efek Perubahan Real-time PostgreSQL
  useEffect(() => {
    if (!currentUser || !session) return;

    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => { fetchAllActivities(currentUser, session); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, session, fetchAllActivities]);

  // Handler update & pemicu fetch ulang global
  const handleUpdateActivity = async (updatedAct) => {
    try {
      if (updatedAct && updatedAct.id) {
        const { error } = await supabase
          .from("activities")
          .update({ title: updatedAct.title, description: updatedAct.description })
          .eq("id", updatedAct.id);

        if (error) throw error;
      }
      
      if (currentUser && session) {
        fetchAllActivities(currentUser, session);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNewActivity = async (newAct) => {
    try {
      const { data, error } = await supabase.from("activities").insert([newAct]).select();
      if (error) throw error;
      if (data) setActivities(prev => [...prev, ...data]);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Gagal login dengan Google:", err);
      alert("Terjadi kesalahan saat menyambungkan ke Google.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setCurrentPage("dashboard");
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from("staff").select("name").order("name", { ascending: true });
    if (data) setStaffList(data.map(s => s.name));
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: "14px", color: "#86868b" }}>
        Memeriksa Autentikasi...
      </div>
    );
  }

  if (!session || !currentUser) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f5f5f7" }}>
        <div className="glass-panel" style={{ padding: "40px", width: "100%", maxWidth: "360px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "5px" }}> Monitoring SA</h2>
          <p style={{ color: "#86868b", fontSize: "13px", marginBottom: "30px" }}>Sistem Monitoring berbasis Google Calendar Sync</p>
          
          <button 
            onClick={handleGoogleLogin}
            type="button"
            style={{ 
              width: "100%", padding: "14px", backgroundColor: "#0071e3", color: "#fff", 
              border: "none", borderRadius: "8px", fontWeight: 600, 
              cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" 
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#ffffff" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.045 15.477 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.854 11.57-11.77 0-.79-.085-1.39-.19-1.945H12.24z"/>
            </svg>
            Masuk dengan Akun Google
          </button>
        </div>
      </div>
    );
  }

  // LOGIKA ROUTING HALAMAN
  const renderPage = () => {
    const filteredActivities = activities.filter(act => {
      if (!act.activity_date) return false;
      const parts = act.activity_date.split("-");
      return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === currentMonth;
    });

    switch (currentPage) {
      // 🌟 SEKARANG ALIRKAN PROPS KE LANDING DASHBOARD
      case "dashboard": 
        return (
          <Dashboard 
            setCurrentPage={setCurrentPage} 
            currentUser={currentUser} 
            activities={filteredActivities} 
            onUpdateActivity={handleUpdateActivity} 
          />
        );

      case "all_activity": 
        return (
          <AllActivity 
            activities={filteredActivities} 
            staffList={staffList} 
            onUpdateActivity={handleUpdateActivity} 
            currentMonth={currentMonth} 
            currentYear={currentYear} 
          />
        );

      // 🌟 SEKARANG MENGALIRKAN EMAIL DI SELECTEDSTAFF & SALURKAN HANDLER UPDATE
      case "my_activity": 
        return (
          <MyActivity 
            activities={filteredActivities} 
            selectedStaff={currentUser.email} 
            currentMonth={currentMonth} 
            currentYear={currentYear} 
            onOpenAddModal={() => setIsModalOpen(true)} 
            onUpdateActivity={handleUpdateActivity}
          />
        );

      case "admin_panel": 
        return currentUser.role === 'admin' ? <AdminPanel /> : <Dashboard setCurrentPage={setCurrentPage} currentUser={currentUser} />;
      
      // 🌟 SEKARANG ALIRKAN PROPS KE NOTES CALENDAR
      case "notes": 
        return <NotesCalendar currentUser={currentUser} />;
      
      default: 
        return (
          <Dashboard 
            setCurrentPage={setCurrentPage} 
            currentUser={currentUser} 
            activities={filteredActivities} 
            onUpdateActivity={handleUpdateActivity} 
          />
        );
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "50px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <Navbar 
        currentPage={currentPage} setCurrentPage={setCurrentPage} 
        selectedStaff={selectedStaff} setSelectedStaff={setSelectedStaff} 
        staffList={staffList} onOpenAddModal={() => setIsModalOpen(true)} 
        currentUser={currentUser} onLogout={handleLogout}
      />
      {renderPage()}
      <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedStaff={currentUser.name} onSave={handleSaveNewActivity} />
    </div>
  );
}

export default App;