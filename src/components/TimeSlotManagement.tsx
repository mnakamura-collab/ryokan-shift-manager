import { useState, useEffect } from 'react';
import type { TimeSlot } from '../types';
import { timeSlotStorage } from '../utils/autoShiftStorage';

export default function TimeSlotManagement() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    setLoading(true);
    const data = await timeSlotStorage.getAll();
    setTimeSlots(data);
    setLoading(false);
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
        <h2 className="text-2xl font-bold">時間帯マスタ管理</h2>
      </div>

      <div className="card">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">表示順</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">時間帯名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">開始時刻</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">終了時刻</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {timeSlots.map((slot) => {
              const start = slot.startTime;
              const end = slot.endTime;
              const duration = calculateDuration(start, end);

              return (
                <tr key={slot.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{slot.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {slot.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{start}</td>
                  <td className="px-4 py-3 text-sm font-mono">{end}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {timeSlots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>時間帯が登録されていません。</p>
            <p className="text-sm mt-2">Supabaseで初期データを登録してください。</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 使い方</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 現在の時間帯設定が表示されています</li>
          <li>• これらの時間帯を基準にシフトの必要人数を設定します</li>
          <li>• 時間帯の変更はSupabaseのSQL Editorで行ってください</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="早朝・夜勤対応"
          description="深夜時間帯(22:00-05:00)は日をまたぐシフトに対応"
          icon="🌙"
        />
        <InfoCard
          title="柔軟な設定"
          description="旅館の運営に合わせて時間帯を調整可能"
          icon="⚙️"
        />
        <InfoCard
          title="自動計算"
          description="この時間帯を基準に必要人数を自動計算"
          icon="🤖"
        />
      </div>
    </div>
  );
}

function calculateDuration(start: string, end: string): string {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  // 日をまたぐ場合
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${minutes}分`;
}

function InfoCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
