import { useState, useEffect } from 'react';
import type { Building } from '../types';
import { buildingStorage } from '../utils/autoShiftStorage';
import { generateId } from '../utils/helpers';

export default function BuildingManagement() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Building>>({});

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const data = await buildingStorage.getAll();
      setBuildings(data);
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const maxOrder = buildings.length > 0
      ? Math.max(...buildings.map(b => b.displayOrder))
      : 0;

    const newBuilding: Building = {
      id: generateId(),
      name: '',
      totalRooms: 0,
      displayOrder: maxOrder + 1,
      isActive: true,
    };

    setBuildings([...buildings, newBuilding]);
    setEditingId(newBuilding.id);
    setEditForm(newBuilding);
  };

  const handleEdit = (building: Building) => {
    setEditingId(building.id);
    setEditForm(building);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    loadBuildings(); // 新規追加をキャンセルした場合に元に戻す
  };

  const handleSave = async () => {
    if (!editingId || !editForm.name || editForm.totalRooms === undefined) {
      alert('館名と総客室数を入力してください');
      return;
    }

    setSaving(true);
    try {
      const isNew = !buildings.find(b => b.id === editingId);

      if (isNew) {
        await buildingStorage.add({
          name: editForm.name,
          totalRooms: editForm.totalRooms,
          displayOrder: editForm.displayOrder || 0,
          isActive: editForm.isActive !== false,
        });
      } else {
        await buildingStorage.update(editingId, editForm);
      }

      setEditingId(null);
      setEditForm({});
      await loadBuildings();
    } catch (error) {
      console.error('Error saving building:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この館を削除してもよろしいですか？\n※関連する客室データも削除されます。')) {
      return;
    }

    setSaving(true);
    try {
      await buildingStorage.delete(id);
      await loadBuildings();
    } catch (error) {
      console.error('Error deleting building:', error);
      alert('削除に失敗しました');
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">館マスタ管理</h2>
        <button
          onClick={handleAdd}
          className="btn btn-primary"
          disabled={editingId !== null}
        >
          + 館を追加
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                表示順
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                館名
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                総客室数
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
            {buildings.map((building) => (
              <tr key={building.id} className="border-t hover:bg-gray-50">
                {editingId === building.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.displayOrder || 0}
                        onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) })}
                        className="input w-20"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="input w-full"
                        placeholder="本館、新館など"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.totalRooms || 0}
                        onChange={(e) => setEditForm({ ...editForm, totalRooms: parseInt(e.target.value) })}
                        className="input w-24 text-right"
                        min="0"
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
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {building.displayOrder}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {building.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {building.totalRooms}室
                    </td>
                    <td className="px-4 py-3 text-center">
                      {building.isActive ? (
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
                          onClick={() => handleEdit(building)}
                          disabled={editingId !== null}
                          className="btn btn-secondary text-sm px-3 py-1"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(building.id)}
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

      {buildings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>館が登録されていません</p>
          <p className="text-sm mt-2">「+ 館を追加」ボタンから登録してください</p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-semibold text-blue-900 mb-2">館マスタについて</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 本館、新館、別館など、旅館の建物を管理します</li>
          <li>• 総客室数は館全体の部屋数を設定してください</li>
          <li>• 表示順は画面上での並び順を決定します（小さい順に表示）</li>
          <li>• 無効にすると稼働状況などの画面で非表示になります</li>
        </ul>
      </div>
    </div>
  );
}
