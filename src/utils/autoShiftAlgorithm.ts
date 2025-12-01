import type {
  Staff,
  Shift,
  TimeSlot,
  DailyStaffRequirement,
  StaffAvailability,
  StaffWorkLimit,
  StaffUnavailableDate,
  DailyOccupancy,
} from '../types';
import { addDays, parseISO, format, getDay, differenceInDays } from 'date-fns';

// ========================================
// 型定義
// ========================================

// 不足箇所レポート
export interface ShortageReport {
  date: string;
  timeSlotId: string;
  timeSlotName: string;
  position: string;
  requiredCount: number;
  assignedCount: number;
  shortageCount: number;
}

// 生成結果
export interface GenerationResult {
  success: boolean;
  shifts: Shift[];
  shortages: ShortageReport[];
  message: string;
}

// スタッフの累積労働情報
interface StaffWorkAccumulator {
  weeklyHours: Map<string, number>; // staffId -> 週の累積時間
  monthlyHours: Map<string, number>; // staffId -> 月の累積時間
  consecutiveDays: Map<string, number>; // staffId -> 連続勤務日数
  lastWorkDate: Map<string, string | null>; // staffId -> 最後の勤務日
  dailyAssignments: Map<string, Set<string>>; // staffId -> Set<date> その日に割り当て済み
}

// ========================================
// ヘルパー関数
// ========================================

// 時間帯の長さを計算（時間単位）
function getTimeSlotDuration(timeSlot: TimeSlot): number {
  const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
  const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) / 60;
}

// 週の開始日を取得（日曜日）
function getWeekStart(date: Date): string {
  const dayOfWeek = getDay(date);
  const weekStart = addDays(date, -dayOfWeek);
  return format(weekStart, 'yyyy-MM-dd');
}

// ========================================
// 制約チェック関数
// ========================================

// 希望休チェック
function isUnavailable(
  staffId: string,
  date: string,
  timeSlotId: string,
  unavailableDates: StaffUnavailableDate[]
): boolean {
  const unavailable = unavailableDates.filter(
    (u) => u.staffId === staffId && u.date === date && u.status === 'approved'
  );

  for (const u of unavailable) {
    if (u.unavailableType === 'all_day') {
      return true;
    }
    if (u.unavailableType === 'time_slot' && u.timeSlotIds?.includes(timeSlotId)) {
      return true;
    }
  }
  return false;
}

// 勤務可能時間チェック
function isWithinAvailableHours(
  staffId: string,
  date: string,
  timeSlot: TimeSlot,
  availabilities: StaffAvailability[]
): boolean {
  const dayOfWeek = getDay(parseISO(date));
  const availability = availabilities.find(
    (a) => a.staffId === staffId && a.dayOfWeek === dayOfWeek
  );

  if (!availability || !availability.isAvailable) {
    return false;
  }

  if (!availability.availableStartTime || !availability.availableEndTime) {
    return true; // 時間指定なし = 終日可能
  }

  // 時間帯が勤務可能時間内かチェック
  const availStart = availability.availableStartTime;
  const availEnd = availability.availableEndTime;
  const slotStart = timeSlot.startTime;
  const slotEnd = timeSlot.endTime;

  return slotStart >= availStart && slotEnd <= availEnd;
}

// 週の労働時間上限チェック
function isWithinWeeklyLimit(
  staffId: string,
  date: string,
  duration: number,
  workLimit: StaffWorkLimit | undefined,
  accumulator: StaffWorkAccumulator
): boolean {
  if (!workLimit) return true;

  const weekStart = getWeekStart(parseISO(date));
  const currentWeeklyHours = accumulator.weeklyHours.get(`${staffId}-${weekStart}`) || 0;
  return currentWeeklyHours + duration <= workLimit.maxHoursPerWeek;
}

// 月の労働時間上限チェック
function isWithinMonthlyLimit(
  staffId: string,
  duration: number,
  workLimit: StaffWorkLimit | undefined,
  accumulator: StaffWorkAccumulator
): boolean {
  if (!workLimit) return true;

  const currentMonthlyHours = accumulator.monthlyHours.get(staffId) || 0;
  return currentMonthlyHours + duration <= workLimit.maxHoursPerMonth;
}

// 連続勤務日数上限チェック
function isWithinConsecutiveDaysLimit(
  staffId: string,
  date: string,
  workLimit: StaffWorkLimit | undefined,
  accumulator: StaffWorkAccumulator
): boolean {
  if (!workLimit) return true;

  const lastDate = accumulator.lastWorkDate.get(staffId);
  if (!lastDate) return true; // 初回の割り当て

  const currentConsecutiveDays = accumulator.consecutiveDays.get(staffId) || 0;
  const daysDiff = differenceInDays(parseISO(date), parseISO(lastDate));

  // 1日空いている場合は連続勤務がリセット
  if (daysDiff > 1) {
    return true;
  }

  // 連続している場合はカウントをチェック
  return currentConsecutiveDays < workLimit.maxConsecutiveDays;
}

// 同日複数時間帯チェック
function isAlreadyAssignedToday(
  staffId: string,
  date: string,
  accumulator: StaffWorkAccumulator
): boolean {
  const assignments = accumulator.dailyAssignments.get(staffId);
  return assignments ? assignments.has(date) : false;
}

// 全ての制約をチェック
function canAssign(
  staff: Staff,
  date: string,
  timeSlot: TimeSlot,
  position: string,
  availabilities: StaffAvailability[],
  workLimits: Map<string, StaffWorkLimit>,
  unavailableDates: StaffUnavailableDate[],
  accumulator: StaffWorkAccumulator
): boolean {
  // 役職が一致するか
  if (staff.position !== position) {
    return false;
  }

  // 希望休チェック
  if (isUnavailable(staff.id, date, timeSlot.id, unavailableDates)) {
    return false;
  }

  // 勤務可能時間チェック
  if (!isWithinAvailableHours(staff.id, date, timeSlot, availabilities)) {
    return false;
  }

  // 同日複数時間帯チェック
  if (isAlreadyAssignedToday(staff.id, date, accumulator)) {
    return false;
  }

  const duration = getTimeSlotDuration(timeSlot);
  const workLimit = workLimits.get(staff.id);

  // 週の労働時間上限チェック
  if (!isWithinWeeklyLimit(staff.id, date, duration, workLimit, accumulator)) {
    return false;
  }

  // 月の労働時間上限チェック
  if (!isWithinMonthlyLimit(staff.id, duration, workLimit, accumulator)) {
    return false;
  }

  // 連続勤務日数上限チェック
  if (!isWithinConsecutiveDaysLimit(staff.id, date, workLimit, accumulator)) {
    return false;
  }

  return true;
}

// ========================================
// 優先度計算関数
// ========================================

interface StaffPriorityScore {
  staff: Staff;
  score: number;
  skillMatch: number; // スキル適合度
  consecutiveDays: number; // 連続勤務日数
  monthlyHours: number; // 月の累積労働時間
}

function calculatePriority(
  staff: Staff,
  position: string,
  accumulator: StaffWorkAccumulator
): StaffPriorityScore {
  // 1. スキル適合度（役職が一致している前提なので100）
  const skillMatch = staff.position === position ? 100 : 0;

  // 2. 連続勤務日数（少ないほど優先）
  const consecutiveDays = accumulator.consecutiveDays.get(staff.id) || 0;
  const consecutiveScore = Math.max(0, 100 - consecutiveDays * 20);

  // 3. 月の累積労働時間（少ないほど優先）
  const monthlyHours = accumulator.monthlyHours.get(staff.id) || 0;
  const monthlyScore = Math.max(0, 100 - monthlyHours / 2);

  // 優先度計算: スキル適合度 → 連続勤務回避 → 月の累積労働時間
  // スキル適合度を最優先（重み1000）、連続勤務回避（重み100）、累積時間（重み1）
  const score = skillMatch * 1000 + consecutiveScore * 100 + monthlyScore;

  return {
    staff,
    score,
    skillMatch,
    consecutiveDays,
    monthlyHours,
  };
}

// ========================================
// 累積情報の更新
// ========================================

function updateAccumulator(
  staffId: string,
  date: string,
  duration: number,
  accumulator: StaffWorkAccumulator
): void {
  // 週の労働時間を更新
  const weekStart = getWeekStart(parseISO(date));
  const weekKey = `${staffId}-${weekStart}`;
  const currentWeeklyHours = accumulator.weeklyHours.get(weekKey) || 0;
  accumulator.weeklyHours.set(weekKey, currentWeeklyHours + duration);

  // 月の労働時間を更新
  const currentMonthlyHours = accumulator.monthlyHours.get(staffId) || 0;
  accumulator.monthlyHours.set(staffId, currentMonthlyHours + duration);

  // 連続勤務日数を更新
  const lastDate = accumulator.lastWorkDate.get(staffId);
  if (lastDate) {
    const daysDiff = differenceInDays(parseISO(date), parseISO(lastDate));
    if (daysDiff === 1) {
      // 連続している
      const currentConsecutive = accumulator.consecutiveDays.get(staffId) || 0;
      accumulator.consecutiveDays.set(staffId, currentConsecutive + 1);
    } else {
      // 連続がリセット
      accumulator.consecutiveDays.set(staffId, 1);
    }
  } else {
    // 初回
    accumulator.consecutiveDays.set(staffId, 1);
  }
  accumulator.lastWorkDate.set(staffId, date);

  // その日に割り当て済みとしてマーク
  if (!accumulator.dailyAssignments.has(staffId)) {
    accumulator.dailyAssignments.set(staffId, new Set());
  }
  accumulator.dailyAssignments.get(staffId)!.add(date);
}

// ========================================
// メイン生成関数
// ========================================

export async function generateMonthlyShift(
  year: number,
  month: number, // 1-12
  staff: Staff[],
  timeSlots: TimeSlot[],
  requirements: DailyStaffRequirement[],
  availabilities: StaffAvailability[],
  workLimits: StaffWorkLimit[],
  unavailableDates: StaffUnavailableDate[],
  occupancies: DailyOccupancy[]
): Promise<GenerationResult> {
  const shifts: Shift[] = [];
  const shortages: ShortageReport[] = [];

  // 累積情報の初期化
  const accumulator: StaffWorkAccumulator = {
    weeklyHours: new Map(),
    monthlyHours: new Map(),
    consecutiveDays: new Map(),
    lastWorkDate: new Map(),
    dailyAssignments: new Map(),
  };

  // workLimitsをMapに変換
  const workLimitsMap = new Map<string, StaffWorkLimit>();
  workLimits.forEach((wl) => workLimitsMap.set(wl.staffId, wl));

  // アクティブなスタッフのみ
  const activeStaff = staff.filter((s) => s.isActive);

  // アクティブな時間帯のみ（表示順でソート）
  const activeTimeSlots = timeSlots
    .filter((ts) => ts.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // 月の開始日と終了日を取得
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // 日付順・時間帯順でループ
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const dateStr = format(d, 'yyyy-MM-dd');

    for (const timeSlot of activeTimeSlots) {
      // この日・時間帯の必要人数を取得
      const dayRequirements = requirements.filter(
        (r) => r.date === dateStr && r.timeSlotId === timeSlot.id
      );

      for (const req of dayRequirements) {
        let requiredCount = req.requiredCount;

        // 稼働率による変動を計算
        if (req.roomOccupancyBonus || req.banquetBonus) {
          const occupancy = occupancies.find((o) => o.date === dateStr);
          if (occupancy) {
            if (req.roomOccupancyBonus) {
              const occupancyBonus = Math.floor(occupancy.roomOccupancyRate / 10) * (req.roomOccupancyBonus || 0);
              requiredCount += occupancyBonus;
            }
            if (req.banquetBonus && occupancy.hasBanquet) {
              requiredCount += req.banquetBonus;
            }
          }
        }

        // 割り当て可能なスタッフを抽出
        const candidates = activeStaff.filter((s) =>
          canAssign(
            s,
            dateStr,
            timeSlot,
            req.position,
            availabilities,
            workLimitsMap,
            unavailableDates,
            accumulator
          )
        );

        // 優先度でソート
        const prioritized = candidates
          .map((s) => calculatePriority(s, req.position, accumulator))
          .sort((a, b) => b.score - a.score);

        // 必要人数分を割り当て
        const assignedCount = Math.min(requiredCount, prioritized.length);

        for (let i = 0; i < assignedCount; i++) {
          const selected = prioritized[i].staff;
          const duration = getTimeSlotDuration(timeSlot);

          // シフトを作成
          shifts.push({
            id: `${selected.id}-${dateStr}-${timeSlot.id}`,
            staffId: selected.id,
            date: dateStr,
            position: req.position,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            isStandard: false,
            isConfirmed: false,
            isCompleted: false,
          });

          // 累積情報を更新
          updateAccumulator(selected.id, dateStr, duration, accumulator);
        }

        // 不足がある場合はレポートに追加
        if (assignedCount < requiredCount) {
          shortages.push({
            date: dateStr,
            timeSlotId: timeSlot.id,
            timeSlotName: timeSlot.name,
            position: req.position,
            requiredCount,
            assignedCount,
            shortageCount: requiredCount - assignedCount,
          });
        }
      }
    }
  }

  const success = shortages.length === 0;
  const message = success
    ? `${year}年${month}月のシフトを正常に生成しました。`
    : `${year}年${month}月のシフトを生成しましたが、${shortages.length}件の不足があります。`;

  return {
    success,
    shifts,
    shortages,
    message,
  };
}
