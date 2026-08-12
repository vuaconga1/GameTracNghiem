import { NextResponse } from 'next/server';

import {
  buildGuestRegistrationFormBody,
  GUEST_REGISTRATION_FORM_SUBMIT_URL,
  hasGuestRegistrationErrors,
  type GuestRegistrationPayload,
  validateGuestRegistrationPayload,
} from '@/lib/guestRegistrationForm';

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<GuestRegistrationPayload>;
    const errors = validateGuestRegistrationPayload(payload);
    if (hasGuestRegistrationErrors(errors)) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' },
        { status: 400 },
      );
    }

    const body = buildGuestRegistrationFormBody(payload as GuestRegistrationPayload);
    const response = await fetch(GUEST_REGISTRATION_FORM_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });

    if (response.status >= 400) {
      return NextResponse.json(
        { success: false, message: 'Không gửi được form. Vui lòng thử lại.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống' }, { status: 500 });
  }
}
