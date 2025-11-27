import { useState } from 'react';
import type { Staff } from '../types';
import { staffStorage } from '../utils/supabaseStorage';

interface AccountSettingsProps {
  currentUser: Staff;
  onUpdate: () => void;
}

export default function AccountSettings({ currentUser, onUpdate }: AccountSettingsProps) {
  const [email, setEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [is2faEnabled, setIs2faEnabled] = useState(currentUser.is2faEnabled);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 現在のパスワードで認証
      const user = await staffStorage.authenticate(currentUser.email, currentPassword);
      if (!user) {
        setError('現在のパスワードが正しくありません');
        setLoading(false);
        return;
      }

      // メールアドレスとloginIdを両方更新
      await staffStorage.update(currentUser.id, {
        email: email,
        loginId: email,
      });

      setSuccess('メールアドレスを変更しました');
      setCurrentPassword('');
      await onUpdate();
    } catch (err) {
      console.error('Email update error:', err);
      setError('メールアドレスの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 新しいパスワードの確認
      if (newPassword !== confirmPassword) {
        setError('新しいパスワードが一致しません');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('パスワードは6文字以上で設定してください');
        setLoading(false);
        return;
      }

      // 現在のパスワードで認証
      const user = await staffStorage.authenticate(currentUser.email, currentPassword);
      if (!user) {
        setError('現在のパスワードが正しくありません');
        setLoading(false);
        return;
      }

      // パスワード更新
      await staffStorage.update(currentUser.id, {
        passwordHash: newPassword,
      });

      setSuccess('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await onUpdate();
    } catch (err) {
      console.error('Password update error:', err);
      setError('パスワードの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAToggle = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const newValue = !is2faEnabled;
      await staffStorage.update(currentUser.id, {
        is2faEnabled: newValue,
      });

      setIs2faEnabled(newValue);
      setSuccess(newValue ? '二段階認証を有効にしました' : '二段階認証を無効にしました');
      await onUpdate();
    } catch (err) {
      console.error('2FA toggle error:', err);
      setError('二段階認証の設定変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">アカウント設定</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* プロフィール情報 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">プロフィール</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">名前</span>
              <p className="font-medium text-gray-800">{currentUser.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">役職</span>
              <p className="font-medium text-gray-800">{currentUser.position}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">権限</span>
              <p className="font-medium text-gray-800">
                {currentUser.role === 'admin' ? '管理者' : 'スタッフ'}
              </p>
            </div>
          </div>
        </div>

        {/* メールアドレス変更 */}
        <div className="border-t border-gray-200 pt-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">メールアドレス変更</h3>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいメールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || email === currentUser.email}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '変更中...' : 'メールアドレスを変更'}
            </button>
          </form>
        </div>

        {/* パスワード変更 */}
        <div className="border-t border-gray-200 pt-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">パスワード変更</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '変更中...' : 'パスワードを変更'}
            </button>
          </form>
        </div>

        {/* 二段階認証設定 */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">二段階認証</h3>
          <div className="flex items-center justify-between bg-gray-50 rounded p-4">
            <div>
              <p className="font-medium text-gray-800">二段階認証</p>
              <p className="text-sm text-gray-600">
                {is2faEnabled
                  ? 'ログイン時にメールで送信される認証コードが必要です'
                  : 'メールアドレスとパスワードのみでログインできます'}
              </p>
            </div>
            <button
              onClick={handle2FAToggle}
              disabled={loading}
              className={`btn ${
                is2faEnabled ? 'btn-secondary' : 'btn-primary'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? '設定中...' : is2faEnabled ? '無効にする' : '有効にする'}
            </button>
          </div>
          {is2faEnabled && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                ログイン時に6桁の認証コードがメールで送信されます。
                <br />
                認証コードの有効期限は10分です。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
