import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CLIENT-LOG]`, JSON.stringify(body));
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 400 });
  }
}
