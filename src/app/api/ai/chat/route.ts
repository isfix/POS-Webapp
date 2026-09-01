import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({
        text: "Mode offline aktif. Konfigurasikan GEMINI_API_KEY di environment untuk mengaktifkan asisten AI cerdas.",
      });
    }

    const contents = [
      ...(Array.isArray(history) ? history : []).map((item: any) => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(item.content || '') }],
      })),
      {
        role: 'user',
        parts: [{ text: String(prompt || '') }],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `Anda adalah asisten AI pintar untuk sistem kasir POS dan manajemen toko. Anda membantu kasir dan staf dalam mengelola katalog produk, memantau bahan/stok, dan mengoptimalkan operasional toko.
              Gunakan Bahasa Indonesia yang ramah, sopan, ringkas, dan jelas.
              Bila pengguna meminta konfirmasi untuk aksi hapus produk atau pengubahan stok paksa, awali respon dengan token [CONFIRM].`
            }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Gemini API error:", errJson);
      return NextResponse.json({
        text: "Layanan asisten AI sedang tidak dapat diakses saat ini. Silakan coba beberapa saat lagi.",
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({
      text: candidateText || "Baik, saya siap membantu kebutuhan operasional toko Anda.",
    });
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    return NextResponse.json(
      { text: "Maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba kembali sesaat lagi." },
      { status: 500 }
    );
  }
}
