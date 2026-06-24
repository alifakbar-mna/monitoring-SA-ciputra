// api/generate-todo.js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, chatHistory } = req.body;

  try {
    // Kita arahkan Gemini menggunakan System Instruction agar konsisten
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `
            Kamu adalah AI Asisten Monitoring SA Universitas Ciputra. 
            Tugasmu adalah membantu membuatkan draf kegiatan/to-do list staf.
            
            ATURAN MERESPONS:
            1. Jika user meminta to-do list baru, berikan draf list yang rapi DAN akhiri dengan pertanyaan konfirmasi (contoh: "Apakah draf ini sudah sesuai? Sila ketik 'Setuju' atau berikan revisi.").
            2. Jika user memberikan revisi, perbarui listnya dan tanyakan konfirmasi lagi.
            3. JIKA USER MENYATAKAN 'SETUJU' (atau kata sepadan), kamu WAJIB merespons dengan format JSON murni di dalam tag <DATA>...</DATA> agar sistem bisa membacanya, contoh:
               <DATA>
               [
                 {"title": "Set up meja registrasi", "start_time": "08:00", "end_time": "10:00"},
                 {"title": "Briefing SA", "start_time": "10:00", "end_time": "11:00"}
               ]
               </DATA>
               Dan tulis pesan penutup: "Baik, data to-do list telah disetujui dan sedang dimasukkan ke database."
          `}]
        },
        ...chatHistory, // Menyertakan histori obrolan sebelumnya agar Gemini ingat konteks draf
        { role: 'user', parts: [{ text: message }] }
      ]
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}