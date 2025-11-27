import { useState } from 'react';
import type { Staff, Shift } from '../types';
import { formatDate, getDaysInMonth, getPositionColor, formatDateJP } from '../utils/helpers';
import ShiftModal from './ShiftModal';
import ShiftTimeline from './ShiftTimeline';
import InteractiveShiftTimeline from './InteractiveShiftTimeline';
import MonthlyStaffView from './MonthlyStaffView';

interface ShiftCalendarProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  onUpdate: () => void;
}

type ViewMode = 'grid' | 'table';

export default function ShiftCalendar({ currentUser, staff, shifts, onUpdate }: ShiftCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [viewingTimelineDate, setViewingTimelineDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  const handleDateClick = (day: number) => {
    const date = formatDate(new Date(currentYear, currentMonth - 1, day));
    setViewingTimelineDate(date);
  };

  const goToPreviousDay = () => {
    if (!viewingTimelineDate) return;
    const currentDate = new Date(viewingTimelineDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setViewingTimelineDate(formatDate(currentDate));
  };

  const goToNextDay = () => {
    if (!viewingTimelineDate) return;
    const currentDate = new Date(viewingTimelineDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setViewingTimelineDate(formatDate(currentDate));
  };

  // タイムライン表示中の場合
  if (viewingTimelineDate) {
    const dateShifts = shifts.filter((s) => s.date === viewingTimelineDate);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewingTimelineDate(null)}
            className="btn btn-secondary"
          >
            ← カレンダーに戻る
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="前日"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
              {formatDateJP(viewingTimelineDate)}
            </span>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="翌日"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <InteractiveShiftTimeline
          shifts={dateShifts}
          staff={staff}
          date={viewingTimelineDate}
          title=""
          onUpdate={onUpdate}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="btn btn-secondary">
          ← 前月
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {currentYear}年 {currentMonth}月
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-800 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              カレンダー
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-800 shadow'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              一覧表
            </button>
          </div>
          <button onClick={nextMonth} className="btn btn-secondary">
            次月 →
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
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
                onClick={() => handleDateClick(day)}
                className={`border rounded p-2 min-h-24 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-primary-50 border-primary-400' : 'bg-white'}`}
              >
                <div className="font-semibold text-sm mb-1">{day}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 3).map((shift) => {
                    const staffMember = staff.find((s) => s.id === shift.staffId);
                    return (
                      <div
                        key={shift.id}
                        onClick={(e) => {
                          e.stopPropagation(); // 親要素のクリックイベントを止める
                          currentUser.role === 'admin' && handleEditShift(shift);
                        }}
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
                    onClick={(e) => {
                      e.stopPropagation(); // 親要素のクリックイベントを止める
                      handleAddShift(day);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-800 mt-1"
                  >
                    + 追加
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <MonthlyStaffView
          currentUser={currentUser}
          staff={staff}
          shifts={shifts}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onDateClick={(date) => setViewingTimelineDate(date)}
          onEditShift={handleEditShift}
        />
      )}

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
