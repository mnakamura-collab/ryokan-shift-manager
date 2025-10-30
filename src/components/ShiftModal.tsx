import { useState, useEffect } from 'react';
import type { Staff, Shift, Position } from '../types';
import { shiftStorage, positionStorage } from '../utils/supabaseStorage';
import { generateId } from '../utils/helpers';

interface ShiftModalProps {
  show: boolean;
  onClose: () => void;
  onUpdate: () => void;
  staff: Staff[];
  selectedDate: string;
  editingShift?: Shift | null;
}

export default function ShiftModal({ show, onClose, onUpdate, staff, selectedDate, editingShift }: ShiftModalProps) {
  const [positions, setPositions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    staffId: '',
    position: '' as Position,
    startTime: '09:00',
    endTime: '18:00',
    isStandard: false,
  });

  useEffect(() => {
    const loadPositions = async () => {
      const activePositions = await positionStorage.getActive();
      const positionNames = activePositions.map(p => p.name);
      setPositions(positionNames);
      if (positionNames.length > 0 && !formData.position) {
        setFormData(prev => ({ ...prev, position: positionNames[0] }));
      }
    };
    loadPositions();
  }, []);

  useEffect(() => {
    if (editingShift) {
      setFormData({
        staffId: editingShift.staffId,
        position: editingShift.position,
        startTime: editingShift.startTime,
        endTime: editingShift.endTime,
        isStandard: editingShift.isStandard || false,
      });
    } else {
      setFormData({
        staffId: '',
        position: positions.length > 0 ? positions[0] : '',
        startTime: '09:00',
        endTime: '18:00',
        isStandard: false,
      });
    }
  }, [editingShift, show, positions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingShift) {
      await shiftStorage.update(editingShift.id, {
        staffId: formData.staffId,
        position: formData.position,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isStandard: formData.isStandard,
        lastModified: new Date(),
      });
    } else {
      const newShift: Shift = {
        id: generateId(),
        staffId: formData.staffId,
        date: selectedDate,
        position: formData.position,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isStandard: formData.isStandard,
        isConfirmed: false,
      };
      await shiftStorage.add(newShift);
    }

    await onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (editingShift && confirm('このシフトを削除してもよろしいですか？')) {
      await shiftStorage.delete(editingShift.id);
      await onUpdate();
      onClose();
    }
  };

  if (!show) return null;

  const selectedStaff = staff.find((s) => s.id === formData.staffId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          {editingShift ? 'シフト編集' : 'シフト追加'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">日付: {selectedDate}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スタッフ
            </label>
            <select
              required
              value={formData.staffId}
              onChange={(e) => {
                const selectedStaff = staff.find((s: Staff) => s.id === e.target.value);
                setFormData({
                  ...formData,
                  staffId: e.target.value,
                  position: selectedStaff ? selectedStaff.position : formData.position
                });
              }}
              className="input w-full"
            >
              <option value="">スタッフを選択...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.position}) - 信頼度: {s.trustScore}
                </option>
              ))}
            </select>
            {selectedStaff && selectedStaff.trustScore < 70 && (
              <p className="text-xs text-orange-600 mt-1">
                このスタッフの信頼度は低めです
              </p>
            )}
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isStandard"
              checked={formData.isStandard}
              onChange={(e) => setFormData({ ...formData, isStandard: e.target.checked })}
              className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isStandard" className="text-sm text-gray-700">
              標準シフトとして設定
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            {editingShift && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn bg-red-500 text-white hover:bg-red-600"
              >
                削除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
            >
              {editingShift ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
