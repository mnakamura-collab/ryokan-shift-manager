import { useState, useEffect } from 'react';
import type { TimeSlot, PositionMaster } from '../types';
import { timeSlotStorage, dailyRequirementStorage } from '../utils/autoShiftStorage';
import { positionStorage } from '../utils/supabaseStorage';

interface DailyStaffRequirementSettingsProps {
  selectedDate?: string; // YYYY-MM-DD形式、未指定なら曜日テンプレート
  dayOfWeek?: number; // 0-6、selectedDateが未指定の場合に使用
}

interface RequirementMatrix {
  [timeSlotId: string]: {
    [position: string]: {
      requiredCount: number;
      roomOccupancyBonus: number;
      banquetBonus: number;
    };
  };
}

export default function DailyStaffRequirementSettings({
  selectedDate,
  dayOfWeek = 1, // デフォルトは月曜日
}: DailyStaffRequirementSettingsProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [positions, setPositions] = useState<PositionMaster[]>([]);
  const [matrix, setMatrix] = useState<RequirementMatrix>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  useEffect(() => {
    loadInitialData();
  }, [selectedDate, dayOfWeek]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 時間帯と役職を取得
      const [timeSlotsData, positionsData] = await Promise.all([
        timeSlotStorage.getAll(),
        positionStorage.getActive(),
      ]);

      setTimeSlots(timeSlotsData);
      setPositions(positionsData);

      // 既存の設定を取得（特定日の場合）
      if (selectedDate) {
        const requirements = await dailyRequirementStorage.getByDate(selectedDate);
        const newMatrix: RequirementMatrix = {};

        // マトリクスを初期化
        timeSlotsData.forEach(slot => {
          newMatrix[slot.id] = {};
          positionsData.forEach(pos => {
            const existing = requirements.find(
              r => r.timeSlotId === slot.id && r.position === pos.name
            );
            newMatrix[slot.id][pos.name] = {
              requiredCount: existing?.requiredCount || 0,
              roomOccupancyBonus: existing?.roomOccupancyBonus || 0,
              banquetBonus: existing?.banquetBonus || 0,
            };
          });
        });

        setMatrix(newMatrix);
      } else {
        // 曜日テンプレートの場合は空のマトリクスを作成
        const newMatrix: RequirementMatrix = {};
        timeSlotsData.forEach(slot => {
          newMatrix[slot.id] = {};
          positionsData.forEach(pos => {
            newMatrix[slot.id][pos.name] = {
              requiredCount: 0,
              roomOccupancyBonus: 0,
              banquetBonus: 0,
            };
          });
        });
        setMatrix(newMatrix);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (
    timeSlotId: string,
    position: string,
    field: 'requiredCount' | 'roomOccupancyBonus' | 'banquetBonus',
    value: number
  ) => {
    setMatrix(prev => ({
      ...prev,
      [timeSlotId]: {
        ...prev[timeSlotId],
        [position]: {
          ...prev[timeSlotId][position],
          [field]: Math.max(0, value),
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedDate) {
      alert('日付が指定されていません');
      return;
    }

    setSaving(true);
    try {
      // マトリクスの各セルをupsert
      for (const timeSlotId of Object.keys(matrix)) {
        for (const position of Object.keys(matrix[timeSlotId])) {
          const data = matrix[timeSlotId][position];
          await dailyRequirementStorage.upsert({
            date: selectedDate,
            position,
            timeSlotId,
            requiredCount: data.requiredCount,
            roomOccupancyBonus: data.roomOccupancyBonus,
            banquetBonus: data.banquetBonus,
          });
        }
      }

      alert('保存しました');
    } catch (error) {
      console.error('Error saving requirements:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          役職別必要人数設定
        </h2>
        {selectedDate ? (
          <p className="text-gray-600">日付: {selectedDate}</p>
        ) : (
          <p className="text-gray-600">曜日テンプレート: {dayNames[dayOfWeek]}</p>
        )}
      </div>

      {timeSlots.length === 0 || positions.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800">
            時間帯または役職が設定されていません。先に時間帯設定と役職管理を完了してください。
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                    時間帯
                  </th>
                  {positions.map(pos => (
                    <th
                      key={pos.id}
                      className="border border-gray-300 px-4 py-2 text-center font-semibold text-gray-700"
                    >
                      {pos.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium text-gray-800">
                      <div>{slot.name}</div>
                      <div className="text-xs text-gray-500">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>
                    {positions.map(pos => (
                      <td key={pos.id} className="border border-gray-300 px-2 py-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 w-12">基本:</span>
                            <input
                              type="number"
                              min="0"
                              value={matrix[slot.id]?.[pos.name]?.requiredCount || 0}
                              onChange={(e) =>
                                handleValueChange(
                                  slot.id,
                                  pos.name,
                                  'requiredCount',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="input text-sm w-16 px-2 py-1"
                            />
                            <span className="text-xs text-gray-500">人</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 w-12">稼働:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={matrix[slot.id]?.[pos.name]?.roomOccupancyBonus || 0}
                              onChange={(e) =>
                                handleValueChange(
                                  slot.id,
                                  pos.name,
                                  'roomOccupancyBonus',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="input text-sm w-16 px-2 py-1"
                            />
                            <span className="text-xs text-gray-500">/10%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 w-12">宴会:</span>
                            <input
                              type="number"
                              min="0"
                              value={matrix[slot.id]?.[pos.name]?.banquetBonus || 0}
                              onChange={(e) =>
                                handleValueChange(
                                  slot.id,
                                  pos.name,
                                  'banquetBonus',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="input text-sm w-16 px-2 py-1"
                            />
                            <span className="text-xs text-gray-500">人</span>
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">設定の説明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>基本</strong>: 基本的な必要人数</li>
              <li>• <strong>稼働</strong>: 客室稼働率10%ごとに追加する人数</li>
              <li>• <strong>宴会</strong>: 宴会がある場合に追加する人数</li>
            </ul>
          </div>

          {selectedDate && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
