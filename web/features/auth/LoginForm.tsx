'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type LoginFormProps = {
  next?: string;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.success) {
        setError(data.message || 'Không thể đăng nhập');
        return;
      }

      router.push(next || '/');
      router.refresh();
    } catch {
      setError('Không thể kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[var(--primary)]">
          Tên đăng nhập
        </span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--white)] px-4 py-3 text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-light)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[var(--primary)]">
          Mật khẩu
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--white)] px-4 py-3 text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-light)]"
        />
      </label>

      {error ? (
        <div className="data-loading-state min-h-0 justify-start py-1 text-left text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-[var(--white)] transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}
