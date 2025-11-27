// 役職の種類（動的に管理）
export type Position = string;

// 役職マスタ
export interface PositionMaster {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  baseRequiredCount: number; // 標準的な1日の必要人数
  guestCountRatio: number; // 予約客数による変動率（例: 0.1 = 客10人につき+1人）
}

// ユーザーロール
export type UserRole = 'admin' | 'user';

// スタッフ情報
export interface Staff {
  id: string;
  name: string;
  position: Position;
  trustScore: number; // 信頼度スコア（0-100）
  role: UserRole;
  isActive: boolean;
  loginId: string; // ログインID（後方互換性のため保持、emailと同じ値）
  passwordHash: string; // パスワード（ハッシュ化）
  email: string; // メールアドレス（ログインIDとして使用）
  is2faEnabled: boolean; // 二段階認証が有効かどうか
  otpSecret?: string; // ワンタイムパスワード
  otpExpiresAt?: string; // OTPの有効期限
}

// シフト時間帯
export interface ShiftTime {
  startTime: string; // HH:mm形式
  endTime: string;   // HH:mm形式
}

// シフト情報
export interface Shift {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD形式
  position: Position;
  startTime: string;
  endTime: string;
  isStandard?: boolean; // 標準シフトかどうか
  isConfirmed?: boolean; // 確定しているか
  isCompleted?: boolean; // 完了しているか
  lastModified?: Date; // 最終変更日時
}

// 標準シフトパターン
export interface StandardShift {
  id: string;
  name: string; // パターン名（例: "平日フロント早番"）
  position: Position;
  dayOfWeek: number; // 0-6 (日曜-土曜)
  startTime: string;
  endTime: string;
}

// 予約情報
export interface Reservation {
  id: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  plan: string;
  requiredStaff: number;
  review?: ReservationReview; // レビュー情報
}

// 予約レビュー
export interface ReservationReview {
  staffingLevel: 'insufficient' | 'adequate' | 'excessive'; // 人員配置: 不足 | 適正 | 過剰
  actualStaffCount: number; // 実際のスタッフ数
  reviewDate: string; // レビュー日時
  notes?: string; // メモ
}

// シフト変更履歴
export interface ShiftChangeHistory {
  id: string;
  shiftId: string;
  staffId: string;
  changeType: 'created' | 'modified' | 'cancelled';
  changedAt: string;
  daysBefore: number; // 何日前の変更か
  penaltyScore: number; // ペナルティスコア（直前変更ほど高い）
}

// 当日シフトサマリー
export interface TodayShiftSummary {
  date: string;
  shifts: Shift[];
  staffList: Staff[];
  reservations: Reservation[];
  warnings: string[]; // 人手不足などの警告
}

// プラン別必要人数設定
export interface PlanStaffRequirement {
  planType: string;
  baseStaff: number; // 基本人数
  perGuest: number; // 予約者X人あたり+1人
  positions: {
    [key in Position]?: number; // 各役職の最低必要人数
  };
}

// スタッフごとの標準シフト設定
export interface StaffStandardSchedule {
  id: string;
  staffId: string;
  hoursPerDay: number; // 1日あたりの勤務時間
  daysPerWeek: number; // 週あたりの勤務日数
  preferredStartTime: string; // 希望開始時刻 (HH:mm)
  preferredDaysOfWeek: number[]; // 希望勤務曜日 (0-6の配列)
  isActive: boolean; // 有効/無効
}

// ========================================
// 自動シフト管理機能の型定義
// ========================================

// 時間帯マスタ
export interface TimeSlot {
  id: string;
  name: string;                // '早朝', '午前', etc.
  startTime: string;           // '05:00'
  endTime: string;             // '09:00'
  displayOrder: number;
  isActive: boolean;
}

// 役職別必要人数設定（日別・時間帯別）
export interface DailyStaffRequirement {
  id: string;
  date: string;                    // 'YYYY-MM-DD'
  position: Position;
  timeSlotId: string;
  requiredCount: number;           // 基本必要人数

  // 稼働率による変動設定
  roomOccupancyBonus?: number;     // 客室稼働率10%ごとに+X人
  banquetBonus?: number;           // 宴会ありなら+X人
}

// スタッフの勤務可能時間（曜日別）
export interface StaffAvailability {
  id: string;
  staffId: string;
  dayOfWeek: number;               // 0-6 (日曜-土曜)
  isAvailable: boolean;
  availableStartTime?: string;     // '09:00'
  availableEndTime?: string;       // '17:00'
  lastModified: string;            // 最終変更日時
}

// スタッフの労働時間制約
export interface StaffWorkLimit {
  id: string;
  staffId: string;
  maxHoursPerWeek: number;         // 週40時間など
  maxHoursPerMonth: number;        // 月160時間など
  maxConsecutiveDays: number;      // 連続5日まで
}

// 希望休・不可日設定
export interface StaffUnavailableDate {
  id: string;
  staffId: string;
  date: string;                    // 'YYYY-MM-DD'
  unavailableType: 'all_day' | 'time_slot';
  timeSlotIds?: string[];          // 時間帯指定の場合
  reason?: string;                 // '希望休', '有給', etc.
  status: 'pending' | 'approved' | 'rejected';
}

// スタッフアサイン優先度設定
export interface StaffPriority {
  id: string;
  staffId: string;
  position: Position;
  priorityScore: number;           // 0-100, 高いほど優先

  // 複数基準の重み設定
  trustScoreWeight: number;        // 信頼度の重み
  seniorityWeight: number;         // 経験年数の重み
  customWeight: number;            // 手動調整の重み
}

// 必須スタッフ設定
export interface RequiredStaffAssignment {
  id: string;
  date: string;                    // 'YYYY-MM-DD'
  timeSlotId: string;
  position: Position;
  staffId: string;
  reason?: string;
}

// 客室・宴会稼働情報
export interface DailyOccupancy {
  id: string;
  date: string;                    // 'YYYY-MM-DD'
  roomOccupancyRate: number;       // 0-100 (%)
  totalRooms: number;
  occupiedRooms: number;
  hasBanquet: boolean;
  banquetGuestCount?: number;
}
