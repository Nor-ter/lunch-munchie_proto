import { useEffect, useState } from 'react';

/** 작성자의 한줄평부터 시작해 등록된 답글을 일정 간격으로 순환한다. */
export function useRotatingFeedback(items: string[], intervalMs = 5000) {
  const signature = items.join('\u0000');
  const [cursor, setCursor] = useState({ signature, index: 0 });
  // 숨김 등으로 목록이 바뀐 렌더에서는 effect를 기다리지 않고 즉시 첫 항목으로 전환한다.
  const index = cursor.signature === signature ? cursor.index : 0;

  useEffect(() => {
    setCursor({ signature, index: 0 });
    if (items.length <= 1) return;

    const timer = window.setInterval(() => {
      setCursor(current => ({
        signature,
        index: current.signature === signature ? (current.index + 1) % items.length : 0,
      }));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [signature, intervalMs, items.length]);

  return items[index] ?? items[0] ?? '';
}
