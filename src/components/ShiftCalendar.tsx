import { useState } from 'react';
import type { Staff, Shift } from '../types';
import { formatDate, getDaysInMonth, getFirstDayOfMonth, getPositionColor } from '../utils/helpers';
import { shiftStorage } from '../utils/storage';
import { generateId } from '../utils/helpers';
import ShiftModal from './ShiftModal';

interface ShiftCalendarProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  onUpdate: () => void;
}

export default function ShiftCalendar({ currentUser, staff, shifts, onUpdate }: ShiftCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getShiftsForDate = (day: number) => {
    const date = formatDate(new Date(currentYear, currentMonth - 1, day));
    return shifts.filter((s) => s.date === date);
  };

  const handleAddShift = (day: number) => {
    const date = formatDate(new Date(currentYear, currentMonth - 1, day));
    setSelectedDate(date);
    setEditingShift(null);
    setShowAddModal(true);
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedDate(shift.date);
    setEditingShift(shift);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingShift(null);
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="btn btn-secondary">
          ← 前月
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {currentYear}年 {currentMonth}月
        </h2>
        <button onClick={nextMonth} className="btn btn-secondary">
          次月 →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={i} className={`text-center font-semibold py-2 ${i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : ''}`}>
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-100 rounded min-h-24"></div>
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayShifts = getShiftsForDate(day);
          const date = formatDate(new Date(currentYear, currentMonth - 1, day));
          const isToday = date === formatDate(today);

          return (
            <div
              key={day}
              className={`border rounded p-2 min-h-24 ${isToday ? 'bg-primary-50 border-primary-400' : 'bg-white'}`}
            >
              <div className="font-semibold text-sm mb-1">{day}</div>
              <div className="space-y-1">
                {dayShifts.slice(0, 3).map((shift) => {
                  const staffMember = staff.find((s) => s.id === shift.staffId);
                  return (
                    <div
                      key={shift.id}
                      onClick={() => currentUser.role === 'admin' && handleEditShift(shift)}
                      className={`text-xs p-1 rounded ${getPositionColor(shift.position)} ${currentUser.role === 'admin' ? 'cursor-pointer hover:opacity-80' : ''}`}
                    >
                      {staffMember?.name}
                    </div>
                  );
                })}
                {dayShifts.length > 3 && (
                  <div className="text-xs text-gray-500">+{dayShifts.length - 3}名</div>
                )}
              </div>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleAddShift(day)}
                  className="text-xs text-primary-600 hover:text-primary-800 mt-1"
                >
                  + 追加
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ShiftModal
        show={showAddModal}
        onClose={handleCloseModal}
        onUpdate={onUpdate}
        staff={staff}
        selectedDate={selectedDate}
        editingShift={editingShift}
      />
    </div>
  );
}
