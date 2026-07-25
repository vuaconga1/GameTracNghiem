/**
 * Frontend helper — call authenticated TTS proxy with grade-based speed.
 * Server applies getTtsSpeedByGrade inside `/api/tts/speech`.
 */
export async function fetchGradeAwareTts(input: {
  text: string;
  grade?: number | null;
  levelName?: string;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; speed: number | null }> {
  const res = await fetch('/api/tts/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: input.text,
      grade: input.grade ?? undefined,
      levelName: input.levelName,
      format: 'mp3',
    }),
    signal: input.signal,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message || `TTS HTTP ${res.status}`);
  }

  const speedHeader = res.headers.get('X-TTS-Speed');
  const speed = speedHeader != null ? Number(speedHeader) : null;
  return {
    blob: await res.blob(),
    speed: Number.isFinite(speed) ? speed : null,
  };
}
