-- 重複シフトを削除（同じスタッフ、同じ日付で複数のシフトがある場合、最新のものを残す）
DELETE FROM shifts a
USING shifts b
WHERE a.staff_id = b.staff_id
  AND a.date = b.date
  AND a.id < b.id;
