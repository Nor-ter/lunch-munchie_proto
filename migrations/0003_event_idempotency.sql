-- 브라우저 재렌더·재시도·네트워크 재전송이 동일 행동을 중복 기록하지 않게 한다.
ALTER TABLE rec_events ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS rec_events_idempotency_idx
  ON rec_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
