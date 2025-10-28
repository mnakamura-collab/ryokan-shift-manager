import { useState } from 'react';
import type { Staff } from '../types';
import { staffStorage } from '../utils/storage';

interface LoginProps {
  onLogin: (user: Staff) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const staff = staffStorage.getAll();

  const handleLogin = () => {
    const user = staff.find((s) => s.id === selectedStaff);
    if (user) {
      onLogin(user);
    }
  };

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
