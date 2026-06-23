import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- BARIS YANG SEMPAT HILANG (WAJIB ADA) ---
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fungsi fetch Google Calendar dinamis (menerima ID Kalender email staf)
export const fetchGoogleCalendarEvents = async (
  providerToken,
  timeMin,
  calendarId = "primary",
  timeMax = null
) => {

  let url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?timeMin=${timeMin}T00:00:00Z` +
    `&singleEvents=true` +
    `&orderBy=startTime`;

  if (timeMax) {
    url += `&timeMax=${timeMax}T23:59:59Z`;
  }

  console.log("Google Calendar URL:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Google Calendar Error:", data);
    throw new Error(JSON.stringify(data));
  }

  return data.items || [];
};