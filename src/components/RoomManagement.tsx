import { useState, useEffect, useRef } from 'react';
import type { Room, Building } from '../types';
import { roomStorage, buildingStorage } from '../utils/autoShiftStorage';
import { generateId } from '../utils/helpers';

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Room>>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, buildingsData] = await Promise.all([
        roomStorage.getAll(),
        buildingStorage.getAll(),
      ]);
      setRooms(roomsData);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = selectedBuildingFilter === 'all'
    ? rooms
    : rooms.filter(r => r.buildingId === selectedBuildingFilter);

  const handleAdd = () => {
    const newRoom: Room = {
      id: generateId(),
      roomNumber: '',
      buildingId: buildings[0]?.id || '',
      roomType: '和室',
      hasBath: false,
      hasToilet: true,
      isActive: true,
    };

    setRooms([...rooms, newRoom]);
    setEditingId(newRoom.id);
    setEditForm(newRoom);
  };

  const handleEdit = (room: Room) => {
    setEditingId(room.id);
    setEditForm(room);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    loadData(); // 新規追加をキャンセルした場合に元に戻す
  };

  const handleSave = async () => {
    if (!editingId || !editForm.roomNumber || !editForm.buildingId) {
      alert('部屋番号と館を選択してください');
      return;
    }

    setSaving(true);
    try {
      const isNew = !rooms.find(r => r.id === editingId);

      if (isNew) {
        await roomStorage.add({
          roomNumber: editForm.roomNumber,
          buildingId: editForm.buildingId,
          roomType: editForm.roomType || '和室',
          hasBath: editForm.hasBath || false,
          hasToilet: editForm.hasToilet !== false,
          isActive: editForm.isActive !== false,
        });
      } else {
        await roomStorage.update(editingId, editForm);
      }

      setEditingId(null);
      setEditForm({});
      await loadData();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この客室を削除してもよろしいですか？')) {
      return;
    }

    setSaving(true);
    try {
      await roomStorage.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkImportText.trim().split('\n');
    if (lines.length === 0) {
      alert('部屋番号を入力してください');
      return;
    }

    if (!buildings.length) {
      alert('先に館マスタを登録してください');
      return;
    }

    const defaultBuilding = buildings[0];
    const newRooms: Omit<Room, 'id'>[] = [];

    for (const line of lines) {
      const parts = line.trim().split(',');
      if (parts.length === 0 || !parts[0]) continue;

      const roomNumber = parts[0].trim();

      // 既存の部屋番号をスキップ
      if (rooms.some(r => r.roomNumber === roomNumber)) {
        console.log(`スキップ: ${roomNumber} は既に登録済み`);
        continue;
      }

      newRooms.push({
        roomNumber,
        buildingId: defaultBuilding.id,
        roomType: '和室',
        hasBath: false,
        hasToilet: true,
        isActive: true,
      });
    }

    if (newRooms.length === 0) {
      alert('インポートする新しい部屋がありません');
      return;
    }

    if (!confirm(`${newRooms.length}件の客室を「${defaultBuilding.name}」に一括登録しますか？\n※登録後、館や設備は個別に編集できます。`)) {
      return;
    }

    setSaving(true);
    try {
      await roomStorage.bulkAdd(newRooms);
      alert(`${newRooms.length}件の客室を登録しました`);
      setShowBulkImport(false);
      setBulkImportText('');
      await loadData();
    } catch (error) {
      console.error('Error bulk importing rooms:', error);
      alert('一括登録に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // CSVから部屋番号列を抽出
      const lines = text.split('\n');
      const roomNumbers: string[] = [];

      for (let i = 1; i < lines.length; i++) { // ヘッダーをスキップ
        const line = lines[i].trim();
        if (!line) continue;

        // カンマで分割して部屋番号列（12列目、インデックス11）を取得
        const parts = line.split(',');
        if (parts.length >= 12) {
          const roomNumber = parts[11].trim().replace(/"/g, '');
          if (roomNumber && !roomNumbers.includes(roomNumber)) {
            roomNumbers.push(roomNumber);
          }
        }
      }

      setBulkImportText(roomNumbers.join('\n'));
    };
    reader.readAsText(file, 'UTF-8');
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

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">客室マスタ管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="btn btn-secondary"
          >
            一括登録
          </button>
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            disabled={editingId !== null || buildings.length === 0}
          >
            + 客室を追加
          </button>
        </div>
      </div>

      {buildings.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p className="text-yellow-800">
            客室を登録する前に、先に館マスタを登録してください
          </p>
        </div>
      )}

      {/* 館でフィルター */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          表示する館
        </label>
        <select
          value={selectedBuildingFilter}
          onChange={(e) => setSelectedBuildingFilter(e.target.value)}
          className="input w-64"
        >
          <option value="all">すべて</option>
          {buildings.map(building => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                部屋番号
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                館
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                客室タイプ
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                バス
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                トイレ
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                有効
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room) => (
              <tr key={room.id} className="border-t hover:bg-gray-50">
                {editingId === room.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.roomNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                        className="input w-32"
                        placeholder="701"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.buildingId || ''}
                        onChange={(e) => setEditForm({ ...editForm, buildingId: e.target.value })}
                        className="input w-full"
                      >
                        {buildings.map(building => (
                          <option key={building.id} value={building.id}>
                            {building.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.roomType || ''}
                        onChange={(e) => setEditForm({ ...editForm, roomType: e.target.value })}
                        className="input w-full"
                        placeholder="和室、洋室など"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={editForm.hasBath || false}
                        onChange={(e) => setEditForm({ ...editForm, hasBath: e.target.checked })}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={editForm.hasToilet !== false}
                        onChange={(e) => setEditForm({ ...editForm, hasToilet: e.target.checked })}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={editForm.isActive !== false}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="btn btn-primary text-sm px-3 py-1"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="btn btn-secondary text-sm px-3 py-1"
                        >
                          キャンセル
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {room.roomNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getBuildingName(room.buildingId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {room.roomType}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {room.hasBath ? '○' : '×'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {room.hasToilet ? '○' : '×'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {room.isActive ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                          有効
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded">
                          無効
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(room)}
                          disabled={editingId !== null}
                          className="btn btn-secondary text-sm px-3 py-1"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          disabled={editingId !== null}
                          className="btn btn-danger text-sm px-3 py-1"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>客室が登録されていません</p>
          <p className="text-sm mt-2">「+ 客室を追加」または「一括登録」から登録してください</p>
        </div>
      )}

      {/* 一括登録モーダル */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">客室一括登録</h3>
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportText('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSVファイルから部屋番号を取り込む
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  部屋番号（1行に1つ）
                </label>
                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  className="input w-full h-64 font-mono text-sm"
                  placeholder="701&#10;702&#10;703&#10;..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  ※ CSVから自動取り込み、または直接入力してください
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  一括登録では、すべての客室が「{buildings[0]?.name || '最初の館'}」に登録されます。<br />
                  登録後、個別に編集して館や設備の設定を変更してください。
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportText('');
                  }}
                  className="btn btn-secondary"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={saving || !bulkImportText.trim()}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '登録中...' : '一括登録'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-900 mb-2">客室マスタについて</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 各部屋番号と所属する館を紐付けます</li>
          <li>• CSVインポート時、部屋番号から館を自動判定します</li>
          <li>• 一括登録機能で予約CSVから部屋番号を一括取り込みできます</li>
          <li>• バス・トイレの有無を個別に設定できます</li>
        </ul>
      </div>
    </div>
  );
}
