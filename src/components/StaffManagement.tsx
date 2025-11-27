import { useState, useRef, useEffect } from 'react';
import type { Staff, Position } from '../types';
import { staffStorage, positionStorage } from '../utils/supabaseStorage';
import { generateId, getTrustScoreColor } from '../utils/helpers';
import { parseStaffCSV, convertToStaff, generateStaffSampleCSV } from '../utils/csvParser';
import StaffDetailView from './StaffDetailView';

interface StaffManagementProps {
  staff: Staff[];
  onUpdate: () => void;
}

export default function StaffManagement({ staff, onUpdate }: StaffManagementProps) {
  const [positions, setPositions] = useState<string[]>([]);

  useEffect(() => {
    const loadPositions = async () => {
      const activePositions = await positionStorage.getActive();
      setPositions(activePositions.map(p => p.name));
    };
    loadPositions();
  }, []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [importPreview, setImportPreview] = useState<Staff[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '' as Position,
    role: 'user' as 'admin' | 'user',
    email: '',
    password: 'password',
  });

  useEffect(() => {
    if (positions.length > 0 && !formData.position) {
      setFormData(prev => ({ ...prev, position: positions[0] }));
    }
  }, [positions]);

  const resetForm = () => {
    setFormData({
      name: '',
      position: positions.length > 0 ? positions[0] : '',
      role: 'user',
      email: '',
      password: 'password',
    });
    setEditingStaff(null);
    setShowAddModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStaff) {
      await staffStorage.update(editingStaff.id, {
        name: formData.name,
        position: formData.position,
        role: formData.role,
        email: formData.email,
      });
    } else {
      const newStaff: Staff = {
        id: generateId(),
        name: formData.name,
        position: formData.position,
        role: formData.role,
        trustScore: 100,
        isActive: true,
        email: formData.email,
        loginId: formData.email,
        passwordHash: formData.password,
        is2faEnabled: false,
      };
      await staffStorage.add(newStaff);
    }

    await onUpdate();
    resetForm();
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      position: staffMember.position,
      role: staffMember.role,
      email: staffMember.email,
      password: 'password',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このスタッフを削除してもよろしいですか？')) {
      await staffStorage.delete(id);
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
        const csvStaff = parseStaffCSV(text);
        const newStaff = convertToStaff(csvStaff);
        setImportPreview(newStaff);
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

    for (const staffMember of importPreview) {
      await staffStorage.add(staffMember);
    }

    await onUpdate();
    setShowImportModal(false);
    setImportPreview([]);
    setImportError('');
    alert(`${importPreview.length}名のスタッフをインポートしました`);
  };

  const handleDownloadSample = () => {
    const csv = generateStaffSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'スタッフサンプル.csv';
    link.click();
  };

  const sortedStaff = [...staff].sort((a, b) => b.trustScore - a.trustScore);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">スタッフ管理</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary"
            >
              CSVインポート
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              + スタッフを追加
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">名前</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">役職</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">権限</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">信頼度</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staffMember) => (
                <tr key={staffMember.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedStaff(staffMember)}
                      className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      {staffMember.name}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge bg-blue-100 text-blue-800 border-blue-300">
                      {staffMember.position}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${staffMember.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                      {staffMember.role === 'admin' ? '管理者' : 'スタッフ'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${getTrustScoreColor(staffMember.trustScore)}`}
                          style={{ width: `${staffMember.trustScore}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-700 min-w-[3ch]">{staffMember.trustScore}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleEdit(staffMember)}
                      className="text-primary-600 hover:text-primary-800 mr-3 text-sm font-medium"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(staffMember.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {staff.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            スタッフが登録されていません
          </p>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editingStaff ? 'スタッフ編集' : 'スタッフ追加'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="山田太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役職
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as Position })}
                  className="input w-full"
                >
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="input w-full"
                >
                  <option value="user">スタッフ</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input w-full"
                  placeholder="staff@example.com"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    初期パスワード
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input w-full"
                    placeholder="password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ※ 初回ログイン後に変更してもらってください
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary flex-1"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingStaff ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800">スタッフCSVインポート</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>必須カラム:</strong> 名前, 役職, 権限
                </p>
                <p className="text-sm text-blue-800 mb-2">
                  <strong>オプション:</strong> 信頼度
                </p>
                <p className="text-sm text-blue-800">
                  <strong>役職:</strong> フロント, 清掃, レストラン, 配膳, 喫茶店, 調理, その他
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
                    プレビュー ({importPreview.length}名)
                  </h4>
                  <div className="border rounded max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">名前</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">役職</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">権限</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">信頼度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((s, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{s.name}</td>
                            <td className="py-2 px-3">{s.position}</td>
                            <td className="py-2 px-3">{s.role === 'admin' ? '管理者' : 'スタッフ'}</td>
                            <td className="py-2 px-3">{s.trustScore}</td>
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
                  インポート ({importPreview.length}名)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStaff && (
        <StaffDetailView
          selectedStaff={selectedStaff}
          allStaff={staff}
          onClose={() => setSelectedStaff(null)}
          onUpdate={() => {
            onUpdate();
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
}
