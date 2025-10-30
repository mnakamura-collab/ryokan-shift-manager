import type { Staff, Shift, Reservation } from '../types';
import { getToday } from '../utils/helpers';
import ShiftTimeline from './ShiftTimeline';

interface TodayShiftProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  reservations: Reservation[];
  onUpdate: () => void;
}

export default function TodayShift({ staff, shifts }: TodayShiftProps) {
  const todayShifts = shifts.filter((s) => s.date === getToday());

  return (
    <div className="space-y-6">
      <ShiftTimeline shifts={todayShifts} staff={staff} title="本日のシフト" />
    </div>
  );
}
