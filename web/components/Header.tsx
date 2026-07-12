'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type HeaderProps = {
  displayName: string;
};

export function Header({ displayName }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--white)]">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-black text-[var(--white)]">
            W
          </span>
          <span>
            <span className="block text-xl font-black text-[var(--primary)]">
              WeWIN
            </span>
            <span className="text-sm font-bold text-[var(--text-muted)]">
              Game Trắc Nghiệm
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-3 text-sm font-bold">
          <Link
            href="/leaderboard"
            className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-[var(--primary)] transition hover:bg-[var(--primary-hover)]"
          >
            Bảng xếp hạng
          </Link>
          <span className="text-[var(--text-muted)]">{displayName}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-[var(--primary)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </nav>
      </div>
    </header>
  );
}
