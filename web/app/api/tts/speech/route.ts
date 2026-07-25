import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth';
import { synthesizeOpenAiSpeech } from '@/lib/tts/openaiSpeech';
import { parseGradeFromLevelName } from '@/lib/tts/getTtsSpeedByGrade';

export const runtime = 'nodejs';

type Body = {
  text?: string;
  grade?: number;
  levelName?: string;
  voice?: string;
  model?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
};

/**
 * Authenticated TTS proxy — keeps OPENAI_API_KEY server-side.
 * Speed is derived from grade (1–9) via getTtsSpeedByGrade.
 */
export async function POST(req: Request) {
  try {
    await requireSession();
    const body = (await req.json()) as Body;
    const text = String(body.text || '').trim();
    if (!text) {
      return NextResponse.json({ success: false, message: 'Thiếu text' }, { status: 400 });
    }

    const grade =
      typeof body.grade === 'number'
        ? body.grade
        : parseGradeFromLevelName(body.levelName);

    const result = await synthesizeOpenAiSpeech({
      text,
      grade,
      voice: body.voice,
      model: body.model,
      format: body.format || 'mp3',
    });

    return new NextResponse(new Uint8Array(result.bytes), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'X-TTS-Speed': String(result.speed),
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS thất bại';
    const status = /đăng nhập|unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
