'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/sentry';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest, source: 'global-error.tsx' });
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 antialiased">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Terjadi Kendala Sistem</h2>
          <p className="mt-2 text-xs text-slate-400">
            Aplikasi mengalami kendala tak terduga. Data Anda di penyimpanan lokal tetap aman.
          </p>
          {error?.message && (
            <div className="mt-3 rounded-lg bg-slate-950 p-2.5 text-left font-mono text-[11px] text-amber-400/90 overflow-x-auto">
              {error.message}
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => reset()}
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-500"
            >
              Muat Ulang Aplikasi
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/pos';
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
            >
              Kembali ke Kasir POS
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
