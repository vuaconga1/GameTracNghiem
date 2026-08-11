'use client';

import { FormEvent, useEffect, useId, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        setError(data.message || t('auth.changePasswordFailed'));
        return;
      }
      setSuccess(data.message || t('auth.changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError(t('auth.connectionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="login-overlay"
      style={{ display: 'flex' }}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="login-modal-header" style={{ position: 'relative' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.25rem' }}>
            {t('auth.changePasswordTitle')}
          </h2>
          <button
            type="button"
            className="action-item"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{ position: 'absolute', top: 12, right: 12 }}
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="login-modal-body">
          <p className="login-hint">{t('auth.changePasswordHint')}</p>
          <div
            className={error ? 'login-error show' : success ? 'login-success show' : 'login-error'}
            role="alert"
          >
            {error || success}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="changePwCurrent">{t('auth.currentPassword')}</label>
              <input
                id="changePwCurrent"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="changePwNew">{t('auth.newPassword')}</label>
              <input
                id="changePwNew"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={4}
              />
            </div>
            <div className="login-field">
              <label htmlFor="changePwConfirm">{t('auth.confirmPassword')}</label>
              <input
                id="changePwConfirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={4}
              />
            </div>
            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.changingPassword') : t('auth.changePasswordSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
