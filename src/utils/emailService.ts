// メール送信サービス（デモ用）
// 本番環境では、SendGrid、AWS SES、Resendなどのサービスを使用してください

export const emailService = {
  // OTPをメールで送信（デモ版：コンソールに出力）
  sendOTP: async (email: string, otp: string): Promise<boolean> => {
    try {
      // 本番環境では実際のメール送信APIを使用
      console.log('='.repeat(50));
      console.log('📧 OTP送信（デモモード）');
      console.log('='.repeat(50));
      console.log(`宛先: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`有効期限: 10分`);
      console.log('='.repeat(50));

      // デモ用：アラート表示（開発中のみ）
      if (import.meta.env.DEV) {
        alert(`OTPが生成されました（デモモード）\n\nメール: ${email}\nOTP: ${otp}\n\n※開発環境では実際にメールは送信されません`);
      }

      return true;
    } catch (error) {
      console.error('メール送信エラー:', error);
      return false;
    }
  },

  // パスワードリセットメール送信（将来の実装用）
  sendPasswordReset: async (email: string, resetLink: string): Promise<boolean> => {
    console.log(`パスワードリセットリンク送信: ${email} -> ${resetLink}`);
    return true;
  },
};

/*
本番環境での実装例（Resendを使用する場合）:

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  sendOTP: async (email: string, otp: string): Promise<boolean> => {
    try {
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: email,
        subject: '【旅館シフト管理】ログイン認証コード',
        html: `
          <h2>ログイン認証コード</h2>
          <p>以下の認証コードを入力してログインを完了してください：</p>
          <h1 style="font-size: 32px; letter-spacing: 8px;">${otp}</h1>
          <p>このコードの有効期限は10分です。</p>
          <p>※このメールに心当たりがない場合は、無視してください。</p>
        `,
      });
      return true;
    } catch (error) {
      console.error('メール送信エラー:', error);
      return false;
    }
  },
};
*/
