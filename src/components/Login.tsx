import { useState, useEffect } from 'react';
import type { Staff } from '../types';
import { staffStorage } from '../utils/supabaseStorage';

interface LoginProps {
  onLogin: (user: Staff) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
      console.log('Loading staff data...');
      const data = await staffStorage.getAll();
      console.log('Staff data loaded:', data);
      setStaff(data);
      setLoading(false);
    };
    loadStaff();
  }, []);

  const handleLogin = () => {
    const user = staff.find((s) => s.id === selectedStaff);
    if (user) {
      onLogin(user);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          旅館シフト管理
        </h1>
        <p className="text-center text-gray-600 mb-8">
          ログインするスタッフを選択してください
        </p>

        <div className="space-y-4">
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="input w-full"
          >
            <option value="">スタッフを選択...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.position} ({s.role === 'admin' ? '管理者' : 'スタッフ'})
              </option>
            ))}
          </select>

          <button
            onClick={handleLogin}
            disabled={!selectedStaff}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  );
}
