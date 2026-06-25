import { GoogleGenAI } from "@google/genai";

// Inisialisasi Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    console.log(
      "GEMINI_API_KEY tersedia:",
      !!process.env.GEMINI_API_KEY
    );

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum dikonfigurasi di Vercel",
      });
    }

    const { message, chatHistory = [] } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Message wajib diisi",
      });
    }

    // UPDATE PADA SYSTEM PROMPT: Mengakomodasi dynamic assignment context
    const systemPrompt = `
Kamu adalah AI Asisten Monitoring SA (Student Affairs) Universitas Ciputra Surabaya.

Tugas utamanya adalah membantu staf Student Affairs yang mengurus dan mendampingi Ormawa dalam menyusun draf kegiatan, program kerja, atau to-do list harian.

KONTEKS PENUGASAN:
User mungkin akan meminta tugas untuk dirinya sendiri atau mendelegasikannya (assign) kepada orang lain/staf lain melalui sistem. Perhatikan baik-baik nama atau email target assignee yang tertera pada pesan instruksi terakhir untuk menyesuaikan nada bicara atau detail deskripsi tugas jika diperlukan.

ATURAN MERESPONS:
1. Jika user meminta to-do list baru atau mendiskusikan agenda Ormawa, berikan draf list yang rapi dan akhiri dengan pertanyaan konfirmasi.
2. Jika user memberikan revisi atau tambahan, perbarui list dan tanyakan konfirmasi kembali.
3. Jika user menyatakan "SETUJU", "OK", "DEAL", "FIX", atau "SUDAH BENAR", maka kamu WAJIB memberikan JSON di dalam tag:

<DATA>
[
  {
    "title": "Contoh Judul Tugas",
    "start_time": "09:00",
    "end_time": "10:00",
    "is_completed": false,
    "description": "Contoh detail deskripsi kegiatan yang jelas."
  }
]
</DATA>

ATURAN DATA JSON (SANGAT KETAT):
- title singkat, jelas, dan profesional.
- description berisi detail breakdown apa saja yang harus dikerjakan.
- is_completed selalu bernilai false.
- start_time & end_time wajib menggunakan format 24 jam (HH:MM), contoh: "08:30", "14:00". Jangan ngawur.
- JANGAN menyertakan key data tambahan lain selain 4 properti di atas.
`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
    ];

    if (Array.isArray(chatHistory)) {
      chatHistory.forEach((chat) => {
        contents.push({
          role:
            chat.role === "assistant" ||
            chat.role === "model"
              ? "model"
              : "user",
          parts: [
            {
              text:
                chat?.parts?.[0]?.text ||
                chat?.text ||
                "",
            },
          ],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message,
        },
      ],
    });

    console.log(
      "Request ke Gemini:",
      JSON.stringify(contents, null, 2)
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    console.log(
      "Response Gemini:",
      JSON.stringify(response, null, 2)
    );

    const text =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    if (!text) {
      return res.status(500).json({
        error: "Gemini tidak mengembalikan teks",
        rawResponse: response,
      });
    }

    return res.status(200).json({
      text,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);

    return res.status(500).json({
      error: error?.message || "Internal Server Error",
      stack:
        process.env.NODE_ENV !== "production"
          ? error?.stack
          : undefined,
    });
  }
}