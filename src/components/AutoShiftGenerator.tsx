import { useState } from 'react';
import type { Staff } from '../types';
import { staffStorage, shiftStorage } from '../utils/supabaseStorage';
import {
  timeSlotStorage,
  dailyRequirementStorage,
  dailyOccupancyStorage,
  staffAvailabilityStorage,
  staffWorkLimitStorage,
  staffUnavailableDateStorage,
} from '../utils/autoShiftStorage';
import { generateMonthlyShift, type GenerationResult, type ShortageReport } from '../utils/autoShiftAlgorithm';
import { formatDateJP } from '../utils/helpers';

interface AutoShiftGeneratorProps {
  currentUser: Staff;
}

export default function AutoShiftGenerator({ currentUser: _currentUser }: AutoShiftGeneratorProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [overwriteMode, setOverwriteMode] = useState<'keep' | 'overwrite'>('keep');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [hasExistingShifts, setHasExistingShifts] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    setHasExistingShifts(false);

    try {
      // 期間を計算
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 既存シフトをチェック
      const allShifts = await shiftStorage.getAll();
      const existingShifts = allShifts.filter(
        (s) => s.date >= startDateStr && s.date <= endDateStr
      );

      if (existingShifts.length > 0 && overwriteMode === 'keep') {
        setHasExistingShifts(true);
        setGenerating(false);
        return;
      }

      // 必要なデータを全て取得
      const [staff, timeSlots, requirements, occupancies] = await Promise.all([
        staffStorage.getAll(),
        timeSlotStorage.getAll(),
        dailyRequirementStorage.getByDateRange(startDateStr, endDateStr),
        dailyOccupancyStorage.getByDateRange(startDateStr, endDateStr),
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
      const generationResult = await generateMonthlyShift(
        selectedYear,
        selectedMonth,
        staff,
        timeSlots,
        requirements,
        availabilities,
        workLimits,
        unavailableDates,
        occupancies
      );

      setResult(generationResult);

      if (generationResult.shifts.length === 0) {
        alert('生成されたシフトがありません。必要人数設定と稼働状況を確認してください。');
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

    const confirmMessage =
      overwriteMode === 'overwrite'
        ? `期間内の既存シフトを削除して、${result.shifts.length}件のシフトを保存しますか？`
        : `${result.shifts.length}件のシフトを保存しますか？`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setSaving(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      // 上書きモードの場合は既存シフトを削除
      if (overwriteMode === 'overwrite') {
        const existingShifts = await shiftStorage.getAll();
        const shiftsToDelete = existingShifts.filter(
          (s) => s.date >= startDate && s.date <= endDate
        );

        for (const shift of shiftsToDelete) {
          await shiftStorage.delete(shift.id);
        }
      }

      // 新しいシフトを保存
      for (const shift of result.shifts) {
        await shiftStorage.add(shift);
      }

      alert('シフトを保存しました');
      setResult(null);
      setHasExistingShifts(false);
    } catch (error) {
      console.error('Error saving shifts:', error);
      alert('シフトの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const groupShortagesByDate = (shortages: ShortageReport[]) => {
    const grouped = new Map<string, ShortageReport[]>();
    shortages.forEach((s) => {
      if (!grouped.has(s.date)) {
        grouped.set(s.date, []);
      }
      grouped.get(s.date)!.push(s);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const calculateStaffUtilization = () => {
    if (!result) return [];

    const utilization = new Map<string, number>();
    result.shifts.forEach((shift) => {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      const duration = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;

      const current = utilization.get(shift.staffId) || 0;
      utilization.set(shift.staffId, current + duration);
    });

    return Array.from(utilization.entries())
      .map(([staffId, hours]) => ({ staffId, hours }))
      .sort((a, b) => b.hours - a.hours);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">自動シフト生成</h2>

      {/* 生成設定 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">生成設定</h3>

        {/* 年月選択 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input w-full"
              disabled={generating}
            >
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 1 + i).map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">月</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input w-full"
              disabled={generating}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 既存シフトの扱い */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            既存シフトの扱い
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="keep"
                checked={overwriteMode === 'keep'}
                onChange={(e) => setOverwriteMode(e.target.value as 'keep' | 'overwrite')}
                className="mr-2"
                disabled={generating}
              />
              <span className="text-sm text-gray-700">
                既存シフトを維持して空きだけ埋める
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="overwrite"
                checked={overwriteMode === 'overwrite'}
                onChange={(e) => setOverwriteMode(e.target.value as 'keep' | 'overwrite')}
                className="mr-2"
                disabled={generating}
              />
              <span className="text-sm text-gray-700">
                全て削除して最初から生成
              </span>
            </label>
          </div>
        </div>

        {/* 生成ボタン */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'シフト生成中...' : `${selectedYear}年${selectedMonth}月のシフトを生成`}
          </button>
        </div>
      </div>

      {/* 既存シフト確認ダイアログ */}
      {hasExistingShifts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">既存シフトが存在します</h3>
          <p className="text-sm text-yellow-800 mb-4">
            {selectedYear}年{selectedMonth}月には既にシフトが登録されています。
            「全て削除して最初から生成」を選択してから再度生成してください。
          </p>
          <button
            onClick={() => {
              setOverwriteMode('overwrite');
              setHasExistingShifts(false);
            }}
            className="btn btn-secondary text-sm"
          >
            削除モードに切り替え
          </button>
        </div>
      )}

      {/* 生成結果 */}
      {result && (
        <>
          {/* サマリー */}
          <div className="bg-primary-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">生成結果サマリー</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">生成シフト数</div>
                <div className="text-2xl font-bold text-primary-600">
                  {result.shifts.length}件
                </div>
              </div>
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">不足箇所</div>
                <div className="text-2xl font-bold text-red-600">
                  {result.shortages.length}件
                </div>
              </div>
              <div className="bg-white rounded p-4">
                <div className="text-sm text-gray-600">状態</div>
                <div className={`text-lg font-bold ${result.success ? 'text-green-600' : 'text-yellow-600'}`}>
                  {result.success ? '完全生成' : '部分生成'}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-700">{result.message}</div>
          </div>

          {/* 不足箇所レポート */}
          {result.shortages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">不足箇所レポート</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 mb-2">
                  以下の時間帯で必要人数を満たせませんでした。手動でスタッフを追加してください。
                </p>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {groupShortagesByDate(result.shortages).map(([date, shortages]) => (
                  <div key={date} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-800 mb-2">
                      {formatDateJP(date)}
                    </div>
                    <div className="space-y-2">
                      {shortages.map((shortage, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm bg-red-50 rounded p-2"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-gray-700">
                              {shortage.timeSlotName}
                            </span>
                            <span className="text-gray-600">{shortage.position}</span>
                          </div>
                          <div className="text-red-700 font-semibold">
                            必要{shortage.requiredCount}人 / 割当{shortage.assignedCount}人
                            （<span className="text-red-800">{shortage.shortageCount}人不足</span>）
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* スタッフ利用状況 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              スタッフ利用状況（{selectedYear}年{selectedMonth}月の労働時間）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                      スタッフID
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                      労働時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calculateStaffUtilization().map(({ staffId, hours }) => (
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
            <button onClick={() => setResult(null)} className="btn btn-secondary">
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
      {!result && !hasExistingShifts && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-semibold text-blue-900 mb-2">自動シフト生成について</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 1ヶ月分のシフトを自動的に生成します</li>
            <li>• 必要人数設定と稼働状況に基づいて最適なスタッフを配置します</li>
            <li>• スタッフの勤務可能時間、労働時間制約、希望休を考慮します</li>
            <li>• 同じスタッフを1日に複数時間帯に割り当てません</li>
            <li>• 優先度: スキル適合度 → 連続勤務回避 → 月の累積労働時間</li>
            <li>• 生成後、不足箇所レポートを確認してから保存してください</li>
          </ul>
        </div>
      )}
    </div>
  );
}
