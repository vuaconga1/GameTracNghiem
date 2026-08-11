'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';

type LoginFormProps = {
  next?: string;
  initialError?: string;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
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
        setError(data.message || t('auth.failed'));
        return;
      }

      router.push(next || '/');
      router.refresh();
    } catch {
      setError(t('auth.connectionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h2 id="loginTitle">{t('auth.loginTitle')}</h2>
      <p className="login-hint">{t('auth.loginHint')}</p>
      <div
        id="loginError"
        className={error ? 'login-error show' : 'login-error'}
        role="alert"
      >
        {error}
      </div>
      <form id="loginForm" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="loginUsername">{t('auth.username')}</label>
          <input
            type="text"
            id="loginUsername"
            placeholder={t('auth.usernamePlaceholder')}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="login-field">
          <label htmlFor="loginPassword">{t('auth.password')}</label>
          <input
            type="password"
            id="loginPassword"
            placeholder={t('auth.passwordPlaceholder')}
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
          {isSubmitting ? t('auth.submitting') : t('auth.submit')}
        </button>
      </form>
    </>
  );
}
