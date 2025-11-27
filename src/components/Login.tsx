import { useState } from 'react';
import type { Staff } from '../types';
import { staffStorage } from '../utils/supabaseStorage';
import { emailService } from '../utils/emailService';

interface LoginProps {
  onLogin: (user: Staff) => void;
}

type LoginStep = 'email' | 'otp';

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempUser, setTempUser] = useState<Staff | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await staffStorage.authenticate(email, password);

      if (user) {
        setTempUser(user);

        // 二段階認証が有効な場合はOTP送信
        if (user.is2faEnabled) {
          const otp = await staffStorage.generateOTP(email);
          if (otp) {
            const sent = await emailService.sendOTP(email, otp);
            if (sent) {
              setStep('otp');
            } else {
              setError('OTPの送信に失敗しました');
            }
          } else {
            setError('OTPの生成に失敗しました');
          }
        } else {
          // 二段階認証が無効な場合はそのままログイン
          onLogin(user);
        }
      } else {
        setError('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isValid = await staffStorage.verifyOTP(email, otp);

      if (isValid && tempUser) {
        await staffStorage.clearOTP(email);
        onLogin(tempUser);
      } else {
        setError('認証コードが正しくないか、有効期限が切れています');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      const otp = await staffStorage.generateOTP(email);
      if (otp) {
        const sent = await emailService.sendOTP(email, otp);
        if (sent) {
          alert('認証コードを再送信しました');
        } else {
          setError('OTPの送信に失敗しました');
        }
      } else {
        setError('OTPの生成に失敗しました');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="card max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            二段階認証
          </h1>
          <p className="text-center text-gray-600 mb-2">
            メールアドレスに送信された
          </p>
          <p className="text-center text-gray-600 mb-8">
            6桁の認証コードを入力してください
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
            <p className="text-sm text-blue-800 text-center">
              送信先: <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleOTPVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                認証コード
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input w-full text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '認証中...' : '認証'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                コードを再送信
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← 戻る
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              ※ 認証コードの有効期限は10分です
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          旅館シフト管理
        </h1>
        <p className="text-center text-gray-600 mb-8">
          メールアドレスとパスワードを入力してください
        </p>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="例: staff001@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="パスワード"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            初期パスワード: password
            <br />
            ログイン後、パスワードを変更してください
          </p>
        </div>
      </div>
    </div>
  );
}
