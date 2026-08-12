import { describe, expect, it } from 'vitest';

import {
  buildGuestRegistrationFormBody,
  GUEST_REGISTRATION_ENTRIES,
  hasGuestRegistrationErrors,
  validateGuestRegistrationPayload,
} from './guestRegistrationForm';

describe('guestRegistrationForm', () => {
  it('requires phone, grade, and goal', () => {
    const errors = validateGuestRegistrationPayload({});
    expect(errors.phone).toBe('required');
    expect(errors.grade).toBe('required');
    expect(errors.goal).toBe('required');
    expect(hasGuestRegistrationErrors(errors)).toBe(true);
  });

  it('validates Vietnamese phone numbers', () => {
    const invalid = validateGuestRegistrationPayload({
      phone: '123',
      grade: 'Lớp 1–2',
      goal: 'Luyện IELTS',
    });
    expect(invalid.phone).toBe('invalid');

    const valid = validateGuestRegistrationPayload({
      phone: '0912345678',
      grade: 'Lớp 1–2',
      goal: 'Luyện IELTS',
    });
    expect(hasGuestRegistrationErrors(valid)).toBe(false);
  });

  it('builds the Google Forms submit body', () => {
    const body = buildGuestRegistrationFormBody({
      phone: '0912345678',
      grade: 'THCS',
      goal: 'Cải thiện phát âm',
      parentName: 'Lan',
      location: 'Quận 1',
    });

    expect(body.get(GUEST_REGISTRATION_ENTRIES.phone)).toBe('0912345678');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.grade)).toBe('THCS');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.goal)).toBe('Cải thiện phát âm');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.parentName)).toBe('Lan');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.location)).toBe('Quận 1');
  });
});
