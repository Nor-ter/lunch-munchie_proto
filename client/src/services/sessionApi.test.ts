import { describe, expect, it, vi } from 'vitest';
import { completeSoloSessionChoice, persistSessionSwipe } from './sessionApi';

const input = {
  sessionId: 'session-1',
  userId: 'user-1',
  restaurantId: 'restaurant-1',
  round: 1,
  action: 'LIKE' as const,
  createdAt: '2026-08-17T10:00:00.000Z',
};

const noDelay = () => Promise.resolve();

describe('persistSessionSwipe', () => {
  it('retries a server failure with the same idempotency payload', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await persistSessionSwipe(input, { request, retryDelay: noDelay });

    expect(request).toHaveBeenCalledTimes(2);
    const firstBody = request.mock.calls[0][1]?.body;
    expect(request.mock.calls[1][1]?.body).toBe(firstBody);
    expect(JSON.parse(String(firstBody))).toMatchObject({
      session_id: 'session-1',
      user_id: 'user-1',
      restaurant_id: 'restaurant-1',
      round: 1,
      swipe_action: 'LIKE',
    });
  });

  it('retries a transient network error', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new TypeError('network failed'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await persistSessionSwipe(input, { request, retryDelay: noDelay });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not retry a client error', async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: '세션 권한이 없습니다.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(persistSessionSwipe(input, { request, retryDelay: noDelay }))
      .rejects.toThrow('세션 권한이 없습니다.');
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('completeSoloSessionChoice', () => {
  it('persists the final vote before requesting results that complete the session', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ phase: 'DONE', winnerId: 'restaurant-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(completeSoloSessionChoice({ ...input, round: 2 }, 'ABC 123', {
      request,
      retryDelay: noDelay,
    })).resolves.toEqual({ phase: 'DONE', winnerId: 'restaurant-1' });

    expect(request).toHaveBeenNthCalledWith(1, '/api/swipes', expect.objectContaining({ method: 'POST' }));
    expect(request).toHaveBeenNthCalledWith(2, '/api/sessions/ABC%20123/results');
  });

  it('does not report completion while the server still considers the final pending', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ phase: 'FINAL' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(completeSoloSessionChoice({ ...input, round: 2 }, 'ABC123', {
      request,
      retryDelay: noDelay,
    })).rejects.toThrow('최종 선택이 아직 세션에 반영되지 않았어요.');
  });

  it('rejects an expired result that completed with a different winner', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ phase: 'DONE', winnerId: 'other-restaurant' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(completeSoloSessionChoice({ ...input, round: 2 }, 'ABC123', {
      request,
      retryDelay: noDelay,
    })).rejects.toThrow('최종 선택이 아직 세션에 반영되지 않았어요.');
  });
});
