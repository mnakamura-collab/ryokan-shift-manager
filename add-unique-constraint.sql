-- shiftsテーブルに、同じスタッフ・同じ日付で複数のシフトを作成できないようにユニーク制約を追加
-- ※ 既存の重複データがある場合は、先に cleanup-duplicate-shifts.sql を実行してください

-- まず既存の重複を確認
SELECT staff_id, date, COUNT(*) as count
FROM shifts
GROUP BY staff_id, date
HAVING COUNT(*) > 1;

-- 重複がなければ、ユニーク制約を追加
-- ALTER TABLE shifts
-- ADD CONSTRAINT shifts_staff_date_unique UNIQUE (staff_id, date);
