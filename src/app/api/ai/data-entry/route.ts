import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { naturalLanguageInput } = await req.json();
    const text = String(naturalLanguageInput || '');
    const apiKey = process.env.GEMINI_API_KEY || '';

    // Regex heuristic parser fallback
    const priceMatch = text.match(/(?:rp|harga|sebesar|rp\.)?\s*([\d.,]+(?:\s*rb|\s*ribu|\s*k)?)/i);
    let parsedPrice = 0;
    if (priceMatch) {
      let raw = priceMatch[1].replace(/[.,]/g, '').toLowerCase();
      if (raw.endsWith('rb') || raw.endsWith('ribu') || raw.endsWith('k')) {
        parsedPrice = parseInt(raw) * 1000;
      } else {
        parsedPrice = parseInt(raw) || 0;
      }
    }

    let category = 'Roti Manis';
    const lower = text.toLowerCase();
    if (lower.includes('tawar')) category = 'Roti Tawar';
    else if (lower.includes('cake') || lower.includes('tart') || lower.includes('bolu')) category = 'Cake & Tart';
    else if (lower.includes('pastry') || lower.includes('croissant') || lower.includes('danish')) category = 'Pastry & Croissant';
    else if (lower.includes('donat') || lower.includes('cookies') || lower.includes('kue kering')) category = 'Donat & Cookies';
    else if (lower.includes('minum') || lower.includes('kopi') || lower.includes('teh') || lower.includes('jus')) category = 'Minuman';

    let name = text
      .replace(/(tambah|buat|masukkan|menu|baru|kategori|harga|seharga|rp\.?|\d+)/gi, '')
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (!apiKey) {
      return NextResponse.json({
        formData: {
          name: name || '',
          category,
          price: parsedPrice || 0,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Ekstrak data produk bakery dari kalimat berikut menjadi JSON: "${text}".
              Format JSON wajib:
              {"name": "Nama Roti", "category": "Roti Manis|Roti Tawar|Cake & Tart|Pastry & Croissant|Donat & Cookies|Minuman", "price": 15000}
              Hanya kirimkan raw JSON.`
            }]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return NextResponse.json({ formData: parsed });
      }
    }

    return NextResponse.json({
      formData: {
        name: name || '',
        category,
        price: parsedPrice || 0,
      },
    });
  } catch (err) {
    console.error("Error in /api/ai/data-entry:", err);
    return NextResponse.json(
      { formData: { name: '', category: 'Roti Manis', price: 0 } },
      { status: 500 }
    );
  }
}
