import { useState } from 'react';
import type { Staff, Shift, Position } from '../types';
import { shiftStorage } from '../utils/supabaseStorage';
import { generateId, getPositionColor, formatDate } from '../utils/helpers';

interface StandardShiftProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  onUpdate: () => void;
}

const positions: Position[] = ['フロント', '清掃', 'レストラン', '配膳', '喫茶店', '調理', 'その他'];
const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

export default function StandardShift({ currentUser, staff, shifts, onUpdate }: StandardShiftProps) {
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(0); // 0 = 日曜日
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    staffId: '',
    position: 'フロント' as Position,
    startTime: '09:00',
    endTime: '18:00',
  });

  // 標準シフトのみ取得
  const standardShifts = shifts.filter((s) => s.isStandard);

  // 曜日でグループ化
  const getStandardShiftsForDay = (dayOfWeek: number) => {
    return standardShifts.filter((s) => {
      const date = new Date(s.date);
      return date.getDay() === dayOfWeek;
    });
  };

  const dayShifts = getStandardShiftsForDay(selectedDayOfWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 選択された曜日に対応する日付を作成（今週の該当曜日）
    const today = new Date();
    const currentDay = today.getDay();
    const diff = selectedDayOfWeek - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);

    const newShift: Shift = {
      id: generateId(),
      staffId: formData.staffId,
      date: formatDate(targetDate),
      position: formData.position,
      startTime: formData.startTime,
      endTime: formData.endTime,
      isStandard: true,
      isConfirmed: false,
    };

    shiftStorage.add(newShift);
    onUpdate();
    setShowAddModal(false);
    setFormData({
      staffId: '',
      position: 'フロント',
      startTime: '09:00',
      endTime: '18:00',
    });
  };

  const handleDelete = (shiftId: string) => {
    if (confirm('この標準シフトを削除してもよろしいですか？')) {
      shiftStorage.delete(shiftId);
      onUpdate();
    }
  };

  const handleApplyToMonth = () => {
    if (!confirm('標準シフトを今月全体に適用しますか？既存のシフトは上書きされません。')) {
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let addedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dateStr = formatDate(date);

      // 既存のシフトがある日はスキップ
      const existingShifts = shifts.filter((s) => s.date === dateStr);
      if (existingShifts.length > 0) continue;

      // この曜日の標準シフトを適用
      const standardForDay = getStandardShiftsForDay(dayOfWeek);
      standardForDay.forEach((standardShift) => {
        const newShift: Shift = {
          id: generateId(),
          staffId: standardShift.staffId,
          date: dateStr,
          position: standardShift.position,
          startTime: standardShift.startTime,
          endTime: standardShift.endTime,
          isStandard: false,
          isConfirmed: false,
        };
        shiftStorage.add(newShift);
        addedCount++;
      });
    }

    onUpdate();
    alert(`${addedCount}件のシフトを追加しました`);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">
          標準シフト管理は管理者のみアクセスできます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">標準シフトパターン</h2>
          <div className="flex gap-3">
            <button onClick={handleApplyToMonth} className="btn btn-secondary">
              今月に適用
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              + 標準シフトを追加
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {daysOfWeek.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDayOfWeek(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedDayOfWeek === index
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {day}曜日
            </button>
          ))}
        </div>

        {dayShifts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {daysOfWeek[selectedDayOfWeek]}曜日の標準シフトはまだ登録されていません
          </p>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((shift) => {
              const staffMember = staff.find((s) => s.id === shift.staffId);
              return (
                <div key={shift.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className={`badge ${getPositionColor(shift.position)}`}>
                      {shift.position}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{staffMember?.name}</p>
                      <p className="text-sm text-gray-600">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">標準シフト追加</h3>
            <p className="text-sm text-gray-600 mb-4">
              曜日: {daysOfWeek[selectedDayOfWeek]}曜日
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スタッフ
                </label>
                <select
                  required
                  value={formData.staffId}
                  onChange={(e) => {
                    const staffMember = staff.find((s) => s.id === e.target.value);
                    setFormData({
                      ...formData,
                      staffId: e.target.value,
                      position: staffMember ? staffMember.position : formData.position,
                    });
                  }}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役職
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as Position })}
                  className="input w-full"
                >
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始時刻
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了時刻
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
