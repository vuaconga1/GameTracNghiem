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
    <>
      <div
        id="loginError"
        className={error ? 'login-error show' : 'login-error'}
        role="alert"
      >
        {error}
      </div>
      <form id="loginForm" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="loginUsername">Username</label>
          <input
            type="text"
            id="loginUsername"
            placeholder="Nhập username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="login-field">
          <label htmlFor="loginPassword">Password</label>
          <input
            type="password"
            id="loginPassword"
            placeholder="Nhập password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button
          type="submit"
          className="login-submit"
          id="loginSubmit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </>
  );
}
