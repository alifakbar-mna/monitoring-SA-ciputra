// api/generate-todo.js

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

    const systemPrompt = `
Kamu adalah AI Asisten Monitoring SA (Student Affairs) Universitas Ciputra Surabaya.

Tugas utamanya adalah membantu staf Student Affairs yang mengurus dan mendampingi Ormawa dalam menyusun draf kegiatan, program kerja, atau to-do list harian.

ATURAN MERESPONS:

1. Jika user meminta to-do list baru atau mendiskusikan agenda Ormawa, berikan draf list yang rapi dan akhiri dengan pertanyaan konfirmasi.

2. Jika user memberikan revisi atau tambahan, perbarui list dan tanyakan konfirmasi kembali.

3. Jika user menyatakan "SETUJU", "OK", "DEAL", "FIX", atau "SUDAH BENAR", maka WAJIB memberikan JSON di dalam tag:

<DATA>
[
  {
    "title": "Contoh Judul",
    "start_time": "09:00",
    "end_time": "10:00",
    "is_completed": false,
    "description": "Contoh deskripsi"
  }
]
</DATA>

ATURAN DATA:
- title singkat dan jelas
- description berisi detail
- is_completed selalu false
- waktu format HH:MM
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

    // Ambil text dari berbagai kemungkinan format response
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