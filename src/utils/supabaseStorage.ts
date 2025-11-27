import { supabase } from '../lib/supabase';
import type { Staff, Shift, Reservation, PositionMaster, StaffStandardSchedule, ShiftChangeHistory } from '../types';

// スタッフ管理
export const staffStorage = {
  getAll: async (): Promise<Staff[]> => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching staff:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      position: item.position,
      role: item.role as 'admin' | 'user',
      trustScore: item.trust_score,
      isActive: item.is_active,
      loginId: item.login_id || '',
      passwordHash: item.password_hash || '',
      email: item.email || '',
      is2faEnabled: item.is_2fa_enabled || false,
      otpSecret: item.otp_secret,
      otpExpiresAt: item.otp_expires_at,
    }));
  },

  save: async (staff: Staff[]): Promise<void> => {
    // 全削除してから再挿入（簡易実装）
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('staff').insert(
      staff.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        role: s.role,
        trust_score: s.trustScore,
        is_active: s.isActive,
      }))
    );

    if (error) console.error('Error saving staff:', error);
  },

  add: async (staff: Staff): Promise<void> => {
    // IDはSupabaseが自動生成するため、挿入時には含めない
    const { error } = await supabase.from('staff').insert({
      name: staff.name,
      position: staff.position,
      role: staff.role,
      trust_score: staff.trustScore,
      is_active: staff.isActive,
      login_id: staff.loginId,
      password_hash: staff.passwordHash,
      email: staff.email,
      is_2fa_enabled: staff.is2faEnabled,
      otp_secret: staff.otpSecret,
      otp_expires_at: staff.otpExpiresAt,
    });

    if (error) {
      console.error('Error adding staff:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Staff>): Promise<void> => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.trustScore !== undefined) updateData.trust_score = updates.trustScore;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.loginId !== undefined) updateData.login_id = updates.loginId;
    if (updates.passwordHash !== undefined) updateData.password_hash = updates.passwordHash;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.is2faEnabled !== undefined) updateData.is_2fa_enabled = updates.is2faEnabled;
    if (updates.otpSecret !== undefined) updateData.otp_secret = updates.otpSecret;
    if (updates.otpExpiresAt !== undefined) updateData.otp_expires_at = updates.otpExpiresAt;

    const { error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error updating staff:', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting staff:', error);
  },

  getById: async (id: string): Promise<Staff | undefined> => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      position: data.position,
      role: data.role as 'admin' | 'user',
      trustScore: data.trust_score,
      isActive: data.is_active,
      loginId: data.login_id || '',
      passwordHash: data.password_hash || '',
      email: data.email || '',
      is2faEnabled: data.is_2fa_enabled || false,
      otpSecret: data.otp_secret,
      otpExpiresAt: data.otp_expires_at,
    };
  },

  // メールアドレス認証（第一段階）
  authenticate: async (email: string, password: string): Promise<Staff | null> => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      position: data.position,
      role: data.role as 'admin' | 'user',
      trustScore: data.trust_score,
      isActive: data.is_active,
      loginId: data.login_id,
      passwordHash: data.password_hash,
      email: data.email,
      is2faEnabled: data.is_2fa_enabled || false,
      otpSecret: data.otp_secret,
      otpExpiresAt: data.otp_expires_at,
    };
  },

  // OTP生成と保存
  generateOTP: async (email: string): Promise<string | null> => {
    // 6桁のランダムな数字を生成
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分後

    const { error } = await supabase
      .from('staff')
      .update({
        otp_secret: otp,
        otp_expires_at: expiresAt,
      })
      .eq('email', email);

    if (error) {
      console.error('Error generating OTP:', error);
      return null;
    }

    return otp;
  },

  // OTP検証
  verifyOTP: async (email: string, otp: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('staff')
      .select('otp_secret, otp_expires_at')
      .eq('email', email)
      .single();

    if (error || !data) return false;

    // OTPが一致し、有効期限内かチェック
    const now = new Date();
    const expiresAt = data.otp_expires_at ? new Date(data.otp_expires_at) : null;

    if (!expiresAt || now > expiresAt) {
      return false; // 期限切れ
    }

    return data.otp_secret === otp;
  },

  // OTPをクリア
  clearOTP: async (email: string): Promise<void> => {
    await supabase
      .from('staff')
      .update({
        otp_secret: null,
        otp_expires_at: null,
      })
      .eq('email', email);
  },
};

// シフト管理
export const shiftStorage = {
  getAll: async (): Promise<Shift[]> => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('date');

    if (error) {
      console.error('Error fetching shifts:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      date: item.date,
      startTime: item.start_time,
      endTime: item.end_time,
      position: item.position,
      isCompleted: item.is_completed,
    }));
  },

  save: async (shifts: Shift[]): Promise<void> => {
    await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('shifts').insert(
      shifts.map(s => ({
        id: s.id,
        staff_id: s.staffId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        position: s.position,
        is_completed: s.isCompleted,
      }))
    );

    if (error) console.error('Error saving shifts:', error);
  },

  add: async (shift: Shift): Promise<void> => {
    // IDはSupabaseが自動生成するため、挿入時には含めない
    const insertData = {
      staff_id: shift.staffId,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      position: shift.position,
      is_standard: shift.isStandard || false,
      is_confirmed: shift.isConfirmed || false,
      is_completed: shift.isCompleted || false,
    };

    console.log('Inserting shift data to Supabase:', JSON.stringify(insertData, null, 2));

    const { error } = await supabase.from('shifts').insert(insertData);

    if (error) {
      console.error('Error adding shift:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Shift>): Promise<void> => {
    const updateData: any = {};
    if (updates.staffId !== undefined) updateData.staff_id = updates.staffId;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;

    const { error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error updating shift:', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting shift:', error);
  },

  getByDate: async (date: string): Promise<Shift[]> => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Error fetching shifts by date:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      date: item.date,
      startTime: item.start_time,
      endTime: item.end_time,
      position: item.position,
      isCompleted: item.is_completed,
    }));
  },
};

// 予約管理
export const reservationStorage = {
  getAll: async (): Promise<Reservation[]> => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('check_in_date');

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      guestName: item.guest_name,
      checkInDate: item.check_in_date,
      checkOutDate: item.check_out_date,
      numberOfGuests: item.number_of_guests,
      plan: item.plan,
      requiredStaff: item.required_staff,
      review: item.review_staffing_level ? {
        staffingLevel: item.review_staffing_level,
        actualStaffCount: item.review_actual_staff_count,
        reviewDate: item.review_date,
        notes: item.review_notes,
      } : undefined,
    }));
  },

  save: async (reservations: Reservation[]): Promise<void> => {
    await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('reservations').insert(
      reservations.map(r => ({
        id: r.id,
        guest_name: r.guestName,
        check_in_date: r.checkInDate,
        check_out_date: r.checkOutDate,
        number_of_guests: r.numberOfGuests,
        plan: r.plan,
        required_staff: r.requiredStaff,
        review_staffing_level: r.review?.staffingLevel,
        review_actual_staff_count: r.review?.actualStaffCount,
        review_date: r.review?.reviewDate,
        review_notes: r.review?.notes,
      }))
    );

    if (error) console.error('Error saving reservations:', error);
  },

  add: async (reservation: Reservation): Promise<void> => {
    // IDはSupabaseが自動生成するため、挿入時には含めない
    const { error } = await supabase.from('reservations').insert({
      guest_name: reservation.guestName,
      check_in_date: reservation.checkInDate,
      check_out_date: reservation.checkOutDate,
      number_of_guests: reservation.numberOfGuests,
      plan: reservation.plan,
      required_staff: reservation.requiredStaff,
      review_staffing_level: reservation.review?.staffingLevel,
      review_actual_staff_count: reservation.review?.actualStaffCount,
      review_date: reservation.review?.reviewDate,
      review_notes: reservation.review?.notes,
    });

    if (error) {
      console.error('Error adding reservation:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Reservation>): Promise<void> => {
    const updateData: any = {};
    if (updates.guestName !== undefined) updateData.guest_name = updates.guestName;
    if (updates.checkInDate !== undefined) updateData.check_in_date = updates.checkInDate;
    if (updates.checkOutDate !== undefined) updateData.check_out_date = updates.checkOutDate;
    if (updates.numberOfGuests !== undefined) updateData.number_of_guests = updates.numberOfGuests;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.requiredStaff !== undefined) updateData.required_staff = updates.requiredStaff;
    if (updates.review !== undefined) {
      updateData.review_staffing_level = updates.review.staffingLevel;
      updateData.review_actual_staff_count = updates.review.actualStaffCount;
      updateData.review_date = updates.review.reviewDate;
      updateData.review_notes = updates.review.notes;
    }

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error updating reservation:', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting reservation:', error);
  },

  getByDate: async (date: string): Promise<Reservation[]> => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('check_in_date', date);

    if (error) {
      console.error('Error fetching reservations by date:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      guestName: item.guest_name,
      checkInDate: item.check_in_date,
      checkOutDate: item.check_out_date,
      numberOfGuests: item.number_of_guests,
      plan: item.plan,
      requiredStaff: item.required_staff,
      review: item.review_staffing_level ? {
        staffingLevel: item.review_staffing_level,
        actualStaffCount: item.review_actual_staff_count,
        reviewDate: item.review_date,
        notes: item.review_notes,
      } : undefined,
    }));
  },
};

// 役職マスタ管理
export const positionStorage = {
  getAll: async (): Promise<PositionMaster[]> => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      displayOrder: item.display_order,
      isActive: item.is_active,
      baseRequiredCount: item.base_required_count || 1,
      guestCountRatio: item.guest_count_ratio || 0,
    }));
  },

  save: async (positions: PositionMaster[]): Promise<void> => {
    await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('positions').insert(
      positions.map(p => ({
        id: p.id,
        name: p.name,
        display_order: p.displayOrder,
        is_active: p.isActive,
      }))
    );

    if (error) console.error('Error saving positions:', error);
  },

  add: async (position: PositionMaster): Promise<void> => {
    // IDはSupabaseが自動生成するため、挿入時には含めない
    const { error } = await supabase.from('positions').insert({
      name: position.name,
      display_order: position.displayOrder,
      is_active: position.isActive,
      base_required_count: position.baseRequiredCount,
      guest_count_ratio: position.guestCountRatio,
    });

    if (error) {
      console.error('Error adding position:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<PositionMaster>): Promise<void> => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.baseRequiredCount !== undefined) updateData.base_required_count = updates.baseRequiredCount;
    if (updates.guestCountRatio !== undefined) updateData.guest_count_ratio = updates.guestCountRatio;

    const { error } = await supabase
      .from('positions')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error updating position:', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting position:', error);
  },

  getActive: async (): Promise<PositionMaster[]> => {
    const { data, error} = await supabase
      .from('positions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching active positions:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      displayOrder: item.display_order,
      isActive: item.is_active,
      baseRequiredCount: item.base_required_count || 1,
      guestCountRatio: item.guest_count_ratio || 0,
    }));
  },
};

// スタッフスケジュール管理
export const staffScheduleStorage = {
  getAll: async (): Promise<StaffStandardSchedule[]> => {
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*');

    if (error) {
      console.error('Error fetching staff schedules:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      hoursPerDay: item.hours_per_day,
      daysPerWeek: item.days_per_week,
      preferredStartTime: item.preferred_start_time,
      preferredDaysOfWeek: item.preferred_days_of_week,
      isActive: item.is_active,
    }));
  },

  save: async (schedules: StaffStandardSchedule[]): Promise<void> => {
    await supabase.from('staff_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('staff_schedules').insert(
      schedules.map(s => ({
        id: s.id,
        staff_id: s.staffId,
        hours_per_day: s.hoursPerDay,
        days_per_week: s.daysPerWeek,
        preferred_start_time: s.preferredStartTime,
        preferred_days_of_week: s.preferredDaysOfWeek,
        is_active: s.isActive,
      }))
    );

    if (error) console.error('Error saving staff schedules:', error);
  },

  add: async (schedule: StaffStandardSchedule): Promise<void> => {
    // IDはSupabaseが自動生成するため、挿入時には含めない
    const { error } = await supabase.from('staff_schedules').insert({
      staff_id: schedule.staffId,
      hours_per_day: schedule.hoursPerDay,
      days_per_week: schedule.daysPerWeek,
      preferred_start_time: schedule.preferredStartTime,
      preferred_days_of_week: schedule.preferredDaysOfWeek,
      is_active: schedule.isActive,
    });

    if (error) {
      console.error('Error adding staff schedule:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<StaffStandardSchedule>): Promise<void> => {
    const updateData: any = {};
    if (updates.staffId !== undefined) updateData.staff_id = updates.staffId;
    if (updates.hoursPerDay !== undefined) updateData.hours_per_day = updates.hoursPerDay;
    if (updates.daysPerWeek !== undefined) updateData.days_per_week = updates.daysPerWeek;
    if (updates.preferredStartTime !== undefined) updateData.preferred_start_time = updates.preferredStartTime;
    if (updates.preferredDaysOfWeek !== undefined) updateData.preferred_days_of_week = updates.preferredDaysOfWeek;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('staff_schedules')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error updating staff schedule:', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('staff_schedules')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting staff schedule:', error);
  },

  getByStaffId: async (staffId: string): Promise<StaffStandardSchedule | undefined> => {
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      staffId: data.staff_id,
      hoursPerDay: data.hours_per_day,
      daysPerWeek: data.days_per_week,
      preferredStartTime: data.preferred_start_time,
      preferredDaysOfWeek: data.preferred_days_of_week,
      isActive: data.is_active,
    };
  },
};

// 変更履歴管理
export const historyStorage = {
  getAll: async (): Promise<ShiftChangeHistory[]> => {
    const { data, error } = await supabase
      .from('shift_change_history')
      .select('*')
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      shiftId: item.shift_id,
      staffId: item.staff_id,
      changeType: item.change_type as 'created' | 'modified' | 'cancelled',
      changedAt: item.changed_at,
      daysBefore: item.days_before,
      penaltyScore: item.penalty_score,
    }));
  },

  add: async (history: ShiftChangeHistory): Promise<void> => {
    const { error } = await supabase.from('shift_change_history').insert({
      id: history.id,
      shift_id: history.shiftId,
      staff_id: history.staffId,
      change_type: history.changeType,
      changed_at: history.changedAt,
      days_before: history.daysBefore,
      penalty_score: history.penaltyScore,
    });

    if (error) console.error('Error adding history:', error);
  },
};

// 現在のユーザー管理（セッションストレージに保存）
export const currentUserStorage = {
  get: (): Staff | null => {
    const data = sessionStorage.getItem('currentUser');
    return data ? JSON.parse(data) : null;
  },
  set: (user: Staff): void => {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  },
  clear: (): void => {
    sessionStorage.removeItem('currentUser');
  },
};

// 初期データセットアップ
export const setupInitialData = async (): Promise<void> => {
  // 既にデータがあるかチェック
  const [positions, staff] = await Promise.all([
    positionStorage.getAll(),
    staffStorage.getAll(),
  ]);

  // 初期役職データは既にSQLで挿入済み
  if (positions.length === 0) {
    console.log('Warning: No positions found in database. Please run the SQL schema.');
  }

  // スタッフが1人もいない場合、初期データを追加
  if (staff.length === 0) {
    console.log('Adding initial staff data...');

    // Supabaseに直接INSERTして自動でUUIDを生成させる
    const { error } = await supabase.from('staff').insert([
      {
        name: '管理者',
        position: 'フロント',
        trust_score: 100,
        role: 'admin',
        is_active: true,
      },
      {
        name: '山田太郎',
        position: 'フロント',
        trust_score: 95,
        role: 'user',
        is_active: true,
      },
      {
        name: '佐藤花子',
        position: '清掃',
        trust_score: 98,
        role: 'user',
        is_active: true,
      },
      {
        name: '鈴木一郎',
        position: '調理',
        trust_score: 90,
        role: 'user',
        is_active: true,
      },
    ]);

    if (error) {
      console.error('Error adding initial staff:', error);
    } else {
      console.log('Initial staff data added successfully');
    }
  }
};
