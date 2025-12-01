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

// 稼働状況CSVインターフェース
export interface CSVOccupancy {
  date: string;
  occupiedRooms: number;
  guestCount: number;
}

// CSVを解析（RFC 4180準拠：ダブルクォートで囲まれた値内の改行やカンマを処理）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマで区切る（クォート外の場合のみ）
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// 稼働状況CSVをパース（予約管理システムのエクスポート形式に対応）
export function parseOccupancyCSV(csvText: string): CSVOccupancy[] {
  // BOMを除去
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n');

  if (lines.length === 0) {
    throw new Error('CSVファイルが空です');
  }

  // ヘッダー行を解析
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  // 必須カラムのチェック
  const requiredColumns = ['客室日付', '客室人数'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error('必須カラムが不足しています: ' + missingColumns.join(', ') + '\n（予約管理システムからエクスポートしたCSVファイルを使用してください）');
  }

  // 日付ごとのデータを集計
  const dateMap = new Map<string, { roomCount: number; guestTotal: number }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // 客室日付の取得
      const dateStr = row['客室日付']?.trim();
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // 日付がない行はスキップ（予約だけで部屋割りされていない行など）
        continue;
      }

      // 客室人数の取得
      const guestCount = parseInt(row['客室人数']);
      if (isNaN(guestCount) || guestCount < 0) {
        // 人数がない行もスキップ
        continue;
      }

      // 日付ごとに集計
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { roomCount: 0, guestTotal: 0 });
      }

      const data = dateMap.get(dateStr)!;
      data.roomCount += 1; // 1行 = 1部屋
      data.guestTotal += guestCount;
    } catch (error) {
      console.warn('行 ' + (i + 1) + ': 解析エラー（スキップ）', error);
      continue;
    }
  }

  // Map を配列に変換
  const occupancies: CSVOccupancy[] = [];
  dateMap.forEach((data, date) => {
    occupancies.push({
      date,
      occupiedRooms: data.roomCount,
      guestCount: data.guestTotal,
    });
  });

  // 日付順にソート
  occupancies.sort((a, b) => a.date.localeCompare(b.date));

  return occupancies;
}

// CSVOccupancyをDailyOccupancyに変換
export function convertToOccupancy(csvOccupancies: CSVOccupancy[], totalRooms: number = 50): any[] {
  return csvOccupancies.map((csv) => {
    const rate = totalRooms > 0 ? (csv.occupiedRooms / totalRooms) * 100 : 0;
    return {
      id: generateId(),
      date: csv.date,
      roomOccupancyRate: Math.round(rate * 10) / 10,
      totalRooms,
      occupiedRooms: csv.occupiedRooms,
      hasBanquet: false,
      banquetGuestCount: 0,
    };
  });
}

// サンプルCSV（稼働状況）を生成
export function generateOccupancySampleCSV(): string {
  const headers = ['宿泊者名', '到着予定日', '到着予定時刻', '泊数', 'プラン名', 'チャネル名', 'フロントメモ', '清掃メモ', '食事メモ', '客室日付', '客室タイプ', '部屋番号', '客室人数', '大人男性人数', '大人女性人数', '子供A人数', '子供B人数', '子供C人数', '子供D人数', '子供その他人数'];
  const sampleData = [
    ['山田太郎', '2025-12-01', '15:00', '1', 'スタンダードプラン', '電話', '', '', '', '2025-12-01', '和室（バス・トイレ付）', '101', '2', '1', '1', '0', '0', '0', '0', '0'],
    ['佐藤花子', '2025-12-01', '16:00', '1', 'デラックスプラン', '楽天トラベル', '', '', '', '2025-12-01', '洋室（バス・トイレ付）', '201', '2', '0', '2', '0', '0', '0', '0', '0'],
    ['鈴木一郎', '2025-12-01', '15:30', '2', 'プレミアムプラン', 'じゃらん', '', '', '', '2025-12-01', '和室（バス・トイレ付）', '102', '4', '2', '2', '0', '0', '0', '0', '0'],
    ['山田太郎', '2025-12-02', '15:00', '1', 'スタンダードプラン', '電話', '', '', '', '2025-12-02', '和室（バス・トイレ付）', '101', '2', '1', '1', '0', '0', '0', '0', '0'],
    ['田中美咲', '2025-12-02', '14:00', '1', 'VIPプラン', '電話', '', '', '', '2025-12-02', '特別室', '301', '3', '2', '1', '0', '0', '0', '0', '0'],
  ];

  return [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');
}
