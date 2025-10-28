// 役職の種類（動的に管理）
export type Position = string;

// 役職マスタ
export interface PositionMaster {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

// ユーザーロール
export type UserRole = 'admin' | 'staff';

// スタッフ情報
export interface Staff {
  id: string;
  name: string;
  position: Position;
  trustScore: number; // 信頼度スコア（0-100）
  role: UserRole;
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
  isStandard: boolean; // 標準シフトかどうか
  isConfirmed: boolean; // 確定しているか
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
  changedAt: Date;
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
