import { useState, useEffect } from 'react';
import type { Staff, StaffAvailability } from '../types';
import { staffAvailabilityStorage } from '../utils/autoShiftStorage';

interface StaffAvailabilitySettingsProps {
  currentUser: Staff;
  staff: Staff[];
  isAdminView?: boolean; // 管理者が他のスタッフの設定を見る場合
}

const DAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

export default function StaffAvailabilitySettings({
  currentUser,
  staff,
  isAdminView = false
}: StaffAvailabilitySettingsProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentUser.id);
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    loadAvailabilities();
  }, [selectedStaffId]);

  const loadAvailabilities = async () => {
    setLoading(true);
    const data = await staffAvailabilityStorage.getByStaffId(selectedStaffId);

    // 7曜日分のデータを初期化（存在しない曜日はデフォルト値）
    const fullWeek: StaffAvailability[] = [];
    for (let day = 0; day <= 6; day++) {
      const existing = data.find(a => a.dayOfWeek === day);
      if (existing) {
        fullWeek.push(existing);
        if (existing.lastModified) {
          setLastModified(existing.lastModified);
        }
      } else {
        fullWeek.push({
          id: '',
          staffId: selectedStaffId,
          dayOfWeek: day,
          isAvailable: true,
          availableStartTime: '09:00',
          availableEndTime: '17:00',
          lastModified: new Date().toISOString(),
        });
      }
    }

    setAvailabilities(fullWeek);

    // 月1回の変更制限チェック
    if (data.length > 0 && data[0].lastModified) {
      const lastMod = new Date(data[0].lastModified);
      const now = new Date();
      const daysSinceLastMod = Math.floor((now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24));

      // 30日以内の変更は制限（管理者は除く）
      if (!isAdminView && currentUser.role !== 'admin' && daysSinceLastMod < 30) {
        setCanEdit(false);
      } else {
        setCanEdit(true);
      }
    }

    setLoading(false);
  };

  const handleAvailabilityChange = (dayOfWeek: number, field: keyof StaffAvailability, value: any) => {
    setAvailabilities(prev =>
      prev.map(av =>
        av.dayOfWeek === dayOfWeek
          ? { ...av, [field]: value }
          : av
      )
    );
  };

  const handleSave = async () => {
    if (!canEdit && currentUser.role !== 'admin') {
      alert('勤務可能時間の変更は月に1回までです。次回変更可能日をご確認ください。');
      return;
    }

    setSaving(true);
    try {
      // 全曜日のデータを保存
      for (const availability of availabilities) {
        await staffAvailabilityStorage.upsert({
          staffId: availability.staffId,
          dayOfWeek: availability.dayOfWeek,
          isAvailable: availability.isAvailable,
          availableStartTime: availability.availableStartTime,
          availableEndTime: availability.availableEndTime,
          lastModified: new Date().toISOString(),
        });
      }

      alert('勤務可能時間を保存しました');
      await loadAvailabilities();
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const nextEditDate = lastModified
    ? new Date(new Date(lastModified).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">勤務可能時間設定</h2>
        {isAdminView && (
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="input max-w-xs"
          >
            {staff.filter(s => s.isActive).map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.position})
              </option>
            ))}
          </select>
        )}
      </div>

      {!canEdit && currentUser.role !== 'admin' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-600 text-xl mr-3">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900">変更制限中</p>
              <p className="text-sm text-yellow-800 mt-1">
                勤務可能時間の変更は月に1回までです。
                {nextEditDate && (
                  <span className="font-medium">
                    {' '}次回変更可能日: {nextEditDate.toLocaleDateString('ja-JP')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2">
            {selectedStaff?.name}さんの勤務可能時間
          </h3>
          <p className="text-sm text-gray-600">
            曜日ごとに勤務可能な時間帯を設定してください。
          </p>
        </div>

        <div className="space-y-3">
          {availabilities.map((availability) => (
            <div
              key={availability.dayOfWeek}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-20 font-medium text-gray-700">
                {DAY_NAMES[availability.dayOfWeek]}
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={availability.isAvailable}
                  onChange={(e) => handleAvailabilityChange(
                    availability.dayOfWeek,
                    'isAvailable',
                    e.target.checked
                  )}
                  disabled={!canEdit && currentUser.role !== 'admin'}
                  className="w-4 h-4"
                />
                <span className="text-sm">勤務可能</span>
              </label>

              {availability.isAvailable && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={availability.availableStartTime || '09:00'}
                      onChange={(e) => handleAvailabilityChange(
                        availability.dayOfWeek,
                        'availableStartTime',
                        e.target.value
                      )}
                      disabled={!canEdit && currentUser.role !== 'admin'}
                      className="input w-32"
                    />
                    <span className="text-gray-500">〜</span>
                    <input
                      type="time"
                      value={availability.availableEndTime || '17:00'}
                      onChange={(e) => handleAvailabilityChange(
                        availability.dayOfWeek,
                        'availableEndTime',
                        e.target.value
                      )}
                      disabled={!canEdit && currentUser.role !== 'admin'}
                      className="input w-32"
                    />
                  </div>

                  <div className="text-sm text-gray-600">
                    {calculateDuration(
                      availability.availableStartTime || '09:00',
                      availability.availableEndTime || '17:00'
                    )}
                  </div>
                </>
              )}

              {!availability.isAvailable && (
                <span className="text-sm text-gray-500">休み</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={loadAvailabilities}
            className="btn btn-secondary"
            disabled={saving}
          >
            リセット
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving || (!canEdit && currentUser.role !== 'admin')}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 使い方</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 曜日ごとに勤務可能な時間帯を設定できます</li>
          <li>• チェックを外すと、その曜日は勤務不可として扱われます</li>
          <li>• 変更は月に1回までです（管理者は制限なし）</li>
          <li>• この設定は自動シフト生成時に参照されます</li>
        </ul>
      </div>
    </div>
  );
}

function calculateDuration(start: string, end: string): string {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${minutes}分`;
}
