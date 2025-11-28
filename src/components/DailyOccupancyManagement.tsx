import { useState, useEffect } from 'react';
import type { DailyOccupancy } from '../types';
import { dailyOccupancyStorage } from '../utils/autoShiftStorage';
import { getToday } from '../utils/helpers';

export default function DailyOccupancyManagement() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [occupancy, setOccupancy] = useState<DailyOccupancy>({
    id: '',
    date: getToday(),
    roomOccupancyRate: 0,
    totalRooms: 50, // デフォルト50室
    occupiedRooms: 0,
    hasBanquet: false,
    banquetGuestCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOccupancy();
  }, [selectedDate]);

  const loadOccupancy = async () => {
    setLoading(true);
    try {
      const data = await dailyOccupancyStorage.getByDate(selectedDate);
      if (data) {
        setOccupancy(data);
      } else {
        // データがない場合は初期値を設定
        setOccupancy({
          id: '',
          date: selectedDate,
          roomOccupancyRate: 0,
          totalRooms: 50,
          occupiedRooms: 0,
          hasBanquet: false,
          banquetGuestCount: 0,
        });
      }
    } catch (error) {
      console.error('Error loading occupancy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dailyOccupancyStorage.upsert(occupancy);
      alert('保存しました');
      await loadOccupancy();
    } catch (error) {
      console.error('Error saving occupancy:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleOccupiedRoomsChange = (value: number) => {
    const occupied = Math.max(0, Math.min(value, occupancy.totalRooms));
    const rate = occupancy.totalRooms > 0 ? (occupied / occupancy.totalRooms) * 100 : 0;
    setOccupancy({
      ...occupancy,
      occupiedRooms: occupied,
      roomOccupancyRate: Math.round(rate * 10) / 10,
    });
  };

  const handleOccupancyRateChange = (value: number) => {
    const rate = Math.max(0, Math.min(value, 100));
    const occupied = Math.round((rate / 100) * occupancy.totalRooms);
    setOccupancy({
      ...occupancy,
      roomOccupancyRate: rate,
      occupiedRooms: occupied,
    });
  };

  const handleTotalRoomsChange = (value: number) => {
    const total = Math.max(1, value);
    const rate = total > 0 ? (occupancy.occupiedRooms / total) * 100 : 0;
    setOccupancy({
      ...occupancy,
      totalRooms: total,
      roomOccupancyRate: Math.round(rate * 10) / 10,
    });
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">日別稼働状況管理</h2>

      {/* 日付選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          対象日
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-full md:w-64"
        />
      </div>

      {/* 客室稼働情報 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">客室稼働情報</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 総客室数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              総客室数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={occupancy.totalRooms}
                onChange={(e) => handleTotalRoomsChange(parseInt(e.target.value) || 0)}
                className="input flex-1"
              />
              <span className="text-gray-600">室</span>
            </div>
          </div>

          {/* 稼働客室数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              稼働客室数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={occupancy.totalRooms}
                value={occupancy.occupiedRooms}
                onChange={(e) => handleOccupiedRoomsChange(parseInt(e.target.value) || 0)}
                className="input flex-1"
              />
              <span className="text-gray-600">室</span>
            </div>
          </div>

          {/* 稼働率 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              稼働率
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={occupancy.roomOccupancyRate}
                onChange={(e) => handleOccupancyRateChange(parseFloat(e.target.value) || 0)}
                className="input flex-1"
              />
              <span className="text-gray-600">%</span>
            </div>
          </div>
        </div>

        {/* 稼働率の視覚表示 */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
            <div
              className="bg-primary-600 h-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-300"
              style={{ width: `${occupancy.roomOccupancyRate}%` }}
            >
              {occupancy.roomOccupancyRate > 10 && `${occupancy.roomOccupancyRate.toFixed(1)}%`}
            </div>
            {occupancy.roomOccupancyRate <= 10 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-sm">
                {occupancy.roomOccupancyRate.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 宴会情報 */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">宴会情報</h3>

        <div className="space-y-4">
          {/* 宴会有無 */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={occupancy.hasBanquet}
                onChange={(e) => setOccupancy({
                  ...occupancy,
                  hasBanquet: e.target.checked,
                  banquetGuestCount: e.target.checked ? occupancy.banquetGuestCount : 0,
                })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="font-medium text-gray-700">宴会あり</span>
            </label>
          </div>

          {/* 宴会人数 */}
          {occupancy.hasBanquet && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                宴会人数
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={occupancy.banquetGuestCount || 0}
                  onChange={(e) => setOccupancy({
                    ...occupancy,
                    banquetGuestCount: parseInt(e.target.value) || 0,
                  })}
                  className="input w-full md:w-48"
                />
                <span className="text-gray-600">人</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">稼働状況について</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• この情報は自動シフト生成時に必要人数を調整するために使用されます</li>
          <li>• 稼働率が高いほど、より多くのスタッフが必要になります</li>
          <li>• 宴会がある場合、追加のスタッフが必要になります</li>
        </ul>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
