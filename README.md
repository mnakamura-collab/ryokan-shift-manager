# 旅館シフト管理システム

旅館・ホテル向けのシフト管理アプリケーション。Supabaseをバックエンドとして使用し、複数ユーザーでリアルタイムにシフト管理が可能です。

## 機能

- **本日のシフト表示** - タイムライン形式で当日のシフトを一覧表示
- **カレンダー表示** - 月間カレンダーでシフトを管理、日付クリックでタイムライン表示
- **標準シフト設定** - スタッフごとの標準勤務時間・曜日を設定し、自動生成
- **夜勤対応** - 日をまたぐシフト（22:00-06:00など）に対応
- **予約管理** - 宿泊予約の管理
- **スタッフ管理** - スタッフ情報の登録・編集
- **役職管理** - 役職マスタの管理

## 技術スタック

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL)
- **UI**: Tailwind CSS
- **Hosting**: Railway

## セットアップ

### 必要な環境

- Node.js 18以上
- Supabaseアカウント

### インストール

```bash
npm install
```

### Supabase設定

1. Supabaseプロジェクトを作成
2. SQL Editorで `supabase-schema.sql` を実行
3. 追加のマイグレーション実行:
   - `supabase-add-position-fields.sql`
   - `supabase-add-shift-columns.sql`
4. `src/lib/supabase.ts` にプロジェクトのURLとAPIキーを設定

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

## デプロイ (Railway)

1. GitHubリポジトリにプッシュ
2. Railwayでプロジェクトをインポート
3. 自動的にビルド・デプロイされます

`railway.json` に設定済み:
- ビルドコマンド: `npm install && npm run build`
- 起動コマンド: `npx serve -s dist -l $PORT --single`

## ライセンス

MIT
