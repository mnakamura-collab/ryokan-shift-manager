import type {
  Staff,
  Shift,
  StandardShift,
  Reservation,
  ShiftChangeHistory,
  PlanStaffRequirement,
  StaffStandardSchedule,
  PositionMaster,
} from '../types';

const STORAGE_KEYS = {
  STAFF: 'ryokan_staff',
  SHIFTS: 'ryokan_shifts',
  STANDARD_SHIFTS: 'ryokan_standard_shifts',
  RESERVATIONS: 'ryokan_reservations',
  HISTORY: 'ryokan_shift_history',
  PLAN_REQUIREMENTS: 'ryokan_plan_requirements',
  STAFF_SCHEDULES: 'ryokan_staff_schedules',
  POSITIONS: 'ryokan_positions',
  CURRENT_USER: 'ryokan_current_user',
};

// LocalStorageからデータを取得
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

// LocalStorageにデータを保存
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

// スタッフ管理
export const staffStorage = {
  getAll: (): Staff[] => getFromStorage(STORAGE_KEYS.STAFF, []),
  save: (staff: Staff[]): void => saveToStorage(STORAGE_KEYS.STAFF, staff),
  add: (staff: Staff): void => {
    const all = staffStorage.getAll();
    staffStorage.save([...all, staff]);
  },
  update: (id: string, updates: Partial<Staff>): void => {
    const all = staffStorage.getAll();
    const updated = all.map((s) => (s.id === id ? { ...s, ...updates } : s));
    staffStorage.save(updated);
  },
  delete: (id: string): void => {
    const all = staffStorage.getAll();
    staffStorage.save(all.filter((s) => s.id !== id));
  },
  getById: (id: string): Staff | undefined => {
    return staffStorage.getAll().find((s) => s.id === id);
  },
};

// 信頼度スコアを調整するヘルパー関数
function adjustStaffTrustScore(staffId: string, change: number): void {
  const staff = staffStorage.getAll();
  const index = staff.findIndex((s) => s.id === staffId);
  if (index !== -1) {
    const newScore = Math.max(0, Math.min(100, staff[index].trustScore + change));
    staff[index].trustScore = newScore;
    staffStorage.save(staff);
  }
}

// 日数に基づくペナルティ計算
function calculatePenaltyForDays(daysBefore: number): number {
  if (daysBefore >= 7) return 0; // 1週間以上前: ペナルティなし
  if (daysBefore >= 3) return 2; // 3-6日前: 小さいペナルティ
  if (daysBefore >= 1) return 5; // 1-2日前: 中程度のペナルティ
  return 10; // 当日: 大きいペナルティ
}

// シフト管理
export const shiftStorage = {
  getAll: (): Shift[] => getFromStorage(STORAGE_KEYS.SHIFTS, []),
  save: (shifts: Shift[]): void => saveToStorage(STORAGE_KEYS.SHIFTS, shifts),
  add: (shift: Shift): void => {
    const all = shiftStorage.getAll();
    shiftStorage.save([...all, shift]);
  },
  update: (id: string, updates: Partial<Shift>): void => {
    const all = shiftStorage.getAll();
    const index = all.findIndex((s) => s.id === id);

    if (index !== -1) {
      const oldShift = all[index];
      const isStaffChanged = updates.staffId && updates.staffId !== oldShift.staffId;

      // スタッフが変更された場合、信頼度を調整
      if (isStaffChanged && oldShift.date && !oldShift.isStandard) {
        const shiftDate = new Date(oldShift.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // 元のスタッフの信頼度を下げる
        if (oldShift.staffId) {
          const penalty = calculatePenaltyForDays(daysDiff);
          adjustStaffTrustScore(oldShift.staffId, -penalty);
        }

        // 変更履歴を記録
        const historyEntry: ShiftChangeHistory = {
          id: `history_${Date.now()}`,
          shiftId: id,
          staffId: oldShift.staffId,
          changeType: 'modified',
          changedAt: new Date().toISOString(),
          daysBefore: daysDiff,
          penaltyScore: calculatePenaltyForDays(daysDiff),
        };
        historyStorage.add(historyEntry);
      }

      const updated = all.map((s) => (s.id === id ? { ...s, ...updates } : s));
      shiftStorage.save(updated);
    }
  },
  delete: (id: string): void => {
    const all = shiftStorage.getAll();
    const shift = all.find((s) => s.id === id);

    // シフト削除時も信頼度を調整（標準シフトは除く）
    if (shift && shift.staffId && shift.date && !shift.isStandard) {
      const shiftDate = new Date(shift.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const penalty = calculatePenaltyForDays(daysDiff);
      if (penalty > 0) {
        adjustStaffTrustScore(shift.staffId, -penalty);

        // 変更履歴を記録
        const historyEntry: ShiftChangeHistory = {
          id: `history_${Date.now()}`,
          shiftId: id,
          staffId: shift.staffId,
          changeType: 'cancelled',
          changedAt: new Date().toISOString(),
          daysBefore: daysDiff,
          penaltyScore: penalty,
        };
        historyStorage.add(historyEntry);
      }
    }

    shiftStorage.save(all.filter((s) => s.id !== id));
  },
  remove: (id: string): void => {
    shiftStorage.delete(id);
  },
  getByDate: (date: string): Shift[] => {
    return shiftStorage.getAll().filter((s) => s.date === date);
  },
  getByStaff: (staffId: string): Shift[] => {
    return shiftStorage.getAll().filter((s) => s.staffId === staffId);
  },
  getByDateRange: (startDate: string, endDate: string): Shift[] => {
    return shiftStorage.getAll().filter((s) => s.date >= startDate && s.date <= endDate);
  },
};

// 標準シフト管理
export const standardShiftStorage = {
  getAll: (): StandardShift[] => getFromStorage(STORAGE_KEYS.STANDARD_SHIFTS, []),
  save: (shifts: StandardShift[]): void => saveToStorage(STORAGE_KEYS.STANDARD_SHIFTS, shifts),
  add: (shift: StandardShift): void => {
    const all = standardShiftStorage.getAll();
    standardShiftStorage.save([...all, shift]);
  },
  update: (id: string, updates: Partial<StandardShift>): void => {
    const all = standardShiftStorage.getAll();
    const updated = all.map((s) => (s.id === id ? { ...s, ...updates } : s));
    standardShiftStorage.save(updated);
  },
  delete: (id: string): void => {
    const all = standardShiftStorage.getAll();
    standardShiftStorage.save(all.filter((s) => s.id !== id));
  },
};

// 予約管理
export const reservationStorage = {
  getAll: (): Reservation[] => getFromStorage(STORAGE_KEYS.RESERVATIONS, []),
  save: (reservations: Reservation[]): void => saveToStorage(STORAGE_KEYS.RESERVATIONS, reservations),
  add: (reservation: Reservation): void => {
    const all = reservationStorage.getAll();
    reservationStorage.save([...all, reservation]);
  },
  update: (id: string, updates: Partial<Reservation>): void => {
    const all = reservationStorage.getAll();
    const updated = all.map((r) => (r.id === id ? { ...r, ...updates } : r));
    reservationStorage.save(updated);
  },
  delete: (id: string): void => {
    const all = reservationStorage.getAll();
    reservationStorage.save(all.filter((r) => r.id !== id));
  },
  getByDate: (date: string): Reservation[] => {
    return reservationStorage.getAll().filter((r) => r.checkInDate === date);
  },
};

// 変更履歴管理
export const historyStorage = {
  getAll: (): ShiftChangeHistory[] => getFromStorage(STORAGE_KEYS.HISTORY, []),
  save: (history: ShiftChangeHistory[]): void => saveToStorage(STORAGE_KEYS.HISTORY, history),
  add: (entry: ShiftChangeHistory): void => {
    const all = historyStorage.getAll();
    historyStorage.save([...all, entry]);
  },
  getByStaff: (staffId: string): ShiftChangeHistory[] => {
    return historyStorage.getAll().filter((h) => h.staffId === staffId);
  },
};

// プラン設定管理
export const planRequirementStorage = {
  getAll: (): PlanStaffRequirement[] => getFromStorage(STORAGE_KEYS.PLAN_REQUIREMENTS, []),
  save: (requirements: PlanStaffRequirement[]): void =>
    saveToStorage(STORAGE_KEYS.PLAN_REQUIREMENTS, requirements),
  add: (requirement: PlanStaffRequirement): void => {
    const all = planRequirementStorage.getAll();
    planRequirementStorage.save([...all, requirement]);
  },
  update: (planType: string, updates: Partial<PlanStaffRequirement>): void => {
    const all = planRequirementStorage.getAll();
    const updated = all.map((r) => (r.planType === planType ? { ...r, ...updates } : r));
    planRequirementStorage.save(updated);
  },
  delete: (planType: string): void => {
    const all = planRequirementStorage.getAll();
    planRequirementStorage.save(all.filter((r) => r.planType !== planType));
  },
  getByPlanType: (planType: string): PlanStaffRequirement | undefined => {
    return planRequirementStorage.getAll().find((r) => r.planType === planType);
  },
};

// スタッフ標準スケジュール管理
export const staffScheduleStorage = {
  getAll: (): StaffStandardSchedule[] => getFromStorage(STORAGE_KEYS.STAFF_SCHEDULES, []),
  save: (schedules: StaffStandardSchedule[]): void => saveToStorage(STORAGE_KEYS.STAFF_SCHEDULES, schedules),
  add: (schedule: StaffStandardSchedule): void => {
    const all = staffScheduleStorage.getAll();
    staffScheduleStorage.save([...all, schedule]);
  },
  update: (id: string, updates: Partial<StaffStandardSchedule>): void => {
    const all = staffScheduleStorage.getAll();
    const updated = all.map((s) => (s.id === id ? { ...s, ...updates } : s));
    staffScheduleStorage.save(updated);
  },
  delete: (id: string): void => {
    const all = staffScheduleStorage.getAll();
    staffScheduleStorage.save(all.filter((s) => s.id !== id));
  },
  getByStaff: (staffId: string): StaffStandardSchedule | undefined => {
    return staffScheduleStorage.getAll().find((s) => s.staffId === staffId);
  },
};

// 役職マスタ管理
export const positionStorage = {
  getAll: (): PositionMaster[] => getFromStorage(STORAGE_KEYS.POSITIONS, []),
  save: (positions: PositionMaster[]): void => saveToStorage(STORAGE_KEYS.POSITIONS, positions),
  add: (position: PositionMaster): void => {
    const all = positionStorage.getAll();
    positionStorage.save([...all, position]);
  },
  update: (id: string, updates: Partial<PositionMaster>): void => {
    const all = positionStorage.getAll();
    const updated = all.map((p) => (p.id === id ? { ...p, ...updates } : p));
    positionStorage.save(updated);
  },
  delete: (id: string): void => {
    const all = positionStorage.getAll();
    positionStorage.save(all.filter((p) => p.id !== id));
  },
  getActive: (): PositionMaster[] => {
    return positionStorage.getAll()
      .filter((p) => p.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
};

// 現在のユーザー
export const currentUserStorage = {
  get: (): Staff | null => getFromStorage(STORAGE_KEYS.CURRENT_USER, null),
  set: (user: Staff | null): void => saveToStorage(STORAGE_KEYS.CURRENT_USER, user),
  clear: (): void => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),
};

// 初期データのセットアップ
export function setupInitialData(): void {
  // 役職マスタの初期化
  if (positionStorage.getAll().length === 0) {
    const defaultPositions: PositionMaster[] = [
      { id: '1', name: 'フロント', displayOrder: 1, isActive: true, baseRequiredCount: 2, guestCountRatio: 0.1 },
      { id: '2', name: '清掃', displayOrder: 2, isActive: true, baseRequiredCount: 3, guestCountRatio: 0.15 },
      { id: '3', name: 'レストラン', displayOrder: 3, isActive: true, baseRequiredCount: 1, guestCountRatio: 0.05 },
      { id: '4', name: '配膳', displayOrder: 4, isActive: true, baseRequiredCount: 1, guestCountRatio: 0.05 },
      { id: '5', name: '喫茶店', displayOrder: 5, isActive: true, baseRequiredCount: 1, guestCountRatio: 0.0 },
      { id: '6', name: '調理', displayOrder: 6, isActive: true, baseRequiredCount: 2, guestCountRatio: 0.08 },
      { id: '7', name: 'その他', displayOrder: 7, isActive: true, baseRequiredCount: 1, guestCountRatio: 0.0 },
    ];
    positionStorage.save(defaultPositions);
  }

  // スタッフが1人もいない場合、デモデータを追加
  if (staffStorage.getAll().length === 0) {
    const demoStaff: Staff[] = [
      {
        id: '1',
        name: '管理者',
        position: 'フロント',
        trustScore: 100,
        role: 'admin',
        isActive: true,
        loginId: 'admin@example.com',
        passwordHash: 'admin',
        email: 'admin@example.com',
        is2faEnabled: false,
      },
      {
        id: '2',
        name: '山田太郎',
        position: 'フロント',
        trustScore: 95,
        role: 'user',
        isActive: true,
        loginId: 'yamada@example.com',
        passwordHash: 'password',
        email: 'yamada@example.com',
        is2faEnabled: false,
      },
      {
        id: '3',
        name: '佐藤花子',
        position: '清掃',
        trustScore: 98,
        role: 'user',
        isActive: true,
        loginId: 'sato@example.com',
        passwordHash: 'password',
        email: 'sato@example.com',
        is2faEnabled: false,
      },
      {
        id: '4',
        name: '鈴木一郎',
        position: '調理',
        trustScore: 90,
        role: 'user',
        isActive: true,
        loginId: 'suzuki@example.com',
        passwordHash: 'password',
        email: 'suzuki@example.com',
        is2faEnabled: false,
      },
    ];
    staffStorage.save(demoStaff);
  }

  // デフォルトのプラン設定
  if (planRequirementStorage.getAll().length === 0) {
    const defaultPlans: PlanStaffRequirement[] = [
      {
        planType: '通常プラン',
        baseStaff: 5,
        perGuest: 10,
        positions: {
          フロント: 2,
          清掃: 1,
          レストラン: 1,
          調理: 1,
        },
      },
      {
        planType: '豪華プラン',
        baseStaff: 8,
        perGuest: 8,
        positions: {
          フロント: 2,
          清掃: 2,
          レストラン: 2,
          配膳: 1,
          調理: 2,
        },
      },
    ];
    planRequirementStorage.save(defaultPlans);
  }
}
