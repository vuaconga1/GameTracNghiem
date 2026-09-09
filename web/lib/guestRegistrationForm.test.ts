import { describe, expect, it } from 'vitest';

import {
  buildGuestRegistrationFormBody,
  GUEST_REGISTRATION_ENTRIES,
  hasGuestRegistrationErrors,
  validateGuestRegistrationPayload,
} from './guestRegistrationForm';

describe('guestRegistrationForm', () => {
  it('requires phone, grade, goal, and vip interest', () => {
    const errors = validateGuestRegistrationPayload({});
    expect(errors.phone).toBe('required');
    expect(errors.grade).toBe('required');
    expect(errors.goal).toBe('required');
    expect(errors.vipInterest).toBe('required');
    expect(hasGuestRegistrationErrors(errors)).toBe(true);
  });

  it('validates Vietnamese phone numbers', () => {
    const invalid = validateGuestRegistrationPayload({
      phone: '123',
      grade: 'Lớp 1–2',
      goal: 'Luyện IELTS',
      vipInterest: 'Có',
    });
    expect(invalid.phone).toBe('invalid');

    const valid = validateGuestRegistrationPayload({
      phone: '0912345678',
      grade: 'Lớp 1–2',
      goal: 'Luyện IELTS',
      vipInterest: 'Có',
    });
    expect(hasGuestRegistrationErrors(valid)).toBe(false);
  });

  it('builds the Google Forms submit body', () => {
    const body = buildGuestRegistrationFormBody({
      phone: '0912345678',
      grade: 'THCS',
      age: '12',
      goal: 'Cải thiện phát âm',
      parentName: 'Lan',
      location: 'Quận 1',
      vipInterest: 'Có',
      wewinStudent: 'Không phải',
    });

    expect(body.get(GUEST_REGISTRATION_ENTRIES.phone)).toBe('0912345678');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.grade)).toBe('THCS');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.age)).toBe('12');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.goal)).toBe('Cải thiện phát âm');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.parentName)).toBe('Lan');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.location)).toBe('Quận 1');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.vipInterest)).toBe('Có');
    expect(body.get(GUEST_REGISTRATION_ENTRIES.wewinStudent)).toBe('Không phải');
  });

  it('omits optional blank fields from the submit body', () => {
    const body = buildGuestRegistrationFormBody({
      phone: '0912345678',
      grade: 'THCS',
      goal: 'Cải thiện phát âm',
      vipInterest: 'Chưa chắc',
    });

    expect(body.has(GUEST_REGISTRATION_ENTRIES.age)).toBe(false);
    expect(body.has(GUEST_REGISTRATION_ENTRIES.parentName)).toBe(false);
    expect(body.has(GUEST_REGISTRATION_ENTRIES.location)).toBe(false);
    expect(body.has(GUEST_REGISTRATION_ENTRIES.wewinStudent)).toBe(false);
  });
});
