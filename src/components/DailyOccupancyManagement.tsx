import { useState, useEffect, useRef } from 'react';
import type { DailyOccupancy, Building } from '../types';
import { dailyOccupancyStorage, buildingStorage, roomStorage } from '../utils/autoShiftStorage';
import { getToday } from '../utils/helpers';
import { generateOccupancySampleCSV } from '../utils/csvParser';

export default function DailyOccupancyManagement() {
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [occupancies, setOccupancies] = useState<DailyOccupancy[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importPreview, setImportPreview] = useState<DailyOccupancy[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [buildingsData, occupancyData] = await Promise.all([
        buildingStorage.getAll(),
        dailyOccupancyStorage.getByDate(selectedDate),
      ]);

      setBuildings(buildingsData);

      // 館ごとのデータを初期化（データがない館は空のデータを作成）
      const occupancyMap = new Map<string, DailyOccupancy>();
      occupancyData.forEach(occ => {
        occupancyMap.set(occ.buildingId, occ);
      });

      const initializedOccupancies = buildingsData.map(building => {
        const existing = occupancyMap.get(building.id);
        if (existing) {
          return existing;
        }
        // データがない場合は初期値
        return {
          id: '',
          date: selectedDate,
          buildingId: building.id,
          roomOccupancyRate: 0,
          totalRooms: building.totalRooms,
          occupiedRooms: 0,
          hasBanquet: false,
          banquetGuestCount: 0,
        };
      });

      setOccupancies(initializedOccupancies);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (buildingId: string) => {
    const occupancy = occupancies.find(o => o.buildingId === buildingId);
    if (!occupancy) return;

    setSaving(true);
    try {
      await dailyOccupancyStorage.upsert(occupancy);
      alert('保存しました');
      await loadData();
    } catch (error) {
      console.error('Error saving occupancy:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleOccupiedRoomsChange = (buildingId: string, value: number) => {
    setOccupancies(prev => prev.map(occ => {
      if (occ.buildingId !== buildingId) return occ;

      const occupied = Math.max(0, Math.min(value, occ.totalRooms));
      const rate = occ.totalRooms > 0 ? (occupied / occ.totalRooms) * 100 : 0;
      return {
        ...occ,
        occupiedRooms: occupied,
        roomOccupancyRate: Math.round(rate * 10) / 10,
      };
    }));
  };

  const handleOccupancyRateChange = (buildingId: string, value: number) => {
    setOccupancies(prev => prev.map(occ => {
      if (occ.buildingId !== buildingId) return occ;

      const rate = Math.max(0, Math.min(value, 100));
      const occupied = Math.round((rate / 100) * occ.totalRooms);
      return {
        ...occ,
        roomOccupancyRate: rate,
        occupiedRooms: occupied,
      };
    }));
  };

  const handleBanquetChange = (buildingId: string, hasBanquet: boolean) => {
    setOccupancies(prev => prev.map(occ => {
      if (occ.buildingId !== buildingId) return occ;

      return {
        ...occ,
        hasBanquet,
        banquetGuestCount: hasBanquet ? occ.banquetGuestCount : 0,
      };
    }));
  };

  const handleBanquetGuestCountChange = (buildingId: string, value: number) => {
    setOccupancies(prev => prev.map(occ => {
      if (occ.buildingId !== buildingId) return occ;

      return {
        ...occ,
        banquetGuestCount: value,
      };
    }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        // CSVから部屋番号を抽出して館を判定
        const lines = text.split('\n');
        const roomNumberMap = new Map<string, string[]>(); // buildingId -> roomNumbers[]

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // CSVをパースして部屋番号を取得（簡易版、実際はparseCSVLineを使用）
          const parts = line.split(',');
          if (parts.length >= 12) {
            const roomNumber = parts[11].trim().replace(/"/g, '');
            if (roomNumber) {
              // 部屋番号から館を判定
              const room = await roomStorage.getByRoomNumber(roomNumber);
              if (room) {
                if (!roomNumberMap.has(room.buildingId)) {
                  roomNumberMap.set(room.buildingId, []);
                }
                roomNumberMap.get(room.buildingId)!.push(roomNumber);
              }
            }
          }
        }

        // 館ごとに集計
        const buildingOccupancies: DailyOccupancy[] = [];
        for (const building of buildings) {
          const roomNumbers = roomNumberMap.get(building.id) || [];
          const occupiedRooms = roomNumbers.length;
          const rate = building.totalRooms > 0 ? (occupiedRooms / building.totalRooms) * 100 : 0;

          buildingOccupancies.push({
            id: '',
            date: selectedDate,
            buildingId: building.id,
            roomOccupancyRate: Math.round(rate * 10) / 10,
            totalRooms: building.totalRooms,
            occupiedRooms,
            hasBanquet: false,
            banquetGuestCount: 0,
          });
        }

        setImportPreview(buildingOccupancies);
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
      await loadData();
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

  const getBuildingName = (buildingId: string): string => {
    return buildings.find(b => b.id === buildingId)?.name || '不明';
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (buildings.length === 0) {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">日別稼働状況管理</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800">
            稼働状況を管理する前に、先に館マスタを登録してください
          </p>
        </div>
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

      {/* 館ごとの稼働状況 */}
      {occupancies.map((occupancy) => (
        <div key={occupancy.buildingId} className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {getBuildingName(occupancy.buildingId)}
          </h3>

          {/* 客室稼働情報 */}
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-3">客室稼働情報</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 総客室数 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  総客室数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={occupancy.totalRooms}
                    className="input flex-1 bg-gray-100"
                    disabled
                  />
                  <span className="text-gray-600">室</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">※館マスタで設定</p>
              </div>

              {/* 稼働客室数 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  稼働客室数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={occupancy.totalRooms}
                    value={occupancy.occupiedRooms}
                    onChange={(e) => handleOccupiedRoomsChange(occupancy.buildingId, parseInt(e.target.value) || 0)}
                    className="input flex-1"
                  />
                  <span className="text-gray-600">室</span>
                </div>
              </div>

              {/* 稼働率 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  稼働率
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={occupancy.roomOccupancyRate}
                    onChange={(e) => handleOccupancyRateChange(occupancy.buildingId, parseFloat(e.target.value) || 0)}
                    className="input flex-1"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>
            </div>

            {/* 稼働率の視覚表示 */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className="bg-primary-600 h-full flex items-center justify-center text-white font-semibold text-xs transition-all duration-300"
                  style={{ width: `${occupancy.roomOccupancyRate}%` }}
                >
                  {occupancy.roomOccupancyRate > 10 && `${occupancy.roomOccupancyRate.toFixed(1)}%`}
                </div>
                {occupancy.roomOccupancyRate <= 10 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-xs">
                    {occupancy.roomOccupancyRate.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 宴会情報 */}
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-3">宴会情報</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={occupancy.hasBanquet}
                    onChange={(e) => handleBanquetChange(occupancy.buildingId, e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="font-medium text-gray-700">宴会あり</span>
                </label>
              </div>

              {occupancy.hasBanquet && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    宴会人数
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={occupancy.banquetGuestCount || 0}
                      onChange={(e) => handleBanquetGuestCountChange(occupancy.buildingId, parseInt(e.target.value) || 0)}
                      className="input w-full md:w-48"
                    />
                    <span className="text-gray-600">人</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <button
              onClick={() => handleSave(occupancy.buildingId)}
              disabled={saving}
              className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      ))}

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-900 mb-2">稼働状況について</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• この情報は自動シフト生成時に必要人数を調整するために使用されます</li>
          <li>• 稼働率が高いほど、より多くのスタッフが必要になります</li>
          <li>• 宴会がある場合、追加のスタッフが必要になります</li>
          <li>• CSVインポートで予約データから自動的に館別の稼働状況を取り込めます</li>
        </ul>
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
                      {importPreview.length}館分の稼働状況データが見つかりました
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h4>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">館</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">稼働客室数</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">稼働率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((occ) => (
                            <tr key={occ.buildingId} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">{getBuildingName(occ.buildingId)}</td>
                              <td className="px-4 py-2 text-right">{occ.occupiedRooms}室</td>
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
                      <li>• 同じ日付・館のデータが既に存在する場合は上書きされます</li>
                      <li>• 客室マスタに登録されている部屋番号から館を自動判定します</li>
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
                      {saving ? 'インポート中...' : `${importPreview.length}館分をインポート`}
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
