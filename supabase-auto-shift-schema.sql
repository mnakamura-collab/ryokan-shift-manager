-- 自動シフト管理機能のためのテーブル定義

-- 1. 時間帯マスタ
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- '早朝', '午前', etc.
  start_time TIME NOT NULL,             -- '05:00'
  end_time TIME NOT NULL,               -- '09:00'
  display_order INTEGER NOT NULL,       -- 表示順
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データ挿入
INSERT INTO time_slots (name, start_time, end_time, display_order) VALUES
  ('早朝', '05:00', '09:00', 1),
  ('午前', '09:00', '12:00', 2),
  ('午後', '12:00', '15:00', 3),
  ('夕方', '15:00', '18:00', 4),
  ('夜', '18:00', '22:00', 5),
  ('深夜', '22:00', '05:00', 6)
ON CONFLICT DO NOTHING;

-- 2. 役職別必要人数設定（日別・時間帯別）
CREATE TABLE IF NOT EXISTS daily_staff_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  position TEXT NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  required_count INTEGER NOT NULL DEFAULT 0,

  -- 稼働率による変動設定
  room_occupancy_bonus DECIMAL(3,2) DEFAULT 0,  -- 客室稼働率10%ごとに+X人
  banquet_bonus INTEGER DEFAULT 0,              -- 宴会ありなら+X人

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 同じ日・役職・時間帯の重複を防ぐ
  UNIQUE(date, position, time_slot_id)
);

-- インデックス
CREATE INDEX idx_daily_requirements_date ON daily_staff_requirements(date);
CREATE INDEX idx_daily_requirements_position ON daily_staff_requirements(position);

-- 3. スタッフの勤務可能時間（曜日別）
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=日曜, 6=土曜
  is_available BOOLEAN DEFAULT true,
  available_start_time TIME,
  available_end_time TIME,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 同じスタッフの同じ曜日は1レコードのみ
  UNIQUE(staff_id, day_of_week)
);

-- インデックス
CREATE INDEX idx_staff_availability_staff ON staff_availability(staff_id);

-- 4. スタッフの労働時間制約
CREATE TABLE IF NOT EXISTS staff_work_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  max_hours_per_week DECIMAL(5,2) DEFAULT 40,      -- 週40時間
  max_hours_per_month DECIMAL(6,2) DEFAULT 160,    -- 月160時間
  max_consecutive_days INTEGER DEFAULT 5,          -- 連続5日まで

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 1スタッフにつき1レコード
  UNIQUE(staff_id)
);

-- 5. 希望休・不可日設定
CREATE TABLE IF NOT EXISTS staff_unavailable_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  unavailable_type TEXT NOT NULL CHECK (unavailable_type IN ('all_day', 'time_slot')),
  time_slot_ids UUID[],                            -- 時間帯指定の場合
  reason TEXT,                                     -- '希望休', '有給', etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_unavailable_dates_staff ON staff_unavailable_dates(staff_id);
CREATE INDEX idx_unavailable_dates_date ON staff_unavailable_dates(date);
CREATE INDEX idx_unavailable_dates_status ON staff_unavailable_dates(status);

-- 6. スタッフアサイン優先度設定
CREATE TABLE IF NOT EXISTS staff_priority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  priority_score INTEGER DEFAULT 50,               -- 0-100, 高いほど優先

  -- 複数基準の重み設定
  trust_score_weight DECIMAL(3,2) DEFAULT 0.4,     -- 信頼度の重み
  seniority_weight DECIMAL(3,2) DEFAULT 0.3,       -- 経験年数の重み
  custom_weight DECIMAL(3,2) DEFAULT 0.3,          -- 手動調整の重み

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(staff_id, position)
);

-- 7. 必須スタッフ設定
CREATE TABLE IF NOT EXISTS required_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_required_assignments_date ON required_staff_assignments(date);
CREATE INDEX idx_required_assignments_staff ON required_staff_assignments(staff_id);

-- 8. 客室・宴会稼働情報
CREATE TABLE IF NOT EXISTS daily_occupancy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  room_occupancy_rate DECIMAL(5,2) DEFAULT 0,      -- 0-100 (%)
  total_rooms INTEGER DEFAULT 0,
  occupied_rooms INTEGER DEFAULT 0,
  has_banquet BOOLEAN DEFAULT false,
  banquet_guest_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_daily_occupancy_date ON daily_occupancy(date);

-- RLSポリシー設定（セキュリティ）
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_staff_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_work_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_unavailable_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_priority ENABLE ROW LEVEL SECURITY;
ALTER TABLE required_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_occupancy ENABLE ROW LEVEL SECURITY;

-- すべてのテーブルで読み取りを許可（認証済みユーザー）
CREATE POLICY "Allow all for authenticated users" ON time_slots FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON daily_staff_requirements FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON staff_availability FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON staff_work_limits FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON staff_unavailable_dates FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON staff_priority FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON required_staff_assignments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON daily_occupancy FOR ALL USING (true);
