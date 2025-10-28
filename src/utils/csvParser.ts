import type { Reservation } from '../types';
import { generateId } from './helpers';

export interface CSVReservation {
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  plan: string;
  requiredStaff?: number;
}

export function parseReservationCSV(csvText: string): CSVReservation[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('CSVファイルが空です');
  }

  // ヘッダー行を取得
  const headers = lines[0].split(',').map((h) => h.trim());

  // 必須カラムのチェック
  const requiredColumns = ['お客様名', 'チェックイン', 'チェックアウト', '人数', 'プラン'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`必須カラムが不足しています: ${missingColumns.join(', ')}`);
  }

  // データ行を解析
  const reservations: CSVReservation[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 空行はスキップ

    const values = line.split(',').map((v) => v.trim());

    if (values.length !== headers.length) {
      console.warn(`行 ${i + 1}: カラム数が一致しません（スキップ）`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    try {
      // 日付の検証と変換
      const checkInDate = parseDate(row['チェックイン']);
      const checkOutDate = parseDate(row['チェックアウト']);

      if (!checkInDate || !checkOutDate) {
        console.warn(`行 ${i + 1}: 日付形式が不正です（スキップ）`);
        continue;
      }

      // 人数の検証
      const numberOfGuests = parseInt(row['人数']);
      if (isNaN(numberOfGuests) || numberOfGuests < 1) {
        console.warn(`行 ${i + 1}: 人数が不正です（スキップ）`);
        continue;
      }

      // 必要スタッフ数の取得（オプション）
      let requiredStaff: number | undefined;
      if (row['必要スタッフ数']) {
        const parsed = parseInt(row['必要スタッフ数']);
        if (!isNaN(parsed)) {
          requiredStaff = parsed;
        }
      }

      // プランに基づいて必要スタッフ数を自動設定（指定がない場合）
      if (!requiredStaff) {
        requiredStaff = calculateRequiredStaff(row['プラン'], numberOfGuests);
      }

      reservations.push({
        guestName: row['お客様名'] || '（名前なし）',
        checkInDate,
        checkOutDate,
        numberOfGuests,
        plan: row['プラン'] || 'スタンダード',
        requiredStaff,
      });
    } catch (error) {
      console.warn(`行 ${i + 1}: 解析エラー（スキップ）`, error);
      continue;
    }
  }

  return reservations;
}

// 日付文字列をYYYY-MM-DD形式に変換
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // YYYY-MM-DD形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // YYYY/MM/DD形式
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // MM/DD/YYYY形式
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  // YYYYMMDD形式
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  return null;
}

// プランと人数から必要スタッフ数を計算
function calculateRequiredStaff(plan: string, numberOfGuests: number): number {
  const planLower = plan.toLowerCase();

  if (planLower.includes('vip')) {
    return Math.max(6, Math.ceil(numberOfGuests / 2));
  } else if (planLower.includes('プレミアム') || planLower.includes('premium')) {
    return Math.max(5, Math.ceil(numberOfGuests / 3));
  } else if (planLower.includes('デラックス') || planLower.includes('deluxe')) {
    return Math.max(4, Math.ceil(numberOfGuests / 4));
  } else {
    // スタンダード
    return Math.max(3, Math.ceil(numberOfGuests / 5));
  }
}

// CSVReservationをReservationに変換
export function convertToReservations(csvReservations: CSVReservation[]): Reservation[] {
  return csvReservations.map((csv) => ({
    id: generateId(),
    guestName: csv.guestName,
    checkInDate: csv.checkInDate,
    checkOutDate: csv.checkOutDate,
    numberOfGuests: csv.numberOfGuests,
    plan: csv.plan,
    requiredStaff: csv.requiredStaff || 3,
  }));
}

// サンプルCSV（予約）を生成
export function generateSampleCSV(): string {
  const headers = ['お客様名', 'チェックイン', 'チェックアウト', '人数', 'プラン', '必要スタッフ数'];
  const sampleData = [
    ['山田太郎', '2025-11-01', '2025-11-03', '2', 'スタンダード', '3'],
    ['佐藤花子', '2025-11-05', '2025-11-06', '4', 'デラックス', '4'],
    ['鈴木一郎', '2025-11-10', '2025-11-12', '6', 'プレミアム', '5'],
    ['田中美咲', '2025-11-15', '2025-11-17', '2', 'VIP', '6'],
  ];

  return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');
}

// スタッフCSVインターフェース
export interface CSVStaff {
  name: string;
  position: string;
  role: string;
  trustScore?: number;
}

// スタッフCSVをパース
export function parseStaffCSV(csvText: string): CSVStaff[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) {
    throw new Error('CSVファイルが空です');
  }

  const headers = lines[0].split(',').map((h) => h.trim());

  // 必須カラムのチェック
  const requiredColumns = ['名前', '役職', '権限'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`必須カラムが不足しています: ${missingColumns.join(', ')}`);
  }

  const staffList: CSVStaff[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim());

    if (values.length !== headers.length) {
      console.warn(`行 ${i + 1}: カラム数が一致しません（スキップ）`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    try {
      // 役職の検証
      const validPositions = ['フロント', '清掃', 'レストラン', '配膳', '喫茶店', '調理', 'その他'];
      const position = row['役職'];
      if (!validPositions.includes(position)) {
        console.warn(`行 ${i + 1}: 無効な役職です（スキップ）`);
        continue;
      }

      // 権限の検証
      let role = 'staff';
      const roleInput = row['権限'].toLowerCase();
      if (roleInput === '管理者' || roleInput === 'admin') {
        role = 'admin';
      }

      // 信頼度スコア（オプション）
      let trustScore: number | undefined = 100;
      if (row['信頼度']) {
        const parsed = parseInt(row['信頼度']);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          trustScore = parsed;
        }
      }

      staffList.push({
        name: row['名前'] || '（名前なし）',
        position,
        role,
        trustScore,
      });
    } catch (error) {
      console.warn(`行 ${i + 1}: 解析エラー（スキップ）`, error);
      continue;
    }
  }

  return staffList;
}

// CSVStaffをStaffに変換
export function convertToStaff(csvStaff: CSVStaff[]): any[] {
  return csvStaff.map((csv) => ({
    id: generateId(),
    name: csv.name,
    position: csv.position,
    role: csv.role,
    trustScore: csv.trustScore || 100,
  }));
}

// サンプルCSV（スタッフ）を生成
export function generateStaffSampleCSV(): string {
  const headers = ['名前', '役職', '権限', '信頼度'];
  const sampleData = [
    ['山田太郎', 'フロント', 'スタッフ', '95'],
    ['佐藤花子', '清掃', 'スタッフ', '98'],
    ['鈴木一郎', '調理', 'スタッフ', '90'],
    ['田中美咲', 'レストラン', '管理者', '100'],
    ['高橋健太', '配膳', 'スタッフ', '85'],
  ];

  return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');
}
