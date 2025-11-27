import { useState, useEffect } from 'react';
import type { Staff, StaffUnavailableDate, TimeSlot } from '../types';
import { staffUnavailableDateStorage, timeSlotStorage } from '../utils/autoShiftStorage';
import { formatDateJP } from '../utils/helpers';

interface UnavailableDateRequestProps {
  currentUser: Staff;
}

export default function UnavailableDateRequest({ currentUser }: UnavailableDateRequestProps) {
  const [requests, setRequests] = useState<StaffUnavailableDate[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // フォーム状態
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<'all_day' | 'time_slot'>('all_day');
  const [formTimeSlots, setFormTimeSlots] = useState<string[]>([]);
  const [formReason, setFormReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [requestsData, timeSlotsData] = await Promise.all([
      staffUnavailableDateStorage.getByStaffId(currentUser.id),
      timeSlotStorage.getAll(),
    ]);

    setRequests(requestsData);
    setTimeSlots(timeSlotsData);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDate) {
      alert('日付を選択してください');
      return;
    }

    if (formType === 'time_slot' && formTimeSlots.length === 0) {
      alert('時間帯を選択してください');
      return;
    }

    setSubmitting(true);
    try {
      await staffUnavailableDateStorage.add({
        staffId: currentUser.id,
        date: formDate,
        unavailableType: formType,
        timeSlotIds: formType === 'time_slot' ? formTimeSlots : undefined,
        reason: formReason || '希望休',
        status: 'pending',
      });

      alert('希望休を申請しました');
      setShowForm(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('申請に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この申請を削除してもよろしいですか？')) {
      return;
    }

    try {
      await staffUnavailableDateStorage.delete(id);
      alert('削除しました');
      await loadData();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormDate('');
    setFormType('all_day');
    setFormTimeSlots([]);
    setFormReason('');
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
        <h2 className="text-2xl font-bold">希望休申請</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'キャンセル' : '+ 新規申請'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">希望休の申請</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日付 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイプ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all_day"
                    checked={formType === 'all_day'}
                    onChange={() => setFormType('all_day')}
                    className="mr-2"
                  />
                  終日
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="time_slot"
                    checked={formType === 'time_slot'}
                    onChange={() => setFormType('time_slot')}
                    className="mr-2"
                  />
                  時間帯指定
                </label>
              </div>
            </div>

            {formType === 'time_slot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  時間帯 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {timeSlots.map(slot => (
                    <label key={slot.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formTimeSlots.includes(slot.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormTimeSlots([...formTimeSlots, slot.id]);
                          } else {
                            setFormTimeSlots(formTimeSlots.filter(id => id !== slot.id));
                          }
                        }}
                        className="mr-2"
                      />
                      {slot.name} ({slot.startTime}-{slot.endTime})
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                理由
              </label>
              <input
                type="text"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="例: 私用、有給休暇など"
                className="input"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? '申請中...' : '申請する'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">申請一覧</h3>

        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>申請がありません</p>
            <p className="text-sm mt-2">「+ 新規申請」ボタンから希望休を申請できます</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">日付</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">タイプ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">時間帯</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">理由</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状態</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(request => (
                    <tr key={request.id} className="hover:bg-gray-50">
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
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            削除
                          </button>
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
        <h3 className="font-semibold text-blue-900 mb-2">💡 希望休申請について</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 希望する休日を申請できます</li>
          <li>• 承認待ちの間は削除が可能です</li>
          <li>• 承認されるとシフト生成時に考慮されます</li>
          <li>• 時間帯指定で一部の時間のみ休むことも可能です</li>
        </ul>
      </div>
    </div>
  );
}
