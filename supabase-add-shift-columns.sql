-- シフトテーブルに is_standard と is_confirmed カラムを追加

ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS is_standard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- 既存データに初期値を設定
UPDATE shifts SET is_standard = false WHERE is_standard IS NULL;
UPDATE shifts SET is_confirmed = false WHERE is_confirmed IS NULL;
