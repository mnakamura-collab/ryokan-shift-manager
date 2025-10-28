import type { Shift, Staff, ShiftChangeHistory } from '../types';

// UUIDの生成
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 日付フォーマット（YYYY-MM-DD）
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日付の表示用フォーマット（YYYY年MM月DD日）
export function formatDateJP(date: string): string {
  const [year, month, day] = date.split('-');
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

// 曜日を取得
export function getDayOfWeek(date: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const d = new Date(date);
  return days[d.getDay()];
}

// 今日の日付（YYYY-MM-DD）
export function getToday(): string {
  return formatDate(new Date());
}

// 時間フォーマット（HH:mm）
export function formatTime(hour: number, minute: number = 0): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// 勤務時間を計算（時間単位）
export function calculateWorkHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return (endMinutes - startMinutes) / 60;
}

// 信頼度スコアを計算
export function calculateTrustScore(
  baseScore: number,
  history: ShiftChangeHistory[]
): number {
  let score = baseScore;

  history.forEach((h) => {
    score -= h.penaltyScore;
  });

  // 0-100の範囲に収める
  return Math.max(0, Math.min(100, score));
}

// シフト変更のペナルティを計算
export function calculatePenalty(daysBefore: number): number {
  if (daysBefore >= 7) return 0; // 1週間以上前: ペナルティなし
  if (daysBefore >= 3) return 2; // 3-6日前: 小ペナルティ
  if (daysBefore >= 1) return 5; // 1-2日前: 中ペナルティ
  return 10; // 当日: 大ペナルティ
}

// 日付までの日数を計算
export function daysUntil(targetDate: string): number {
  const today = new Date(getToday());
  const target = new Date(targetDate);
  const diff = target.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// 月の日数を取得
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 月の最初の日を取得（YYYY-MM-DD）
export function getFirstDayOfMonth(year: number, month: number): string {
  return formatDate(new Date(year, month - 1, 1));
}

// 月の最後の日を取得（YYYY-MM-DD）
export function getLastDayOfMonth(year: number, month: number): string {
  return formatDate(new Date(year, month, 0));
}

// スタッフ名を取得（IDから）
export function getStaffName(staffId: string, staffList: Staff[]): string {
  const staff = staffList.find((s) => s.id === staffId);
  return staff ? staff.name : '不明';
}

// シフトの重複チェック
export function hasShiftConflict(
  newShift: Omit<Shift, 'id'>,
  existingShifts: Shift[]
): boolean {
  return existingShifts.some((shift) => {
    if (shift.staffId !== newShift.staffId || shift.date !== newShift.date) {
      return false;
    }

    // 時間が重複しているかチェック
    const newStart = parseTime(newShift.startTime);
    const newEnd = parseTime(newShift.endTime);
    const existStart = parseTime(shift.startTime);
    const existEnd = parseTime(shift.endTime);

    return (
      (newStart >= existStart && newStart < existEnd) ||
      (newEnd > existStart && newEnd <= existEnd) ||
      (newStart <= existStart && newEnd >= existEnd)
    );
  });
}

// 時間を分に変換
function parseTime(time: string): number {
  const [hour, min] = time.split(':').map(Number);
  return hour * 60 + min;
}

// 色の選択（役職別）
export function getPositionColor(position: string): string {
  const colors: { [key: string]: string } = {
    フロント: 'bg-blue-100 text-blue-800 border-blue-300',
    清掃: 'bg-green-100 text-green-800 border-green-300',
    レストラン: 'bg-purple-100 text-purple-800 border-purple-300',
    配膳: 'bg-pink-100 text-pink-800 border-pink-300',
    喫茶店: 'bg-amber-100 text-amber-800 border-amber-300',
    調理: 'bg-red-100 text-red-800 border-red-300',
    その他: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  return colors[position] || colors['その他'];
}

// 信頼度スコアの色
export function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}
