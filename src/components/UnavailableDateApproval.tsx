import { useState, useEffect } from 'react';
import type { Staff, StaffUnavailableDate, TimeSlot } from '../types';
import { staffUnavailableDateStorage, timeSlotStorage } from '../utils/autoShiftStorage';
import { formatDateJP } from '../utils/helpers';

interface UnavailableDateApprovalProps {
  staff: Staff[];
}

export default function UnavailableDateApproval({ staff }: UnavailableDateApprovalProps) {
  const [requests, setRequests] = useState<StaffUnavailableDate[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // 今月と来月のデータを取得
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const [requestsData, timeSlotsData] = await Promise.all([
      staffUnavailableDateStorage.getByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
      timeSlotStorage.getAll(),
    ]);

    setRequests(requestsData);
    setTimeSlots(timeSlotsData);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    if (!confirm('この希望休を承認しますか？')) {
      return;
    }

    try {
      await staffUnavailableDateStorage.updateStatus(id, 'approved');
      alert('承認しました');
      await loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('承認に失敗しました');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('この希望休を却下しますか？')) {
      return;
    }

    try {
      await staffUnavailableDateStorage.updateStatus(id, 'rejected');
      alert('却下しました');
      await loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('却下に失敗しました');
    }
  };

  const handleBulkApprove = async () => {
    const pendingRequests = filteredRequests.filter(r => r.status === 'pending');

    if (pendingRequests.length === 0) {
      alert('承認待ちの申請がありません');
      return;
    }

    if (!confirm(`${pendingRequests.length}件の希望休を一括承認しますか？`)) {
      return;
    }

    try {
      for (const request of pendingRequests) {
        await staffUnavailableDateStorage.updateStatus(request.id, 'approved');
      }
      alert(`${pendingRequests.length}件を承認しました`);
      await loadData();
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('一括承認に失敗しました');
    }
  };

  const getStaffName = (staffId: string) => {
    return staff.find(s => s.id === staffId)?.name || '不明';
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

  const getTimeSlotNames = (timeSlotIds?: string[]) => {
    if (!timeSlotIds || timeSlotIds.length === 0) return '終日';
    return timeSlotIds
      .map(id => timeSlots.find(ts => ts.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">希望休承認</h2>
        {pendingCount > 0 && (
          <button
            onClick={handleBulkApprove}
            className="btn btn-primary"
          >
            承認待ち {pendingCount}件を一括承認
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'all'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          すべて ({requests.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'pending'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          承認待ち ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'approved'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          承認済み ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`px-4 py-2 font-medium transition-colors ${
            filterStatus === 'rejected'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          却下 ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      <div className="card">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>申請がありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">スタッフ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">日付</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">タイプ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">時間帯</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">理由</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状態</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests
                  .sort((a, b) => {
                    // 承認待ち優先、次に日付順
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                  })
                  .map(request => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {getStaffName(request.staffId)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDateJP(request.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.unavailableType === 'all_day' ? '終日' : '時間帯指定'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getTimeSlotNames(request.timeSlotIds)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              却下
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 希望休承認について</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• スタッフからの希望休申請を承認・却下できます</li>
          <li>• 承認した休日は自動シフト生成時に考慮されます</li>
          <li>• 一括承認で承認待ちの申請をまとめて承認できます</li>
          <li>• 承認後も必要に応じて却下に変更できます</li>
        </ul>
      </div>
    </div>
  );
}
