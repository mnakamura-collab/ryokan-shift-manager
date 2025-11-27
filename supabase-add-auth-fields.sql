-- スタッフテーブルにログイン用のIDとパスワードを追加

-- ログインIDカラムを追加（ユニーク制約付き）
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 既存のスタッフにデフォルトのログインIDを設定
-- 例: staff001, staff002, ...
-- 実際の運用では管理者が適切なIDを設定する必要があります
DO $$
DECLARE
    staff_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR staff_record IN SELECT id FROM staff WHERE login_id IS NULL
    LOOP
        UPDATE staff
        SET login_id = 'staff' || LPAD(counter::TEXT, 3, '0')
        WHERE id = staff_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- デフォルトパスワード（後で各ユーザーが変更すること）
-- ここでは簡易的に平文で'password'を設定（本番環境ではハッシュ化が必要）
UPDATE staff
SET password_hash = 'password'
WHERE password_hash IS NULL;

-- NOT NULL制約を追加（既存データに値が入った後）
ALTER TABLE staff
ALTER COLUMN login_id SET NOT NULL,
ALTER COLUMN password_hash SET NOT NULL;

-- コメントを追加
COMMENT ON COLUMN staff.login_id IS 'ログインID（ユニーク）';
COMMENT ON COLUMN staff.password_hash IS 'パスワードハッシュ（本番環境ではbcryptなどでハッシュ化）';
