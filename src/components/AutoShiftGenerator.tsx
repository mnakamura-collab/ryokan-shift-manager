import { useState } from 'react';
import type { Staff } from '../types';
import { staffStorage, shiftStorage } from '../utils/supabaseStorage';
import { timeSlotStorage, dailyRequirementStorage, dailyOccupancyStorage, staffAvailabilityStorage, staffWorkLimitStorage, staffUnavailableDateStorage } from '../utils/autoShiftStorage';
import { generateAutoShifts, type ShiftGenerationResult } from '../utils/autoShiftGenerator';
import { getToday, formatDateJP } from '../utils/helpers';

interface AutoShiftGeneratorProps {
  currentUser: Staff;
}

export default function AutoShiftGenerator({ currentUser: _currentUser }: AutoShiftGeneratorProps) {
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ShiftGenerationResult | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      // 必要なデータを全て取得
      const [
        staff,
        timeSlots,
        requirements,
        occupancies,
        existingShifts,
      ] = await Promise.all([
        staffStorage.getAll(),
        timeSlotStorage.getAll(),
        dailyRequirementStorage.getByDateRange(startDate, endDate),
        dailyOccupancyStorage.getByDateRange(startDate, endDate),
        shiftStorage.getAll(),
      ]);

      // スタッフごとの詳細情報を取得
      const availabilities = [];
      const workLimits = [];
      const unavailableDates = [];

      for (const s of staff) {
        const [avail, limit, unavail] = await Promise.all([
          staffAvailabilityStorage.getByStaffId(s.id),
          staffWorkLimitStorage.getByStaffId(s.id),
          staffUnavailableDateStorage.getByStaffId(s.id),
        ]);
        availabilities.push(...avail);
        if (limit) workLimits.push(limit);
        unavailableDates.push(...unavail);
      }

      // シフト生成
      const generationResult = await generateAutoShifts({
        startDate,
        endDate,
        staff,
        timeSlots,
        requirements,
        occupancies,
        availabilities,
        workLimits,
        unavailableDates,
        existingShifts,
      });

      setResult(generationResult);

      if (generationResult.shifts.length === 0) {
        alert('生成されたシフトがありません。必要人数設定を確認してください。');
      }
    } catch (error) {
      console.error('Error generating shifts:', error);
      alert('シフト生成中にエラーが発生しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || result.shifts.length === 0) {
      alert('保存するシフトがありません');
      return;
    }

    if (!confirm(`${result.shifts.length}件のシフトを保存しますか？`)) {
      return;
    }

    setSaving(true);
    try {
      // 既存のシフトを削除（期間内の未確定シフトのみ）
      const existingShifts = await shiftStorage.getAll();
      const shiftsToDelete = existingShifts.filter(
        (s) =>
          s.date >= startDate &&
          s.date <= endDate &&
          !s.isConfirmed &&
          !s.isCompleted
      );

      for (const shift of shiftsToDelete) {
        await shiftStorage.delete(shift.id);
      }

      // 新しいシフトを保存
      for (const shift of result.shifts) {
        await shiftStorage.add(shift);
      }

      alert('シフトを保存しました');
      setResult(null);
    } catch (error) {
      console.error('Error saving shifts:', error);
      alert('シフトの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">自動シフト生成</h2>

      {/* 期間選択 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">生成期間</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="input w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating || !startDate || !endDate}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'シフト生成中...' : 'シフトを生成'}
          </button>
        </div>
      </div>

      {/* 生成結果 */}
      {result && (
        <>
          {/* 統計情報 */}
          <div className="bg-primary-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">生成結果</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">生成シフト数</div>
                <div className="text-2xl font-bold text-primary-600">
                  {result.statistics.totalShiftsGenerated}
                </div>
              </div>
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">警告数</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {result.warnings.length}
                </div>
              </div>
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">必要人数未達</div>
                <div className="text-2xl font-bold text-red-600">
                  {result.statistics.unfulfilled}
                </div>
              </div>
            </div>
          </div>

          {/* 警告リスト */}
          {result.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">警告・注意事項</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className={`border rounded p-3 text-sm ${getSeverityColor(warning.severity)}`}
                  >
                    <div className="font-semibold">
                      {formatDateJP(warning.date)} - {warning.position}
                    </div>
                    <div className="mt-1">{warning.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* スタッフ利用状況 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              スタッフ利用状況（期間内の労働時間）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      スタッフ名
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                      労働時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.statistics.staffUtilization)
                    .sort((a, b) => b[1] - a[1])
                    .map(([staffId, hours]) => (
                      <tr key={staffId} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{staffId}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {hours.toFixed(1)}時間
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setResult(null)}
              className="btn btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : 'シフトを確定保存'}
            </button>
          </div>
        </>
      )}

      {/* 説明 */}
      {!result && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-semibold text-blue-900 mb-2">自動シフト生成について</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 指定期間のシフトを自動的に生成します</li>
            <li>• 必要人数設定と稼働状況に基づいて最適なスタッフを配置します</li>
            <li>• スタッフの勤務可能時間、労働時間制約、希望休を考慮します</li>
            <li>• 生成後、内容を確認してから保存してください</li>
            <li>• 保存すると、期間内の未確定シフトは上書きされます</li>
          </ul>
        </div>
      )}
    </div>
  );
}
