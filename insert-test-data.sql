-- テストデータ投入スクリプト
-- 50人のスタッフを含む包括的なテストデータ

-- ============================================
-- 1. 建物・部屋テーブルの作成（まだ存在しない場合）
-- ============================================

-- 建物マスタテーブル
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 部屋マスタテーブル
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  has_bath BOOLEAN DEFAULT false,
  has_toilet BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, room_number)
);

-- RLS設定
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON buildings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON rooms FOR ALL USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);

-- daily_occupancyテーブルを更新（building_id対応）
ALTER TABLE daily_occupancy DROP CONSTRAINT IF EXISTS daily_occupancy_date_key;
ALTER TABLE daily_occupancy ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_occupancy_date_building ON daily_occupancy(date, building_id);

-- ============================================
-- 2. 既存データのクリーンアップ
-- ============================================

TRUNCATE TABLE shift_change_history CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE staff_schedules CASCADE;
TRUNCATE TABLE staff_unavailable_dates CASCADE;
TRUNCATE TABLE staff_availability CASCADE;
TRUNCATE TABLE staff_work_limits CASCADE;
TRUNCATE TABLE staff_priority CASCADE;
TRUNCATE TABLE required_staff_assignments CASCADE;
TRUNCATE TABLE daily_staff_requirements CASCADE;
TRUNCATE TABLE daily_occupancy CASCADE;
TRUNCATE TABLE reservations CASCADE;
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE buildings CASCADE;
TRUNCATE TABLE staff CASCADE;

-- positions は削除せず、既存データを維持
UPDATE positions SET is_active = true;

-- ============================================
-- 3. 建物マスタデータ
-- ============================================

INSERT INTO buildings (name, total_rooms, display_order, is_active) VALUES
  ('本館', 30, 1, true),
  ('新館', 25, 2, true),
  ('別館', 15, 3, true);

-- ============================================
-- 4. 部屋マスタデータ
-- ============================================

-- 本館の部屋（30室）
INSERT INTO rooms (room_number, building_id, room_type, has_bath, has_toilet, is_active)
SELECT
  (700 + n)::TEXT,
  (SELECT id FROM buildings WHERE name = '本館'),
  CASE
    WHEN n <= 5 THEN '特別室'
    WHEN n <= 20 THEN '和室'
    ELSE '洋室'
  END,
  n <= 5,  -- 特別室のみバス付き
  true,
  true
FROM generate_series(1, 30) AS n;

-- 新館の部屋（25室）
INSERT INTO rooms (room_number, building_id, room_type, has_bath, has_toilet, is_active)
SELECT
  (800 + n)::TEXT,
  (SELECT id FROM buildings WHERE name = '新館'),
  CASE
    WHEN n <= 15 THEN '和室'
    ELSE '洋室'
  END,
  false,
  true,
  true
FROM generate_series(1, 25) AS n;

-- 別館の部屋（15室）
INSERT INTO rooms (room_number, building_id, room_type, has_bath, has_toilet, is_active)
SELECT
  (900 + n)::TEXT,
  (SELECT id FROM buildings WHERE name = '別館'),
  '和室',
  false,
  true,
  true
FROM generate_series(1, 15) AS n;

-- ============================================
-- 5. スタッフデータ（50人）
-- ============================================

-- 管理者アカウント（5人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled) VALUES
  ('管理者 太郎', 'フロント', 'admin', 100, true, 'admin1@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin1@test.com', false),
  ('管理者 花子', '管理', 'admin', 95, true, 'admin2@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin2@test.com', false),
  ('管理者 次郎', '調理', 'admin', 98, true, 'admin3@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin3@test.com', false),
  ('管理者 美咲', 'フロント', 'admin', 97, true, 'admin4@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin4@test.com', false),
  ('管理者 健太', '管理', 'admin', 99, true, 'admin5@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin5@test.com', false);

-- スタッフアカウント（45人）
-- フロント（10人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled)
SELECT
  'フロント ' || n || '号',
  'フロント',
  'user',
  70 + (n % 30),
  true,
  'front' || n || '@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'front' || n || '@test.com',
  false
FROM generate_series(1, 10) AS n;

-- 清掃（12人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled)
SELECT
  '清掃 ' || n || '号',
  '清掃',
  'user',
  65 + (n % 35),
  true,
  'cleaning' || n || '@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'cleaning' || n || '@test.com',
  false
FROM generate_series(1, 12) AS n;

-- 調理（8人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled)
SELECT
  '調理 ' || n || '号',
  '調理',
  'user',
  75 + (n % 25),
  true,
  'cooking' || n || '@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'cooking' || n || '@test.com',
  false
FROM generate_series(1, 8) AS n;

-- 配膳（10人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled)
SELECT
  '配膳 ' || n || '号',
  '配膳',
  'user',
  68 + (n % 32),
  true,
  'serving' || n || '@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'serving' || n || '@test.com',
  false
FROM generate_series(1, 10) AS n;

-- 送迎（5人）
INSERT INTO staff (name, position, role, trust_score, is_active, login_id, password_hash, email, is_2fa_enabled)
SELECT
  '送迎 ' || n || '号',
  '送迎',
  'user',
  80 + (n % 20),
  true,
  'transport' || n || '@test.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'transport' || n || '@test.com',
  false
FROM generate_series(1, 5) AS n;

-- ============================================
-- 6. スタッフ勤務可能時間設定
-- ============================================

-- 全スタッフに対して、基本的な勤務可能時間を設定
-- 月-金: 09:00-18:00、土日: 休み（一部は週末勤務可能）
INSERT INTO staff_availability (staff_id, day_of_week, is_available, available_start_time, available_end_time)
SELECT
  s.id,
  dow,
  CASE
    WHEN dow IN (0, 6) THEN (random() > 0.5)  -- 50%は週末も勤務可能
    ELSE true
  END,
  CASE
    WHEN dow IN (0, 6) AND (random() > 0.5) THEN '08:00'
    ELSE '09:00'
  END::TIME,
  CASE
    WHEN dow IN (0, 6) AND (random() > 0.5) THEN '17:00'
    ELSE '18:00'
  END::TIME
FROM staff s
CROSS JOIN generate_series(0, 6) AS dow
WHERE s.role = 'user';

-- 管理者は全曜日勤務可能
INSERT INTO staff_availability (staff_id, day_of_week, is_available, available_start_time, available_end_time)
SELECT
  s.id,
  dow,
  true,
  '08:00'::TIME,
  '20:00'::TIME
FROM staff s
CROSS JOIN generate_series(0, 6) AS dow
WHERE s.role = 'admin';

-- ============================================
-- 7. スタッフ労働時間制約
-- ============================================

INSERT INTO staff_work_limits (staff_id, max_hours_per_week, max_hours_per_month, max_consecutive_days)
SELECT
  id,
  CASE
    WHEN role = 'admin' THEN 45
    ELSE 40
  END,
  CASE
    WHEN role = 'admin' THEN 180
    ELSE 160
  END,
  CASE
    WHEN role = 'admin' THEN 6
    ELSE 5
  END
FROM staff;

-- ============================================
-- 8. スタッフ優先度設定
-- ============================================

INSERT INTO staff_priority (staff_id, position, priority_score, trust_score_weight, seniority_weight, custom_weight)
SELECT
  s.id,
  s.position,
  50 + (s.trust_score / 2),
  0.4,
  0.3,
  0.3
FROM staff s;

-- ============================================
-- 9. 稼働率データ（今後30日分）
-- ============================================

INSERT INTO daily_occupancy (date, building_id, room_occupancy_rate, total_rooms, occupied_rooms, has_banquet, banquet_guest_count)
SELECT
  CURRENT_DATE + n,
  b.id,
  CASE
    WHEN EXTRACT(DOW FROM CURRENT_DATE + n) IN (0, 6) THEN 75 + (random() * 20)::INTEGER  -- 週末は75-95%
    ELSE 50 + (random() * 30)::INTEGER  -- 平日は50-80%
  END,
  b.total_rooms,
  CASE
    WHEN EXTRACT(DOW FROM CURRENT_DATE + n) IN (0, 6) THEN (b.total_rooms * (75 + (random() * 20)::INTEGER) / 100)::INTEGER
    ELSE (b.total_rooms * (50 + (random() * 30)::INTEGER) / 100)::INTEGER
  END,
  (random() > 0.7),  -- 30%の確率で宴会あり
  CASE WHEN (random() > 0.7) THEN 20 + (random() * 80)::INTEGER ELSE 0 END
FROM generate_series(0, 29) AS n
CROSS JOIN buildings b;

-- ============================================
-- 10. 必要人員設定（今後30日分）
-- ============================================

-- 各職種の時間帯別基本必要人数
INSERT INTO daily_staff_requirements (date, position, time_slot_id, required_count, room_occupancy_bonus, banquet_bonus)
SELECT
  CURRENT_DATE + n,
  p.name,
  ts.id,
  CASE
    -- フロント
    WHEN p.name = 'フロント' AND ts.name IN ('早朝', '午前', '夕方') THEN 3
    WHEN p.name = 'フロント' AND ts.name IN ('午後', '夜') THEN 2
    WHEN p.name = 'フロント' AND ts.name = '深夜' THEN 1
    -- 清掃
    WHEN p.name = '清掃' AND ts.name IN ('午前', '午後') THEN 5
    WHEN p.name = '清掃' AND ts.name IN ('早朝', '夕方') THEN 2
    WHEN p.name = '清掃' AND ts.name IN ('夜', '深夜') THEN 0
    -- 調理
    WHEN p.name = '調理' AND ts.name IN ('早朝', '午前') THEN 2
    WHEN p.name = '調理' AND ts.name IN ('午後', '夕方', '夜') THEN 3
    WHEN p.name = '調理' AND ts.name = '深夜' THEN 1
    -- 配膳
    WHEN p.name = '配膳' AND ts.name IN ('早朝', '午前') THEN 3
    WHEN p.name = '配膳' AND ts.name IN ('午後', '夕方', '夜') THEN 4
    WHEN p.name = '配膳' AND ts.name = '深夜' THEN 0
    -- 送迎
    WHEN p.name = '送迎' AND ts.name IN ('早朝', '午前', '夕方') THEN 1
    WHEN p.name = '送迎' AND ts.name IN ('午後', '夜', '深夜') THEN 1
    -- 管理
    WHEN p.name = '管理' AND ts.name IN ('午前', '午後', '夕方') THEN 1
    ELSE 0
  END,
  CASE
    WHEN p.name IN ('フロント', '清掃', '配膳') THEN 0.5
    ELSE 0.0
  END,
  CASE
    WHEN p.name IN ('調理', '配膳') THEN 2
    WHEN p.name = 'フロント' THEN 1
    ELSE 0
  END
FROM generate_series(0, 29) AS n
CROSS JOIN positions p
CROSS JOIN time_slots ts
WHERE p.is_active = true AND ts.is_active = true;

-- ============================================
-- 11. 予約データサンプル（今後30日分）
-- ============================================

INSERT INTO reservations (guest_name, check_in_date, check_out_date, number_of_guests, plan, required_staff)
SELECT
  '予約者 ' || n || '様',
  CURRENT_DATE + (n % 30),
  CURRENT_DATE + (n % 30) + ((n % 3) + 1),
  2 + (n % 4),
  CASE (n % 4)
    WHEN 0 THEN '素泊まり'
    WHEN 1 THEN '1泊2食'
    WHEN 2 THEN '豪華会席'
    ELSE '記念日プラン'
  END,
  CASE (n % 4)
    WHEN 0 THEN 1
    WHEN 1 THEN 2
    WHEN 2 THEN 3
    ELSE 3
  END
FROM generate_series(1, 50) AS n;

-- ============================================
-- 12. テストシフトデータ（今後7日分）
-- ============================================

-- フロントスタッフのシフト
INSERT INTO shifts (staff_id, date, start_time, end_time, position, is_completed)
SELECT
  s.id,
  CURRENT_DATE + n,
  '09:00'::TIME,
  '18:00'::TIME,
  'フロント',
  false
FROM staff s
CROSS JOIN generate_series(0, 6) AS n
WHERE s.position = 'フロント'
  AND s.role = 'user'
  AND (n + EXTRACT(DOW FROM s.created_at)::INTEGER) % 7 NOT IN (0, 6)  -- 週末を避ける
LIMIT 30;

-- 清掃スタッフのシフト
INSERT INTO shifts (staff_id, date, start_time, end_time, position, is_completed)
SELECT
  s.id,
  CURRENT_DATE + n,
  '08:00'::TIME,
  '16:00'::TIME,
  '清掃',
  false
FROM staff s
CROSS JOIN generate_series(0, 6) AS n
WHERE s.position = '清掃'
  AND s.role = 'user'
  AND (n + EXTRACT(DOW FROM s.created_at)::INTEGER) % 7 NOT IN (0, 6)
LIMIT 40;

-- 調理スタッフのシフト
INSERT INTO shifts (staff_id, date, start_time, end_time, position, is_completed)
SELECT
  s.id,
  CURRENT_DATE + n,
  '06:00'::TIME,
  '15:00'::TIME,
  '調理',
  false
FROM staff s
CROSS JOIN generate_series(0, 6) AS n
WHERE s.position = '調理'
  AND s.role = 'user'
  AND n % 2 = 0
LIMIT 20;

-- ============================================
-- 13. 休暇申請サンプル
-- ============================================

INSERT INTO staff_unavailable_dates (staff_id, date, unavailable_type, reason, status)
SELECT
  s.id,
  CURRENT_DATE + 7 + (n * 3),
  'all_day',
  CASE (n % 3)
    WHEN 0 THEN '希望休'
    WHEN 1 THEN '有給'
    ELSE '私用'
  END,
  CASE (n % 3)
    WHEN 0 THEN 'approved'
    WHEN 1 THEN 'pending'
    ELSE 'approved'
  END
FROM staff s
CROSS JOIN generate_series(1, 3) AS n
WHERE s.role = 'user'
LIMIT 20;

-- ============================================
-- 完了メッセージ
-- ============================================

DO $$
DECLARE
  staff_count INTEGER;
  building_count INTEGER;
  room_count INTEGER;
  shift_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO staff_count FROM staff;
  SELECT COUNT(*) INTO building_count FROM buildings;
  SELECT COUNT(*) INTO room_count FROM rooms;
  SELECT COUNT(*) INTO shift_count FROM shifts;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'テストデータ投入完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'スタッフ数: %', staff_count;
  RAISE NOTICE '建物数: %', building_count;
  RAISE NOTICE '部屋数: %', room_count;
  RAISE NOTICE 'シフト数: %', shift_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テストアカウント:';
  RAISE NOTICE '  管理者: admin1@test.com ~ admin5@test.com';
  RAISE NOTICE '  フロント: front1@test.com ~ front10@test.com';
  RAISE NOTICE '  清掃: cleaning1@test.com ~ cleaning12@test.com';
  RAISE NOTICE '  調理: cooking1@test.com ~ cooking8@test.com';
  RAISE NOTICE '  配膳: serving1@test.com ~ serving10@test.com';
  RAISE NOTICE '  送迎: transport1@test.com ~ transport5@test.com';
  RAISE NOTICE 'パスワード: すべて "password"';
  RAISE NOTICE '========================================';
END $$;
