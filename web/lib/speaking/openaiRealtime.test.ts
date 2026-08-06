import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createRealtimeCall,
  hangupRealtimeCall,
} from '@/lib/speaking/openaiRealtime';

const offerSdp = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';

describe('OpenAI Realtime server controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  it('uses the Location call ID instead of x-request-id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n', {
        status: 200,
        headers: {
          Location: '/v1/realtime/calls/rtc_location_123',
          'x-request-id': 'req_trace_only',
        },
      }),
    );

    const result = await createRealtimeCall({
      sdp: offerSdp,
      instructions: 'Practice.',
      safetyIdentifier: 'student-hash',
      topicTitle: 'School',
    });

    expect(result.callId).toBe('rtc_location_123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/calls',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(String(request.headers)).not.toContain('req_trace_only');
    expect(Buffer.isBuffer(request.body)).toBe(true);
    expect(String(request.body)).toContain(offerSdp.trim());
    expect(String(request.body)).toContain('"turn_detection":null');
  });

  it('fails closed when OpenAI omits Location', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n', {
        status: 200,
        headers: { 'x-request-id': 'req_not_a_call_id' },
      }),
    );

    await expect(
      createRealtimeCall({
        sdp: offerSdp,
        instructions: 'Practice.',
        safetyIdentifier: 'student-hash',
      }),
    ).rejects.toThrow('Location call ID');
  });

  it('hangs up by call ID and treats an already-ended call as closed', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }));

    await expect(hangupRealtimeCall('rtc_123')).resolves.toEqual({
      closed: true,
      status: 404,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/calls/rtc_123/hangup',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
