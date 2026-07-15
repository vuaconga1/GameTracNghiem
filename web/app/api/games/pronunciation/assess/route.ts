import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { transcribeWithGroq } from '@/features/games/pronunciation/groqTranscribe';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    await requireSession();

    const form = await req.formData();
    const audio = form.get('audio');
    const targetText = String(form.get('targetText') || '').trim();
    const mode = String(form.get('mode') || 'phoneme').trim();

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json(
        { success: false, message: 'Thiếu file ghi âm' },
        { status: 400 }
      );
    }
    if (!targetText) {
      return NextResponse.json(
        { success: false, message: 'Thiếu nội dung mẫu' },
        { status: 400 }
      );
    }

    const mime = audio.type || 'audio/webm';
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
    const result = await transcribeWithGroq(audio, `recording.${ext}`);

    if (!result.ok) {
      return NextResponse.json({
        success: true,
        fallback: 'webspeech' as const,
        reason: result.reason,
        mode,
        targetText,
      });
    }

    return NextResponse.json({
      success: true,
      engine: 'groq' as const,
      transcript: result.transcript,
      mode,
      targetText,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
