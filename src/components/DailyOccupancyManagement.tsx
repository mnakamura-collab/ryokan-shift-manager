import { useState, useEffect, useRef } from 'react';
import type { DailyOccupancy } from '../types';
import { dailyOccupancyStorage } from '../utils/autoShiftStorage';
import { getToday, formatDateJP } from '../utils/helpers';
import { parseOccupancyCSV, convertToOccupancy, generateOccupancySampleCSV } from '../utils/csvParser';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importPreview, setImportPreview] = useState<DailyOccupancy[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const csvOccupancies = parseOccupancyCSV(text);
        const newOccupancies = convertToOccupancy(csvOccupancies, occupancy.totalRooms);
        setImportPreview(newOccupancies);
        setImportError('');
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'CSVの解析に失敗しました');
        setImportPreview([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;

    setSaving(true);
    try {
      for (const occ of importPreview) {
        await dailyOccupancyStorage.upsert(occ);
      }

      alert(`${importPreview.length}件の稼働状況をインポートしました`);
      setShowImportModal(false);
      setImportPreview([]);
      setImportError('');
      await loadOccupancy();
    } catch (error) {
      console.error('Error importing occupancies:', error);
      alert('インポートに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSample = () => {
    const csv = generateOccupancySampleCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '稼働状況サンプル.csv';
    link.click();
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">日別稼働状況管理</h2>
        <button
          onClick={() => setShowImportModal(true)}
          className="btn btn-secondary"
        >
          CSVインポート
        </button>
      </div>

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

      {/* CSVインポートモーダル */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">稼働状況CSVインポート</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* ファイル選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSVファイルを選択
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
                <p className="mt-2 text-sm text-gray-500">
                  予約管理システムからエクスポートしたCSVファイルを選択してください
                </p>
              </div>

              {/* サンプルダウンロード */}
              <div className="mb-6">
                <button
                  onClick={handleDownloadSample}
                  className="btn btn-secondary text-sm"
                >
                  サンプルCSVをダウンロード
                </button>
              </div>

              {/* エラー表示 */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                  <p className="text-sm text-red-800">{importError}</p>
                </div>
              )}

              {/* プレビュー */}
              {importPreview.length > 0 && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                    <p className="text-sm text-green-800 font-semibold">
                      {importPreview.length}件の稼働状況データが見つかりました
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h4>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">日付</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">稼働客室数</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">宿泊人数</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">稼働率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((occ, index) => (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">{formatDateJP(occ.date)}</td>
                              <td className="px-4 py-2 text-right">{occ.occupiedRooms}室</td>
                              <td className="px-4 py-2 text-right text-gray-600">
                                {/* guestCountを表示（convertToOccupancyで追加する必要あり） */}
                                -
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                {occ.roomOccupancyRate.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">インポート時の注意</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 同じ日付のデータが既に存在する場合は上書きされます</li>
                      <li>• 総客室数は現在の設定値（{occupancy.totalRooms}室）が使用されます</li>
                      <li>• 宴会情報は手動で設定する必要があります</li>
                    </ul>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportPreview([]);
                        setImportError('');
                      }}
                      className="btn btn-secondary"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={saving}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'インポート中...' : `${importPreview.length}件をインポート`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
