-- 役職マスタに基準人数と変動率のフィールドを追加

ALTER TABLE positions
ADD COLUMN IF NOT EXISTS base_required_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS guest_count_ratio DECIMAL(4, 2) DEFAULT 0.0;

-- 既存データに初期値を設定
UPDATE positions SET base_required_count = 2, guest_count_ratio = 0.1 WHERE name = 'フロント';
UPDATE positions SET base_required_count = 3, guest_count_ratio = 0.15 WHERE name = '清掃';
UPDATE positions SET base_required_count = 1, guest_count_ratio = 0.05 WHERE name = 'レストラン';
UPDATE positions SET base_required_count = 1, guest_count_ratio = 0.05 WHERE name = '配膳';
UPDATE positions SET base_required_count = 1, guest_count_ratio = 0.0 WHERE name = '喫茶店';
UPDATE positions SET base_required_count = 2, guest_count_ratio = 0.08 WHERE name = '調理';
UPDATE positions SET base_required_count = 1, guest_count_ratio = 0.0 WHERE name = 'その他';
