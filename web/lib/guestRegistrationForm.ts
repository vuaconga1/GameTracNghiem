export const GUEST_REGISTRATION_FORM_ID =
  '1FAIpQLSew1wGZeskvjeZnuR1ltxamTxr6I7yr-XQvY8XHeg7hGRDs2A';

export const GUEST_REGISTRATION_FORM_SUBMIT_URL = `https://docs.google.com/forms/d/e/${GUEST_REGISTRATION_FORM_ID}/formResponse`;

/** Google Form entry IDs (from FB_PUBLIC_LOAD_DATA). */
export const GUEST_REGISTRATION_ENTRIES = {
  phone: 'entry.680063881',
  grade: 'entry.1730401763',
  age: 'entry.954699910',
  goal: 'entry.595226897',
  parentName: 'entry.1246154942',
  location: 'entry.479822864',
  vipInterest: 'entry.252893964',
  wewinStudent: 'entry.1088389287',
} as const;

export const GUEST_REGISTRATION_GRADES = [
  'Mẫu giáo',
  'Lớp 1–2',
  'Lớp 3–5',
  'THCS',
  'THPT',
] as const;

export const GUEST_REGISTRATION_GOALS = [
  'Giao tiếp tự tin hơn',
  'Cải thiện phát âm',
  'Học tốt tiếng Anh ở trường',
  'Luyện Cambridge',
  'Luyện IELTS',
  'Chưa xác định – cần tư vấn',
] as const;

export const GUEST_REGISTRATION_VIP_OPTIONS = ['Có', 'Chưa chắc'] as const;

export const GUEST_REGISTRATION_STUDENT_OPTIONS = [
  'Tôi là học viên của WeWIN Education',
  'Không phải',
] as const;

export type GuestRegistrationGrade = (typeof GUEST_REGISTRATION_GRADES)[number];
export type GuestRegistrationGoal = (typeof GUEST_REGISTRATION_GOALS)[number];
export type GuestRegistrationVipInterest = (typeof GUEST_REGISTRATION_VIP_OPTIONS)[number];
export type GuestRegistrationWewinStudent = (typeof GUEST_REGISTRATION_STUDENT_OPTIONS)[number];

export type GuestRegistrationPayload = {
  phone: string;
  grade: GuestRegistrationGrade;
  goal: GuestRegistrationGoal;
  vipInterest: GuestRegistrationVipInterest;
  age?: string;
  parentName?: string;
  location?: string;
  wewinStudent?: GuestRegistrationWewinStudent | '';
};

const PHONE_PATTERN = /^(0[0-9]{9}|\+84[0-9]{9})$/;

export type GuestRegistrationValidation = {
  phone?: string;
  grade?: string;
  goal?: string;
  vipInterest?: string;
};

export function validateGuestRegistrationPayload(
  payload: Partial<GuestRegistrationPayload>,
): GuestRegistrationValidation {
  const errors: GuestRegistrationValidation = {};
  const phone = String(payload.phone || '').trim();

  if (!phone) {
    errors.phone = 'required';
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'invalid';
  }

  if (!payload.grade || !GUEST_REGISTRATION_GRADES.includes(payload.grade)) {
    errors.grade = 'required';
  }

  if (!payload.goal || !GUEST_REGISTRATION_GOALS.includes(payload.goal)) {
    errors.goal = 'required';
  }

  if (!payload.vipInterest || !GUEST_REGISTRATION_VIP_OPTIONS.includes(payload.vipInterest)) {
    errors.vipInterest = 'required';
  }

  return errors;
}

export function hasGuestRegistrationErrors(errors: GuestRegistrationValidation): boolean {
  return Boolean(errors.phone || errors.grade || errors.goal || errors.vipInterest);
}

export function buildGuestRegistrationFormBody(payload: GuestRegistrationPayload): URLSearchParams {
  const body = new URLSearchParams();
  body.set(GUEST_REGISTRATION_ENTRIES.phone, payload.phone.trim());
  body.set(GUEST_REGISTRATION_ENTRIES.grade, payload.grade);
  body.set(GUEST_REGISTRATION_ENTRIES.goal, payload.goal);
  body.set(GUEST_REGISTRATION_ENTRIES.vipInterest, payload.vipInterest);

  const age = payload.age?.trim();
  const parentName = payload.parentName?.trim();
  const location = payload.location?.trim();
  const wewinStudent = payload.wewinStudent?.trim();
  if (age) body.set(GUEST_REGISTRATION_ENTRIES.age, age);
  if (parentName) body.set(GUEST_REGISTRATION_ENTRIES.parentName, parentName);
  if (location) body.set(GUEST_REGISTRATION_ENTRIES.location, location);
  if (wewinStudent) body.set(GUEST_REGISTRATION_ENTRIES.wewinStudent, wewinStudent);

  return body;
}

export async function submitGuestRegistrationForm(payload: GuestRegistrationPayload): Promise<void> {
  const errors = validateGuestRegistrationPayload(payload);
  if (hasGuestRegistrationErrors(errors)) {
    throw new Error('INVALID_PAYLOAD');
  }

  const response = await fetch('/api/guest/registration-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as { success?: boolean; message?: string };
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'SUBMIT_FAILED');
  }
}
