'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import {
  ensureGuestFormGateSchedule,
  getGuestFormGateScheduleDelayMs,
  markGuestFormGateCompleted,
  markGuestFormGateDismissed,
} from '@/lib/guestFormGate';
import {
  GUEST_REGISTRATION_GRADES,
  GUEST_REGISTRATION_GOALS,
  hasGuestRegistrationErrors,
  submitGuestRegistrationForm,
  type GuestRegistrationGoal,
  type GuestRegistrationGrade,
  type GuestRegistrationPayload,
  type GuestRegistrationValidation,
  validateGuestRegistrationPayload,
} from '@/lib/guestRegistrationForm';

type Props = {
  isGuest: boolean;
};

const EMPTY_FORM: GuestRegistrationPayload = {
  phone: '',
  grade: '' as GuestRegistrationGrade,
  goal: '' as GuestRegistrationGoal,
  parentName: '',
  location: '',
};

export function GuestFormGateModal({ isGuest }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState<GuestRegistrationPayload>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<GuestRegistrationValidation>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scheduleNextShow = useCallback(() => {
    if (!isGuest) {
      setVisible(false);
      return undefined;
    }

    const state = ensureGuestFormGateSchedule();
    if (state.completed) {
      setVisible(false);
      return undefined;
    }

    const delay = getGuestFormGateScheduleDelayMs(state);
    if (delay === null) {
      setVisible(false);
      return undefined;
    }
    if (delay === 0) {
      setVisible(true);
      return undefined;
    }

    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [isGuest]);

  useEffect(() => scheduleNextShow(), [scheduleNextShow]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!isGuest || !visible) return null;

  function handleDismiss() {
    markGuestFormGateDismissed();
    setVisible(false);
    setFieldErrors({});
    setSubmitError('');
    window.setTimeout(() => scheduleNextShow(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const errors = validateGuestRegistrationPayload(form);
    setFieldErrors(errors);
    if (hasGuestRegistrationErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await submitGuestRegistrationForm(form);
      markGuestFormGateCompleted();
      setVisible(false);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch {
      setSubmitError(t('shell.guestFormGateSubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldErrorMessage(key: keyof GuestRegistrationValidation): string | null {
    const code = fieldErrors[key];
    if (!code) return null;
    if (key === 'phone' && code === 'invalid') return t('shell.guestFormGatePhoneInvalid');
    return t('shell.guestFormGateRequired');
  }

  return (
    <div
      className="login-overlay guest-form-gate-overlay"
      role="presentation"
      data-testid="guest-form-gate-overlay"
    >
      <div
        className="login-modal guest-form-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-form-gate-title"
      >
        <div className="login-modal-header guest-form-gate-header">
          <h2 id="guest-form-gate-title">{t('shell.guestFormGateTitle')}</h2>
          <button
            type="button"
            className="guest-form-gate-close"
            aria-label={t('shell.guestFormGateDismiss')}
            onClick={handleDismiss}
          >
            ×
          </button>
        </div>
        <div className="login-modal-body guest-form-gate-body">
          <p className="guest-form-gate-hint">{t('shell.guestFormGateHint')}</p>

          <form className="guest-form-gate-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
            <label className="guest-form-gate-field">
              <span>{t('shell.guestFormGatePhoneLabel')}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                placeholder={t('shell.guestFormGatePhonePlaceholder')}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
              {fieldErrorMessage('phone') ? (
                <span className="guest-form-gate-error">{fieldErrorMessage('phone')}</span>
              ) : null}
            </label>

            <fieldset className="guest-form-gate-field">
              <legend>{t('shell.guestFormGateGradeLabel')}</legend>
              <div className="guest-form-gate-options">
                {GUEST_REGISTRATION_GRADES.map((grade) => (
                  <label key={grade} className="guest-form-gate-option">
                    <input
                      type="radio"
                      name="guest-grade"
                      value={grade}
                      checked={form.grade === grade}
                      onChange={() => setForm((current) => ({ ...current, grade }))}
                    />
                    <span>{grade}</span>
                  </label>
                ))}
              </div>
              {fieldErrorMessage('grade') ? (
                <span className="guest-form-gate-error">{fieldErrorMessage('grade')}</span>
              ) : null}
            </fieldset>

            <fieldset className="guest-form-gate-field">
              <legend>{t('shell.guestFormGateGoalLabel')}</legend>
              <div className="guest-form-gate-options">
                {GUEST_REGISTRATION_GOALS.map((goal) => (
                  <label key={goal} className="guest-form-gate-option">
                    <input
                      type="radio"
                      name="guest-goal"
                      value={goal}
                      checked={form.goal === goal}
                      onChange={() => setForm((current) => ({ ...current, goal }))}
                    />
                    <span>{goal}</span>
                  </label>
                ))}
              </div>
              {fieldErrorMessage('goal') ? (
                <span className="guest-form-gate-error">{fieldErrorMessage('goal')}</span>
              ) : null}
            </fieldset>

            <label className="guest-form-gate-field">
              <span>{t('shell.guestFormGateParentLabel')}</span>
              <input
                type="text"
                autoComplete="name"
                value={form.parentName || ''}
                onChange={(event) => setForm((current) => ({ ...current, parentName: event.target.value }))}
              />
            </label>

            <label className="guest-form-gate-field">
              <span>{t('shell.guestFormGateLocationLabel')}</span>
              <input
                type="text"
                value={form.location || ''}
                placeholder={t('shell.guestFormGateLocationPlaceholder')}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
            </label>

            {submitError ? <p className="guest-form-gate-error guest-form-gate-submit-error">{submitError}</p> : null}

            <button type="submit" className="btn btn-primary guest-form-gate-submit" disabled={isSubmitting}>
              {isSubmitting ? t('shell.guestFormGateSubmitting') : t('shell.guestFormGateSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
