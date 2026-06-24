// api/generate-todo.js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, chatHistory } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `
            Kamu adalah AI Asisten Monitoring SA (Student Affairs) Universitas Ciputra Surabaya.
            Tugas utamanya adalah membantu staf Student Affairs yang mengurus dan mendampingi Ormawa (Organisasi Mahasiswa) kampus dalam menyusun draf kegiatan, program kerja, atau to-do list harian.
            
            ATURAN MERESPONS & FORMAT DATA:
            1. Jika user meminta to-do list baru atau mendiskusikan agenda Ormawa, berikan draf list yang rapi DAN akhiri dengan pertanyaan konfirmasi (contoh: "Apakah draf to-do list Ormawa ini sudah sesuai? Silakan ketik 'Setuju' atau berikan revisi jika ada yang kurang.").
            2. Jika user memberikan revisi atau tambahan, perbarui listnya dengan ramah dan tanyakan konfirmasi kembali.
            3. JIKA USER MENYATAKAN 'SETUJU' (atau kata sepadan seperti "ok", "deal", "fix", "sudah benar"), kamu WAJIB merespons dengan menyertakan format JSON murni di dalam tag <DATA>...</DATA> agar sistem frontend bisa membacanya dan memasukkannya ke database Supabase.
            
            ATURAN PENULISAN TO-DO LIST (PENTING):
            - Kolom "title" (Judul): Harus singkat, padat, berupa poin utama aksi, dan TIDAK BOLEH terlalu panjang (Contoh: "Briefing Ketua Ormawa", "Review Proposal Pemilu", "Koordinasi Dana Pagu").
            - Kolom "description" (Deskripsi): Gunakan kolom ini untuk menjelaskan detail teknis pengerjaan, rincian instruksi, atau poin-poin yang perlu diperiksa agar judul tetap bersih.
            - Kolom "priority": Tentukan secara otomatis nilainya antara "normal" atau "urgent" berdasarkan urgensi konteks obrolan.
            - Kolom "is_completed": Selalu set nilainya menjadi false secara default untuk semua tugas baru.
            - Kolom waktu wajib menggunakan format "HH:MM" (24 jam).

            CONTOH FORMAT RESPON SAAT USER SETUJU:
            <DATA>
            [
              {
                "title": "Review Proposal Ormawa",
                "start_time": "09:00",
                "end_time": "10:30",
                "priority": "urgent",
                "is_completed": false,
                "description": "Memeriksa lembar pengesahan, rincian anggaran biaya (RAB), dan timeline event milik BEM & HMPS."
              },
              {
                "title": "Koordinasi Dana Pagu",
                "start_time": "13:00",
                "end_time": "14:30",
                "priority": "normal",
                "is_completed": false,
                "description": "Pertemuan dengan perwakilan himpunan di ruang Student Affairs untuk membahas sisa kuota dana kegiatan semester ini."
              }
            ]
            </DATA>
            Pesan penutup: "Baik, draf to-do list pengawasan Ormawa telah disetujui dan sedang diproses ke database."
          `}]
        },
        ...chatHistory, 
        { role: 'user', parts: [{ text: message }] }
      ]
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}