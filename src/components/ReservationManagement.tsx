import { useState, useRef } from 'react';
import type { Staff, Reservation } from '../types';
import { reservationStorage } from '../utils/supabaseStorage';
import { generateId, formatDateJP } from '../utils/helpers';
import { parseReservationCSV, convertToReservations, generateSampleCSV } from '../utils/csvParser';

interface ReservationManagementProps {
  currentUser: Staff;
  reservations: Reservation[];
  onUpdate: () => void;
}

export default function ReservationManagement({ currentUser, reservations, onUpdate }: ReservationManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [importPreview, setImportPreview] = useState<Reservation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    guestName: '',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    plan: 'スタンダード',
    requiredStaff: 3,
  });

  const resetForm = () => {
    setFormData({
      guestName: '',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      plan: 'スタンダード',
      requiredStaff: 3,
    });
    setEditingReservation(null);
    setShowAddModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingReservation) {
      await reservationStorage.update(editingReservation.id, {
        guestName: formData.guestName,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        numberOfGuests: formData.numberOfGuests,
        plan: formData.plan,
        requiredStaff: formData.requiredStaff,
      });
    } else {
      const newReservation: Reservation = {
        id: generateId(),
        guestName: formData.guestName,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        numberOfGuests: formData.numberOfGuests,
        plan: formData.plan,
        requiredStaff: formData.requiredStaff,
      };
      await reservationStorage.add(newReservation);
    }

    await onUpdate();
    resetForm();
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      guestName: reservation.guestName,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      numberOfGuests: reservation.numberOfGuests,
      plan: reservation.plan,
      requiredStaff: reservation.requiredStaff,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('この予約を削除してもよろしいですか？')) {
      await reservationStorage.delete(id);
      await onUpdate();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const csvReservations = parseReservationCSV(text);
        const newReservations = convertToReservations(csvReservations);
        setImportPreview(newReservations);
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

    for (const reservation of importPreview) {
      await reservationStorage.add(reservation);
    }

    await onUpdate();
    setShowImportModal(false);
    setImportPreview([]);
    setImportError('');
    alert(`${importPreview.length}件の予約をインポートしました`);
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '予約サンプル.csv';
    link.click();
  };

  // 日付でソート（新しい順）
  const sortedReservations = [...reservations].sort((a, b) =>
    new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()
  );

  // 今日以降の予約のみ表示
  const today = new Date().toISOString().split('T')[0];
  const upcomingReservations = sortedReservations.filter((r) => r.checkInDate >= today);
  const pastReservations = sortedReservations.filter((r) => r.checkInDate < today);

  if (currentUser.role !== 'admin') {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-8">
          予約管理は管理者のみアクセスできます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">予約管理</h2>
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
              CSVインポート
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              + 予約を追加
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 今後の予約 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">今後の予約</h3>
            {upcomingReservations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">今後の予約はありません</p>
            ) : (
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-800">{reservation.guestName}</h4>
                          <span className="badge bg-purple-100 text-purple-800 border-purple-300">
                            {reservation.plan}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <p>チェックイン: {formatDateJP(reservation.checkInDate)}</p>
                          <p>チェックアウト: {formatDateJP(reservation.checkOutDate)}</p>
                          <p>人数: {reservation.numberOfGuests}名</p>
                          <p>必要スタッフ: {reservation.requiredStaff}名</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(reservation)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(reservation.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 過去の予約 */}
          {pastReservations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">過去の予約</h3>
              <div className="space-y-3">
                {pastReservations.slice(0, 5).map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border rounded-lg p-4 bg-gray-50 opacity-75"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-700">{reservation.guestName}</h4>
                          <span className="badge bg-gray-200 text-gray-700 border-gray-300">
                            {reservation.plan}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateJP(reservation.checkInDate)} - {formatDateJP(reservation.checkOutDate)} | {reservation.numberOfGuests}名
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingReservation ? '予約編集' : '予約追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お客様名
                </label>
                <input
                  type="text"
                  required
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="input w-full"
                  placeholder="山田太郎"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    チェックイン
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    チェックアウト
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  人数
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.numberOfGuests}
                  onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プラン
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => {
                    const plan = e.target.value;
                    let requiredStaff = 3;
                    if (plan === 'VIP') requiredStaff = 6;
                    else if (plan === 'プレミアム') requiredStaff = 5;
                    else if (plan === 'デラックス') requiredStaff = 4;
                    setFormData({ ...formData, plan, requiredStaff });
                  }}
                  className="input w-full"
                >
                  <option value="スタンダード">スタンダード</option>
                  <option value="デラックス">デラックス</option>
                  <option value="プレミアム">プレミアム</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  必要スタッフ数
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.requiredStaff}
                  onChange={(e) => setFormData({ ...formData, requiredStaff: parseInt(e.target.value) })}
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  プランに応じて自動設定されます（調整可能）
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingReservation ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800">CSVインポート</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>必須カラム:</strong> お客様名, チェックイン, チェックアウト, 人数, プラン
                </p>
                <p className="text-sm text-blue-800">
                  <strong>オプション:</strong> 必要スタッフ数
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadSample}
                  className="btn btn-secondary text-sm"
                >
                  サンプルCSVをダウンロード
                </button>
              </div>

              <div>
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
                    file:text-sm file:font-medium
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{importError}</p>
                </div>
              )}

              {importPreview.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    プレビュー ({importPreview.length}件)
                  </h4>
                  <div className="border rounded max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">お客様名</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">チェックイン</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">チェックアウト</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">人数</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">プラン</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">必要スタッフ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((res, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{res.guestName}</td>
                            <td className="py-2 px-3">{res.checkInDate}</td>
                            <td className="py-2 px-3">{res.checkOutDate}</td>
                            <td className="py-2 px-3">{res.numberOfGuests}名</td>
                            <td className="py-2 px-3">{res.plan}</td>
                            <td className="py-2 px-3">{res.requiredStaff}名</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportError('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importPreview.length === 0}
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  インポート ({importPreview.length}件)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
