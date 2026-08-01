-- 공개 Munchie 게시물은 작성자의 브라우저가 아니라 서버에서 사진·배치·템플릿을 보존한다.
ALTER TABLE courses ADD COLUMN feed_photos TEXT NOT NULL DEFAULT '[]';
ALTER TABLE courses ADD COLUMN feed_decor TEXT NOT NULL DEFAULT '[]';
ALTER TABLE courses ADD COLUMN template_id TEXT;
