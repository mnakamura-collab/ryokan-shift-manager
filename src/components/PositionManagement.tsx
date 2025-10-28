import { useState } from 'react';
import type { Staff, PositionMaster } from '../types';
import { positionStorage } from '../utils/storage';
import { generateId } from '../utils/helpers';

interface PositionManagementProps {
  currentUser: Staff;
  positions: PositionMaster[];
  onUpdate: () => void;
}

export default function PositionManagement({ currentUser, positions, onUpdate }: PositionManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionMaster | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayOrder: 1,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      displayOrder: positions.length + 1,
      isActive: true,
    });
    setEditingPosition(null);
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPosition) {
      positionStorage.update(editingPosition.id, formData);
    } else {
      const newPosition: PositionMaster = {
        id: generateId(),
        ...formData,
      };
      positionStorage.add(newPosition);
    }

    onUpdate();
    resetForm();
  };

  const handleEdit = (position: PositionMaster) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      displayOrder: position.displayOrder,
      isActive: position.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('この役職を削除してもよろしいですか？\n既存スタッフの役職情報は保持されます。')) {
      positionStorage.delete(id);
      onUpdate();
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    positionStorage.update(id, { isActive });
    onUpdate();
  };

  const handleMoveUp = (position: PositionMaster) => {
    const sorted = [...positions].sort((a, b) => a.displayOrder - b.displayOrder);
    const currentIndex = sorted.findIndex((p) => p.id === position.id);

    if (currentIndex > 0) {
      const prev = sorted[currentIndex - 1];
      positionStorage.update(position.id, { displayOrder: prev.displayOrder });
      positionStorage.update(prev.id, { displayOrder: position.displayOrder });
      onUpdate();
    }
  };

  const handleMoveDown = (position: PositionMaster) => {
    const sorted = [...positions].sort((a, b) => a.displayOrder - b.displayOrder);
    const currentIndex = sorted.findIndex((p) => p.id === position.id);

    if (currentIndex < sorted.length - 1) {
      const next = sorted[currentIndex + 1];
      positionStorage.update(position.id, { displayOrder: next.displayOrder });
      positionStorage.update(next.id, { displayOrder: position.displayOrder });
      onUpdate();
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">
          役職管理は管理者のみアクセスできます
        </p>
      </div>
    );
  }

  const sortedPositions = [...positions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">役職マスタ管理</h2>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + 役職を追加
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          役職の追加・編集・並び替えができます。無効化した役職は選択肢に表示されなくなります。
        </p>

        {positions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">役職が登録されていません</p>
        ) : (
          <div className="space-y-2">
            {sortedPositions.map((position, index) => (
              <div
                key={position.id}
                className={`border rounded-lg p-4 flex justify-between items-center ${
                  position.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveUp(position)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDown(position)}
                      disabled={index === sortedPositions.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▼
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{position.name}</h3>
                    <p className="text-xs text-gray-500">表示順: {position.displayOrder}</p>
                  </div>
                  {!position.isActive && (
                    <span className="badge bg-gray-200 text-gray-600 border-gray-300 text-xs">
                      無効
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={position.isActive}
                      onChange={(e) => handleToggleActive(position.id, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">有効</span>
                  </label>
                  <button
                    onClick={() => handleEdit(position)}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(position.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingPosition ? '役職編集' : '役職追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役職名
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="例: 受付"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示順
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  数字が小さいほど上に表示されます
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  有効にする
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingPosition ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
