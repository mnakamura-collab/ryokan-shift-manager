import type {
  Staff,
  TimeSlot,
  DailyStaffRequirement,
  DailyOccupancy,
  StaffAvailability,
  StaffWorkLimit,
  StaffUnavailableDate,
  Shift,
} from '../types';
import { generateId } from './helpers';

// シフト生成の結果
export interface ShiftGenerationResult {
  shifts: Shift[];
  warnings: GenerationWarning[];
  statistics: GenerationStatistics;
}

// 警告情報
export interface GenerationWarning {
  date: string;
  timeSlotId: string;
  position: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// 統計情報
export interface GenerationStatistics {
  totalShiftsGenerated: number;
  staffUtilization: { [staffId: string]: number }; // 各スタッフの労働時間
  unfulfilled: number; // 必要人数を満たせなかった時間帯数
}

// 調整後の必要人数を計算
export function calculateAdjustedRequirement(
  baseRequirement: DailyStaffRequirement,
  occupancy: DailyOccupancy | null
): number {
  let adjusted = baseRequirement.requiredCount;

  if (occupancy) {
    // 稼働率ボーナス（10%ごと）
    if (baseRequirement.roomOccupancyBonus) {
      const occupancyTier = Math.floor(occupancy.roomOccupancyRate / 10);
      adjusted += baseRequirement.roomOccupancyBonus * occupancyTier;
    }

    // 宴会ボーナス
    if (occupancy.hasBanquet && baseRequirement.banquetBonus) {
      adjusted += baseRequirement.banquetBonus;
    }
  }

  return Math.max(0, adjusted);
}

// スタッフが指定日時に勤務可能かチェック
export function isStaffAvailable(
  staff: Staff,
  date: string,
  timeSlot: TimeSlot,
  availability: StaffAvailability[],
  unavailableDates: StaffUnavailableDate[]
): boolean {
  // スタッフがアクティブでない場合
  if (!staff.isActive) return false;

  // 役職が一致しない場合
  // (この関数は役職でフィルタされた後に呼ばれると仮定)

  // 希望休・不可日チェック
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  const unavailable = unavailableDates.find(
    (u) =>
      u.staffId === staff.id &&
      u.date === date &&
      u.status === 'approved' &&
      (u.unavailableType === 'all_day' ||
        (u.timeSlotIds && u.timeSlotIds.includes(timeSlot.id)))
  );

  if (unavailable) return false;

  // 曜日別勤務可能時間チェック
  const dayAvailability = availability.find(
    (a) => a.staffId === staff.id && a.dayOfWeek === dayOfWeek
  );

  if (!dayAvailability || !dayAvailability.isAvailable) return false;

  // 時間帯が勤務可能時間内かチェック
  if (dayAvailability.availableStartTime && dayAvailability.availableEndTime) {
    const slotStart = timeSlot.startTime;
    const slotEnd = timeSlot.endTime;
    const availStart = dayAvailability.availableStartTime;
    const availEnd = dayAvailability.availableEndTime;

    // 簡易的な時間比較（HH:mm形式を想定）
    if (slotStart < availStart || slotEnd > availEnd) {
      return false;
    }
  }

  return true;
}

// スタッフの週間労働時間を計算
export function calculateWeeklyHours(
  staffId: string,
  targetDate: string,
  existingShifts: Shift[]
): number {
  const target = new Date(targetDate);
  const dayOfWeek = target.getDay();

  // その週の月曜日を取得
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(target);
  monday.setDate(monday.getDate() + mondayOffset);

  // その週の日曜日を取得
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  // その週のシフトをフィルタ
  const weekShifts = existingShifts.filter(
    (s) => s.staffId === staffId && s.date >= mondayStr && s.date <= sundayStr
  );

  // 労働時間を合計
  let totalHours = 0;
  for (const shift of weekShifts) {
    const hours = calculateShiftDuration(shift.startTime, shift.endTime);
    totalHours += hours;
  }

  return totalHours;
}

// スタッフの月間労働時間を計算
export function calculateMonthlyHours(
  staffId: string,
  targetDate: string,
  existingShifts: Shift[]
): number {
  const target = new Date(targetDate);
  const year = target.getFullYear();
  const month = target.getMonth();

  // 月初と月末
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // その月のシフトをフィルタ
  const monthShifts = existingShifts.filter(
    (s) => s.staffId === staffId && s.date >= monthStart && s.date <= monthEnd
  );

  // 労働時間を合計
  let totalHours = 0;
  for (const shift of monthShifts) {
    const hours = calculateShiftDuration(shift.startTime, shift.endTime);
    totalHours += hours;
  }

  return totalHours;
}

// スタッフの連続勤務日数を計算
export function calculateConsecutiveDays(
  staffId: string,
  targetDate: string,
  existingShifts: Shift[]
): number {
  const target = new Date(targetDate);
  let consecutiveDays = 0;

  // 対象日の前日から遡って連続勤務日数をカウント
  for (let i = 1; i <= 30; i++) {
    const checkDate = new Date(target);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const hasShift = existingShifts.some(
      (s) => s.staffId === staffId && s.date === checkDateStr
    );

    if (hasShift) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}

// シフトの労働時間を計算（時間）
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let duration = (endHour - startHour) + (endMin - startMin) / 60;

  // 終了時刻が開始時刻より前の場合（日をまたぐ）
  if (duration < 0) {
    duration += 24;
  }

  return duration;
}

// 労働時間制約をチェック
export function checkWorkLimitConstraints(
  staffId: string,
  targetDate: string,
  timeSlot: TimeSlot,
  workLimit: StaffWorkLimit | undefined,
  existingShifts: Shift[]
): { allowed: boolean; reason?: string } {
  if (!workLimit) return { allowed: true };

  const shiftDuration = calculateShiftDuration(timeSlot.startTime, timeSlot.endTime);

  // 週の労働時間チェック
  const weeklyHours = calculateWeeklyHours(staffId, targetDate, existingShifts);
  if (weeklyHours + shiftDuration > workLimit.maxHoursPerWeek) {
    return {
      allowed: false,
      reason: `週の労働時間上限超過 (${weeklyHours.toFixed(1)}h + ${shiftDuration.toFixed(1)}h > ${workLimit.maxHoursPerWeek}h)`,
    };
  }

  // 月の労働時間チェック
  const monthlyHours = calculateMonthlyHours(staffId, targetDate, existingShifts);
  if (monthlyHours + shiftDuration > workLimit.maxHoursPerMonth) {
    return {
      allowed: false,
      reason: `月の労働時間上限超過 (${monthlyHours.toFixed(1)}h + ${shiftDuration.toFixed(1)}h > ${workLimit.maxHoursPerMonth}h)`,
    };
  }

  // 連続勤務日数チェック
  const consecutiveDays = calculateConsecutiveDays(staffId, targetDate, existingShifts);
  if (consecutiveDays >= workLimit.maxConsecutiveDays) {
    return {
      allowed: false,
      reason: `連続勤務日数上限到達 (${consecutiveDays}日 >= ${workLimit.maxConsecutiveDays}日)`,
    };
  }

  return { allowed: true };
}

// スタッフを優先度順にソート
export function sortStaffByPriority(
  staff: Staff[],
  targetDate: string,
  existingShifts: Shift[]
): Staff[] {
  return [...staff].sort((a, b) => {
    // 1. 信頼度スコアが高い順
    if (a.trustScore !== b.trustScore) {
      return b.trustScore - a.trustScore;
    }

    // 2. その月の労働時間が少ない順（公平性）
    const aMonthlyHours = calculateMonthlyHours(a.id, targetDate, existingShifts);
    const bMonthlyHours = calculateMonthlyHours(b.id, targetDate, existingShifts);
    if (aMonthlyHours !== bMonthlyHours) {
      return aMonthlyHours - bMonthlyHours;
    }

    // 3. IDでソート（安定ソート）
    return a.id.localeCompare(b.id);
  });
}

// シフトを生成
export function generateShift(
  staff: Staff,
  date: string,
  timeSlot: TimeSlot,
  position: string
): Shift {
  return {
    id: generateId(),
    staffId: staff.id,
    date,
    position,
    startTime: timeSlot.startTime,
    endTime: timeSlot.endTime,
    isStandard: false,
    isConfirmed: false,
    isCompleted: false,
  };
}

// 自動シフト生成のメイン関数
export async function generateAutoShifts(params: {
  startDate: string;
  endDate: string;
  staff: Staff[];
  timeSlots: TimeSlot[];
  requirements: DailyStaffRequirement[];
  occupancies: DailyOccupancy[];
  availabilities: StaffAvailability[];
  workLimits: StaffWorkLimit[];
  unavailableDates: StaffUnavailableDate[];
  existingShifts: Shift[];
}): Promise<ShiftGenerationResult> {
  const {
    startDate,
    endDate,
    staff,
    timeSlots,
    requirements,
    occupancies,
    availabilities,
    workLimits,
    unavailableDates,
    existingShifts,
  } = params;

  const generatedShifts: Shift[] = [];
  const warnings: GenerationWarning[] = [];
  const statistics: GenerationStatistics = {
    totalShiftsGenerated: 0,
    staffUtilization: {},
    unfulfilled: 0,
  };

  // 日付範囲をループ
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    // その日の稼働状況を取得
    const occupancy = occupancies.find((o) => o.date === dateStr) || null;

    // 各時間帯をループ
    for (const timeSlot of timeSlots) {
      // その時間帯の必要人数設定を取得
      const timeSlotRequirements = requirements.filter(
        (r) => r.date === dateStr && r.timeSlotId === timeSlot.id
      );

      // 役職ごとに処理
      for (const req of timeSlotRequirements) {
        const adjustedCount = calculateAdjustedRequirement(req, occupancy);

        if (adjustedCount === 0) continue;

        // その役職のスタッフを抽出
        const positionStaff = staff.filter((s) => s.position === req.position);

        // 利用可能なスタッフをフィルタ
        const availableStaff = positionStaff.filter((s) =>
          isStaffAvailable(s, dateStr, timeSlot, availabilities, unavailableDates)
        );

        // 労働時間制約を満たすスタッフをさらにフィルタ
        const eligibleStaff = availableStaff.filter((s) => {
          const workLimit = workLimits.find((w) => w.staffId === s.id);
          const allShifts = [...existingShifts, ...generatedShifts];
          const check = checkWorkLimitConstraints(
            s.id,
            dateStr,
            timeSlot,
            workLimit,
            allShifts
          );
          return check.allowed;
        });

        // 優先度順にソート
        const sortedStaff = sortStaffByPriority(
          eligibleStaff,
          dateStr,
          [...existingShifts, ...generatedShifts]
        );

        // 必要人数分アサイン
        const assignedCount = Math.min(adjustedCount, sortedStaff.length);

        for (let i = 0; i < assignedCount; i++) {
          const assignedStaff = sortedStaff[i];
          const shift = generateShift(assignedStaff, dateStr, timeSlot, req.position);
          generatedShifts.push(shift);
          statistics.totalShiftsGenerated++;

          // スタッフ利用率を記録
          if (!statistics.staffUtilization[assignedStaff.id]) {
            statistics.staffUtilization[assignedStaff.id] = 0;
          }
          const duration = calculateShiftDuration(timeSlot.startTime, timeSlot.endTime);
          statistics.staffUtilization[assignedStaff.id] += duration;
        }

        // 必要人数を満たせなかった場合は警告
        if (assignedCount < adjustedCount) {
          statistics.unfulfilled++;
          warnings.push({
            date: dateStr,
            timeSlotId: timeSlot.id,
            position: req.position,
            message: `必要${adjustedCount}人に対して${assignedCount}人のみアサイン可能（${adjustedCount - assignedCount}人不足）`,
            severity: assignedCount === 0 ? 'error' : 'warning',
          });
        }
      }
    }

    // 次の日へ
    current.setDate(current.getDate() + 1);
  }

  return {
    shifts: generatedShifts,
    warnings,
    statistics,
  };
}
