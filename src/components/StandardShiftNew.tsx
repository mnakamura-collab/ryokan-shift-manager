import { useState } from 'react';
import type { Staff, StaffStandardSchedule } from '../types';
import { staffScheduleStorage, shiftStorage } from '../utils/storage';
import { generateId, formatDate } from '../utils/helpers';

interface StandardShiftProps {
  currentUser: Staff;
  staff: Staff[];
  onUpdate: () => void;
}

const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

export default function StandardShiftNew({ currentUser, staff, onUpdate }: StandardShiftProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    hoursPerDay: 8,
    daysPerWeek: 5,
    preferredStartTime: '09:00',
    preferredDaysOfWeek: [1, 2, 3, 4, 5], // 月-金
  });

  const schedules = staffScheduleStorage.getAll();

  const handleAddSchedule = () => {
    if (!selectedStaffId) {
      alert('スタッフを選択してください');
      return;
    }

    const existingSchedule = staffScheduleStorage.getByStaff(selectedStaffId);
    if (existingSchedule) {
      staffScheduleStorage.update(existingSchedule.id, {
        ...formData,
        isActive: true,
      });
    } else {
      const newSchedule: StaffStandardSchedule = {
        id: generateId(),
        staffId: selectedStaffId,
        ...formData,
        isActive: true,
      };
      staffScheduleStorage.add(newSchedule);
    }

    onUpdate();
    setShowModal(false);
    setSelectedStaffId('');
    setFormData({
      hoursPerDay: 8,
      daysPerWeek: 5,
      preferredStartTime: '09:00',
      preferredDaysOfWeek: [1, 2, 3, 4, 5],
    });
  };

  const handleEditSchedule = (schedule: StaffStandardSchedule) => {
    setSelectedStaffId(schedule.staffId);
    setFormData({
      hoursPerDay: schedule.hoursPerDay,
      daysPerWeek: schedule.daysPerWeek,
      preferredStartTime: schedule.preferredStartTime,
      preferredDaysOfWeek: schedule.preferredDaysOfWeek,
    });
    setShowModal(true);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('この標準設定を削除してもよろしいですか？')) {
      staffScheduleStorage.delete(id);
      onUpdate();
    }
  };

  const handleToggleDayOfWeek = (day: number) => {
    const currentDays = formData.preferredDaysOfWeek;
    if (currentDays.includes(day)) {
      setFormData({
        ...formData,
        preferredDaysOfWeek: currentDays.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        preferredDaysOfWeek: [...currentDays, day].sort(),
      });
    }
  };

  const handleGenerateShifts = () => {
    if (!confirm('標準設定に基づいて今月のシフトを自動生成しますか？既存のシフトは上書きされません。')) {
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let addedCount = 0;

    schedules.forEach((schedule) => {
      if (!schedule.isActive) return;

      const staffMember = staff.find((s) => s.id === schedule.staffId);
      if (!staffMember) return;

      // 月内で希望曜日の日付を取得
      const targetDays: Date[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (schedule.preferredDaysOfWeek.includes(date.getDay())) {
          targetDays.push(date);
        }
      }

      // 週の勤務日数に基づいて均等に配分
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      const totalDaysToSchedule = Math.min(
        schedule.daysPerWeek * weeksInMonth,
        targetDays.length
      );

      // 均等に日付を選択
      const interval = Math.floor(targetDays.length / totalDaysToSchedule);
      const selectedDays = targetDays.filter((_, index) => index % Math.max(1, interval) === 0)
        .slice(0, totalDaysToSchedule);

      selectedDays.forEach((date) => {
        const dateStr = formatDate(date);

        // 既存のシフトがあればスキップ
        const existingShifts = shiftStorage.getByDate(dateStr);
        if (existingShifts.some((s) => s.staffId === schedule.staffId)) {
          return;
        }

        // 終了時刻を計算
        const [hours, minutes] = schedule.preferredStartTime.split(':').map(Number);
        const endHour = hours + schedule.hoursPerDay;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        shiftStorage.add({
          id: generateId(),
          staffId: schedule.staffId,
          date: dateStr,
          position: staffMember.position,
          startTime: schedule.preferredStartTime,
          endTime: endTime,
          isStandard: false,
          isConfirmed: false,
        });
        addedCount++;
      });
    });

    onUpdate();
    alert(`${addedCount}件のシフトを自動生成しました`);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">
          標準シフト設定は管理者のみアクセスできます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">スタッフ標準シフト設定</h2>
          <div className="flex gap-3">
            <button onClick={handleGenerateShifts} className="btn btn-secondary">
              今月のシフトを自動生成
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              + 標準設定を追加
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          各スタッフの1日の勤務時間と週の勤務日数を設定します
        </p>

        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            標準シフト設定がまだ登録されていません
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const staffMember = staff.find((s) => s.id === schedule.staffId);
              if (!staffMember) return null;

              return (
                <div
                  key={schedule.id}
                  className={`border rounded-lg p-4 ${schedule.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-800">{staffMember.name}</h3>
                        <span className="badge bg-blue-100 text-blue-800 border-blue-300 text-xs">
                          {staffMember.position}
                        </span>
                        {!schedule.isActive && (
                          <span className="badge bg-gray-200 text-gray-600 border-gray-300 text-xs">
                            無効
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>
                          <span className="font-medium">勤務時間:</span> {schedule.hoursPerDay}時間/日
                        </div>
                        <div>
                          <span className="font-medium">勤務日数:</span> {schedule.daysPerWeek}日/週
                        </div>
                        <div>
                          <span className="font-medium">開始時刻:</span> {schedule.preferredStartTime}
                        </div>
                        <div>
                          <span className="font-medium">希望曜日:</span>{' '}
                          {schedule.preferredDaysOfWeek.map((d) => daysOfWeek[d]).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              標準シフト設定
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スタッフ
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">スタッフを選択...</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    1日の勤務時間
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={formData.hoursPerDay}
                      onChange={(e) => setFormData({ ...formData, hoursPerDay: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                    <span className="text-sm text-gray-600">時間</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    週の勤務日数
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formData.daysPerWeek}
                      onChange={(e) => setFormData({ ...formData, daysPerWeek: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                    <span className="text-sm text-gray-600">日</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  希望開始時刻
                </label>
                <input
                  type="time"
                  value={formData.preferredStartTime}
                  onChange={(e) => setFormData({ ...formData, preferredStartTime: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  希望勤務曜日
                </label>
                <div className="flex gap-2 flex-wrap">
                  {daysOfWeek.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleToggleDayOfWeek(index)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.preferredDaysOfWeek.includes(index)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedStaffId('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAddSchedule}
                  className="btn btn-primary flex-1"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
