"use client";
import { useEffect, useState } from 'react';

export function MigrationBanner({ isAdmin }: { isAdmin: boolean }) {
  const [unapplied, setUnapplied] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/migration-status')
      .then(res => res.json())
      .then(data => setUnapplied(data.unapplied || []));
  }, [isAdmin]);

  if (!isAdmin || !unapplied || unapplied.length === 0) return null;

  return (
    <div className="w-full flex justify-center mt-2">
      <div className="flex items-center gap-3 px-6 py-3 rounded-lg border border-orange-400 bg-slate-900/90 text-orange-300 shadow-lg animate-pulse">
        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
        <span className="font-semibold text-base">
          <span className="hidden sm:inline">Database migrations pending:</span>
          <span className="sm:hidden">Migrations pending:</span>
          <span className="ml-2 font-mono text-orange-200">{unapplied.join(', ')}</span>
        </span>
      </div>
    </div>
  );
}

