import { useState, useEffect } from 'react';
import type { Staff, StaffWorkLimit } from '../types';
import { staffWorkLimitStorage } from '../utils/autoShiftStorage';

interface StaffWorkLimitSettingsProps {
  currentUser: Staff;
  staff: Staff[];
  isAdminView?: boolean;
}

export default function StaffWorkLimitSettings({
  currentUser,
  staff,
  isAdminView = false
}: StaffWorkLimitSettingsProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentUser.id);
  const [workLimit, setWorkLimit] = useState<StaffWorkLimit>({
    id: '',
    staffId: currentUser.id,
    maxHoursPerWeek: 40,
    maxHoursPerMonth: 160,
    maxConsecutiveDays: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkLimit();
  }, [selectedStaffId]);

  const loadWorkLimit = async () => {
    setLoading(true);
    const data = await staffWorkLimitStorage.getByStaffId(selectedStaffId);

    if (data) {
      setWorkLimit(data);
    } else {
      // デフォルト値
      setWorkLimit({
        id: '',
        staffId: selectedStaffId,
        maxHoursPerWeek: 40,
        maxHoursPerMonth: 160,
        maxConsecutiveDays: 5,
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await staffWorkLimitStorage.upsert({
        staffId: workLimit.staffId,
        maxHoursPerWeek: workLimit.maxHoursPerWeek,
        maxHoursPerMonth: workLimit.maxHoursPerMonth,
        maxConsecutiveDays: workLimit.maxConsecutiveDays,
      });

      alert('労働時間制約を保存しました');
      await loadWorkLimit();
    } catch (error) {
      console.error('Error saving work limit:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const canEdit = isAdminView || currentUser.role === 'admin';

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
        <h2 className="text-2xl font-bold">労働時間制約設定</h2>
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

      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-600 text-xl mr-3">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900">閲覧のみ</p>
              <p className="text-sm text-yellow-800 mt-1">
                労働時間制約の変更は管理者のみ可能です。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">
            {selectedStaff?.name}さんの労働時間制約
          </h3>
          <p className="text-sm text-gray-600">
            週・月の労働時間上限と連続勤務日数の制限を設定します。
          </p>
        </div>

        <div className="space-y-6">
          {/* 週の労働時間上限 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block mb-2">
              <span className="font-medium text-gray-700">週の労働時間上限</span>
              <span className="text-sm text-gray-500 ml-2">（法定: 40時間）</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="168"
                step="0.5"
                value={workLimit.maxHoursPerWeek}
                onChange={(e) => setWorkLimit({ ...workLimit, maxHoursPerWeek: parseFloat(e.target.value) })}
                disabled={!canEdit}
                className="input w-32"
              />
              <span className="text-gray-600">時間 / 週</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ 労働基準法では原則40時間/週が上限です
            </p>
          </div>

          {/* 月の労働時間上限 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block mb-2">
              <span className="font-medium text-gray-700">月の労働時間上限</span>
              <span className="text-sm text-gray-500 ml-2">（目安: 160時間）</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="744"
                step="0.5"
                value={workLimit.maxHoursPerMonth}
                onChange={(e) => setWorkLimit({ ...workLimit, maxHoursPerMonth: parseFloat(e.target.value) })}
                disabled={!canEdit}
                className="input w-32"
              />
              <span className="text-gray-600">時間 / 月</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ 週40時間 × 4週 = 160時間が目安です
            </p>
          </div>

          {/* 連続勤務日数上限 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block mb-2">
              <span className="font-medium text-gray-700">連続勤務日数上限</span>
              <span className="text-sm text-gray-500 ml-2">（推奨: 5-6日）</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="31"
                value={workLimit.maxConsecutiveDays}
                onChange={(e) => setWorkLimit({ ...workLimit, maxConsecutiveDays: parseInt(e.target.value) })}
                disabled={!canEdit}
                className="input w-32"
              />
              <span className="text-gray-600">日</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※ 労働基準法では週1日以上の休日が必要です
            </p>
          </div>
        </div>

        {/* 参考情報 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">1日8時間勤務の場合</div>
            <div className="font-semibold text-blue-900">
              週 {(workLimit.maxHoursPerWeek / 8).toFixed(1)} 日
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <div className="text-xs text-green-600 mb-1">1日8時間勤務の場合</div>
            <div className="font-semibold text-green-900">
              月 {(workLimit.maxHoursPerMonth / 8).toFixed(1)} 日
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <div className="text-xs text-purple-600 mb-1">最大連続勤務</div>
            <div className="font-semibold text-purple-900">
              {workLimit.maxConsecutiveDays} 日間
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={loadWorkLimit}
              className="btn btn-secondary"
              disabled={saving}
            >
              リセット
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 労働時間制約について</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• これらの制約は自動シフト生成時に考慮されます</li>
          <li>• 労働基準法を遵守した設定を推奨します</li>
          <li>• 週40時間、月160時間が一般的な上限です</li>
          <li>• 連続勤務は健康管理の観点から5-6日以内が推奨されます</li>
        </ul>
      </div>
    </div>
  );
}
