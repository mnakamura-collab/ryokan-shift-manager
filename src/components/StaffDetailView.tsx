import { useState, useEffect } from 'react';
import type { Staff, StaffUnavailableDate } from '../types';
import StaffAvailabilitySettings from './StaffAvailabilitySettings';
import StaffWorkLimitSettings from './StaffWorkLimitSettings';
import StandardShiftNew from './StandardShiftNew';
import { staffUnavailableDateStorage } from '../utils/autoShiftStorage';
import { formatDateJP } from '../utils/helpers';

interface StaffDetailViewProps {
  selectedStaff: Staff;
  allStaff: Staff[];
  onClose: () => void;
  onUpdate: () => void;
}

type DetailTab = 'basic' | 'availability' | 'standardshift' | 'worklimit' | 'requests';

export default function StaffDetailView({
  selectedStaff,
  allStaff,
  onClose,
  onUpdate: _onUpdate
}: StaffDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [unavailableRequests, setUnavailableRequests] = useState<StaffUnavailableDate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab, selectedStaff.id]);

  const loadRequests = async () => {
    setLoading(true);
    const requests = await staffUnavailableDateStorage.getByStaffId(selectedStaff.id);
    setUnavailableRequests(requests);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: '承認待ち', class: 'bg-yellow-100 text-yellow-800' },
      approved: { text: '承認済み', class: 'bg-green-100 text-green-800' },
      rejected: { text: '却下', class: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
            <p className="text-primary-100 text-sm">{selectedStaff.position}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              基本情報
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'availability'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              勤務可能時間
            </button>
            <button
              onClick={() => setActiveTab('standardshift')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'standardshift'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              標準シフト
            </button>
            <button
              onClick={() => setActiveTab('worklimit')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'worklimit'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              労働時間制約
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              希望休一覧
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                  <div className="input bg-gray-50">{selectedStaff.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                  <div className="input bg-gray-50">{selectedStaff.position}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <div className="input bg-gray-50">{selectedStaff.email || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">役割</label>
                  <div className="input bg-gray-50">
                    {selectedStaff.role === 'admin' ? '管理者' : '一般スタッフ'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">信頼度スコア</label>
                  <div className="input bg-gray-50">{selectedStaff.trustScore}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <div className="input bg-gray-50">
                    {selectedStaff.isActive ? '有効' : '無効'}
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  💡 基本情報の編集は「スタッフ管理」画面の編集ボタンから行えます
                </p>
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <StaffAvailabilitySettings
              currentUser={selectedStaff}
              staff={allStaff}
              isAdminView={true}
            />
          )}

          {activeTab === 'standardshift' && (
            <StandardShiftNew
              currentUser={selectedStaff}
              staff={allStaff}
              onUpdate={() => {}}
              isAdminView={true}
            />
          )}

          {activeTab === 'worklimit' && (
            <StaffWorkLimitSettings
              currentUser={selectedStaff}
              staff={allStaff}
              isAdminView={true}
            />
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">希望休申請一覧</h3>

              {loading ? (
                <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : unavailableRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>希望休の申請はありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">日付</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">タイプ</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">理由</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {unavailableRequests
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(request => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{formatDateJP(request.date)}</td>
                            <td className="px-4 py-3 text-sm">
                              {request.unavailableType === 'all_day' ? '終日' : '時間帯指定'}
                            </td>
                            <td className="px-4 py-3 text-sm">{request.reason || '-'}</td>
                            <td className="px-4 py-3 text-sm">{getStatusBadge(request.status)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 希望休の承認・却下は「希望休承認」タブから行えます
                </p>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
