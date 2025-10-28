import { useState } from 'react';
import type { Staff, Shift } from '../types';
import { shiftStorage, staffStorage } from '../utils/storage';
import { formatDateJP, getPositionColor } from '../utils/helpers';

interface ShiftCompletionProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  onUpdate: () => void;
}

export default function ShiftCompletion({ currentUser, staff, shifts, onUpdate }: ShiftCompletionProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 選択日のシフトを取得
  const dateShifts = shifts.filter((s) => s.date === selectedDate && !s.isConfirmed);

  const handleCompleteShift = (shiftId: string, worked: boolean) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // シフトを確定済みにする
    shiftStorage.update(shiftId, { isConfirmed: true });

    // 勤務した場合、信頼度にボーナスを付与
    if (worked && shift.staffId) {
      const currentStaff = staffStorage.getAll().find((s) => s.id === shift.staffId);
      if (currentStaff) {
        const bonus = 1; // シフト通り働いた場合のボーナス
        const newScore = Math.min(100, currentStaff.trustScore + bonus);
        staffStorage.update(shift.staffId, { trustScore: newScore });
      }
    }

    onUpdate();
  };

  const handleCompleteAll = () => {
    if (!confirm('この日のすべてのシフトを完了として処理しますか？')) {
      return;
    }

    dateShifts.forEach((shift) => {
      handleCompleteShift(shift.id, true);
    });

    alert(`${dateShifts.length}件のシフトを完了しました`);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">
          シフト完了処理は管理者のみアクセスできます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">シフト完了処理</h2>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
            {dateShifts.length > 0 && (
              <button onClick={handleCompleteAll} className="btn btn-primary">
                すべて完了
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          シフト通りに勤務したスタッフには信頼度+1のボーナスが付与されます
        </p>

        {dateShifts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {formatDateJP(selectedDate)}の未完了シフトはありません
          </p>
        ) : (
          <div className="space-y-3">
            {dateShifts.map((shift) => {
              const staffMember = staff.find((s) => s.id === shift.staffId);
              return (
                <div
                  key={shift.id}
                  className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50"
                >
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
                    {shift.isStandard && (
                      <span className="badge bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        標準
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteShift(shift.id, true)}
                      className="btn bg-green-500 text-white hover:bg-green-600 text-sm"
                    >
                      勤務完了
                    </button>
                    <button
                      onClick={() => handleCompleteShift(shift.id, false)}
                      className="btn bg-gray-400 text-white hover:bg-gray-500 text-sm"
                    >
                      欠勤
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {shifts.filter((s) => s.date === selectedDate && s.isConfirmed).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">完了済みシフト</h3>
            <div className="space-y-2">
              {shifts
                .filter((s) => s.date === selectedDate && s.isConfirmed)
                .map((shift) => {
                  const staffMember = staff.find((s) => s.id === shift.staffId);
                  return (
                    <div
                      key={shift.id}
                      className="border rounded-lg p-3 bg-gray-50 flex items-center gap-4"
                    >
                      <span className={`badge ${getPositionColor(shift.position)} opacity-75`}>
                        {shift.position}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">{staffMember?.name}</p>
                        <p className="text-xs text-gray-500">
                          {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                      <span className="badge bg-green-100 text-green-800 border-green-300 text-xs">
                        完了
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
