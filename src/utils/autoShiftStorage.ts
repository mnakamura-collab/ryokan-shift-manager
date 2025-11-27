import { supabase } from '../lib/supabase';
import type {
  TimeSlot,
  DailyStaffRequirement,
  StaffAvailability,
  StaffWorkLimit,
  StaffUnavailableDate,
  // StaffPriority,
  // RequiredStaffAssignment,
  DailyOccupancy,
} from '../types';

// ========================================
// 時間帯マスタ
// ========================================
export const timeSlotStorage = {
  getAll: async (): Promise<TimeSlot[]> => {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching time slots:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      startTime: item.start_time,
      endTime: item.end_time,
      displayOrder: item.display_order,
      isActive: item.is_active,
    }));
  },

  add: async (timeSlot: Omit<TimeSlot, 'id'>): Promise<void> => {
    const { error } = await supabase.from('time_slots').insert({
      name: timeSlot.name,
      start_time: timeSlot.startTime,
      end_time: timeSlot.endTime,
      display_order: timeSlot.displayOrder,
      is_active: timeSlot.isActive,
    });

    if (error) {
      console.error('Error adding time slot:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<TimeSlot>): Promise<void> => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('time_slots')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating time slot:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting time slot:', error);
      throw error;
    }
  },
};

// ========================================
// 役職別必要人数設定
// ========================================
export const dailyRequirementStorage = {
  getByDateRange: async (startDate: string, endDate: string): Promise<DailyStaffRequirement[]> => {
    const { data, error } = await supabase
      .from('daily_staff_requirements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) {
      console.error('Error fetching daily requirements:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      date: item.date,
      position: item.position,
      timeSlotId: item.time_slot_id,
      requiredCount: item.required_count,
      roomOccupancyBonus: item.room_occupancy_bonus,
      banquetBonus: item.banquet_bonus,
    }));
  },

  getByDate: async (date: string): Promise<DailyStaffRequirement[]> => {
    const { data, error} = await supabase
      .from('daily_staff_requirements')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Error fetching daily requirements:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      date: item.date,
      position: item.position,
      timeSlotId: item.time_slot_id,
      requiredCount: item.required_count,
      roomOccupancyBonus: item.room_occupancy_bonus,
      banquetBonus: item.banquet_bonus,
    }));
  },

  upsert: async (requirement: Omit<DailyStaffRequirement, 'id'>): Promise<void> => {
    const { error } = await supabase.from('daily_staff_requirements').upsert({
      date: requirement.date,
      position: requirement.position,
      time_slot_id: requirement.timeSlotId,
      required_count: requirement.requiredCount,
      room_occupancy_bonus: requirement.roomOccupancyBonus,
      banquet_bonus: requirement.banquetBonus,
    }, {
      onConflict: 'date,position,time_slot_id',
    });

    if (error) {
      console.error('Error upserting daily requirement:', error);
      throw error;
    }
  },
};

// ========================================
// スタッフの勤務可能時間
// ========================================
export const staffAvailabilityStorage = {
  getByStaffId: async (staffId: string): Promise<StaffAvailability[]> => {
    const { data, error } = await supabase
      .from('staff_availability')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week');

    if (error) {
      console.error('Error fetching staff availability:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      dayOfWeek: item.day_of_week,
      isAvailable: item.is_available,
      availableStartTime: item.available_start_time,
      availableEndTime: item.available_end_time,
      lastModified: item.last_modified,
    }));
  },

  upsert: async (availability: Omit<StaffAvailability, 'id'>): Promise<void> => {
    const { error } = await supabase.from('staff_availability').upsert({
      staff_id: availability.staffId,
      day_of_week: availability.dayOfWeek,
      is_available: availability.isAvailable,
      available_start_time: availability.availableStartTime,
      available_end_time: availability.availableEndTime,
      last_modified: new Date().toISOString(),
    }, {
      onConflict: 'staff_id,day_of_week',
    });

    if (error) {
      console.error('Error upserting staff availability:', error);
      throw error;
    }
  },
};

// ========================================
// スタッフの労働時間制約
// ========================================
export const staffWorkLimitStorage = {
  getByStaffId: async (staffId: string): Promise<StaffWorkLimit | null> => {
    const { data, error } = await supabase
      .from('staff_work_limits')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      staffId: data.staff_id,
      maxHoursPerWeek: data.max_hours_per_week,
      maxHoursPerMonth: data.max_hours_per_month,
      maxConsecutiveDays: data.max_consecutive_days,
    };
  },

  upsert: async (limit: Omit<StaffWorkLimit, 'id'>): Promise<void> => {
    const { error } = await supabase.from('staff_work_limits').upsert({
      staff_id: limit.staffId,
      max_hours_per_week: limit.maxHoursPerWeek,
      max_hours_per_month: limit.maxHoursPerMonth,
      max_consecutive_days: limit.maxConsecutiveDays,
    }, {
      onConflict: 'staff_id',
    });

    if (error) {
      console.error('Error upserting staff work limit:', error);
      throw error;
    }
  },
};

// ========================================
// 希望休・不可日設定
// ========================================
export const staffUnavailableDateStorage = {
  getByStaffId: async (staffId: string, startDate?: string, endDate?: string): Promise<StaffUnavailableDate[]> => {
    let query = supabase
      .from('staff_unavailable_dates')
      .select('*')
      .eq('staff_id', staffId);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query.order('date');

    if (error) {
      console.error('Error fetching unavailable dates:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      date: item.date,
      unavailableType: item.unavailable_type,
      timeSlotIds: item.time_slot_ids,
      reason: item.reason,
      status: item.status,
    }));
  },

  getByDateRange: async (startDate: string, endDate: string, status?: string): Promise<StaffUnavailableDate[]> => {
    let query = supabase
      .from('staff_unavailable_dates')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('date');

    if (error) {
      console.error('Error fetching unavailable dates:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      staffId: item.staff_id,
      date: item.date,
      unavailableType: item.unavailable_type,
      timeSlotIds: item.time_slot_ids,
      reason: item.reason,
      status: item.status,
    }));
  },

  add: async (unavailableDate: Omit<StaffUnavailableDate, 'id'>): Promise<void> => {
    const { error } = await supabase.from('staff_unavailable_dates').insert({
      staff_id: unavailableDate.staffId,
      date: unavailableDate.date,
      unavailable_type: unavailableDate.unavailableType,
      time_slot_ids: unavailableDate.timeSlotIds,
      reason: unavailableDate.reason,
      status: unavailableDate.status || 'pending',
    });

    if (error) {
      console.error('Error adding unavailable date:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
    const { error } = await supabase
      .from('staff_unavailable_dates')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating unavailable date status:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('staff_unavailable_dates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting unavailable date:', error);
      throw error;
    }
  },
};

// ========================================
// 客室・宴会稼働情報
// ========================================
export const dailyOccupancyStorage = {
  getByDateRange: async (startDate: string, endDate: string): Promise<DailyOccupancy[]> => {
    const { data, error } = await supabase
      .from('daily_occupancy')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) {
      console.error('Error fetching daily occupancy:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      date: item.date,
      roomOccupancyRate: item.room_occupancy_rate,
      totalRooms: item.total_rooms,
      occupiedRooms: item.occupied_rooms,
      hasBanquet: item.has_banquet,
      banquetGuestCount: item.banquet_guest_count,
    }));
  },

  getByDate: async (date: string): Promise<DailyOccupancy | null> => {
    const { data, error } = await supabase
      .from('daily_occupancy')
      .select('*')
      .eq('date', date)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      date: data.date,
      roomOccupancyRate: data.room_occupancy_rate,
      totalRooms: data.total_rooms,
      occupiedRooms: data.occupied_rooms,
      hasBanquet: data.has_banquet,
      banquetGuestCount: data.banquet_guest_count,
    };
  },

  upsert: async (occupancy: Omit<DailyOccupancy, 'id'>): Promise<void> => {
    const { error } = await supabase.from('daily_occupancy').upsert({
      date: occupancy.date,
      room_occupancy_rate: occupancy.roomOccupancyRate,
      total_rooms: occupancy.totalRooms,
      occupied_rooms: occupancy.occupiedRooms,
      has_banquet: occupancy.hasBanquet,
      banquet_guest_count: occupancy.banquetGuestCount,
    }, {
      onConflict: 'date',
    });

    if (error) {
      console.error('Error upserting daily occupancy:', error);
      throw error;
    }
  },
};
