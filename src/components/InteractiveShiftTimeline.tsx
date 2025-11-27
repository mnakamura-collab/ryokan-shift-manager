import { useState, useRef } from 'react';
import type { Staff, Shift } from '../types';
import { getPositionColor, generateId } from '../utils/helpers';
import { shiftStorage } from '../utils/supabaseStorage';

interface InteractiveShiftTimelineProps {
  shifts: Shift[];
  staff: Staff[];
  date: string;
  title?: string;
  onUpdate: () => void;
}

export default function InteractiveShiftTimeline({
  shifts,
  staff,
  date,
  title,
  onUpdate,
}: InteractiveShiftTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ staffId: string; time: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoveredStaffId, setHoveredStaffId] = useState<string | null>(null);
  const [hoveredShiftId, setHoveredShiftId] = useState<string | null>(null);
  const [resizingShift, setResizingShift] = useState<{ shiftId: string; edge: 'start' | 'end'; originalStart: number; originalEnd: number } | null>(null);
  const timelineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 時刻から秒を削除（HH:MM:SS -> HH:MM）
  const formatTime = (time: string): string => {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  // 時間を数値に変換（例: "09:30" -> 9.5）
  const timeToNumber = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  // 数値を時間に変換（例: 9.5 -> "09:30"）
  const numberToTime = (num: number): string => {
    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // 時間軸を24時間表示に固定（3:00から翌日3:00まで）
  const minHour = 3;
  const maxHour = 27;
  const totalHours = maxHour - minHour;

  // 時間軸のラベルを生成
  const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

  // シフトバーの位置とサイズを計算
  const getShiftBarStyle = (shift: Shift) => {
    const start = timeToNumber(shift.startTime);
    let end = timeToNumber(shift.endTime);

    if (end < start) {
      end += 24;
    }

    const left = ((start - minHour) / totalHours) * 100;
    const width = ((end - start) / totalHours) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // マウス位置から時刻を計算
  const getTimeFromMousePosition = (e: React.MouseEvent<HTMLDivElement>, element: HTMLDivElement): number => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const time = minHour + ratio * totalHours;

    // 15分単位に丸める
    const roundedTime = Math.round(time * 4) / 4;
    return Math.max(minHour, Math.min(maxHour, roundedTime));
  };

  // シフトの重複をチェック
  const hasOverlap = (staffId: string, start: number, end: number, excludeShiftId?: string): boolean => {
    const staffShifts = shifts.filter((s) => s.staffId === staffId);

    for (const shift of staffShifts) {
      // 除外IDと一致する場合はスキップ
      if (excludeShiftId && shift.id === excludeShiftId) {
        continue;
      }

      let shiftStart = timeToNumber(shift.startTime);
      let shiftEnd = timeToNumber(shift.endTime);

      // 日をまたぐシフトの処理
      if (shiftEnd < shiftStart) {
        shiftEnd += 24;
      }

      // 重複チェック（境界時刻は許容）
      if (!(end <= shiftStart || start >= shiftEnd)) {
        return true;
      }
    }

    return false;
  };

  // シフト削除
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('このシフトを削除してもよろしいですか？')) {
      return;
    }

    try {
      await shiftStorage.delete(shiftId);
      await onUpdate();
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('シフトの削除に失敗しました');
    }
  };

  // シフトのリサイズ開始
  const handleResizeStart = (e: React.MouseEvent, shift: Shift, edge: 'start' | 'end') => {
    e.stopPropagation();
    const start = timeToNumber(shift.startTime);
    let end = timeToNumber(shift.endTime);
    if (end < start) end += 24;

    setResizingShift({
      shiftId: shift.id,
      edge,
      originalStart: start,
      originalEnd: end,
    });
  };

  // リサイズ中
  const handleResizeMove = (e: React.MouseEvent<HTMLDivElement>, staffId: string) => {
    if (!resizingShift) return;

    const element = e.currentTarget;
    const time = getTimeFromMousePosition(e, element);

    // 仮のプレビュー表示用にdragEndを使用
    setDragEnd(time);
  };

  // リサイズ終了
  const handleResizeEnd = async (staffId: string) => {
    if (!resizingShift || dragEnd === null) {
      setResizingShift(null);
      setDragEnd(null);
      return;
    }

    const shift = shifts.find((s) => s.id === resizingShift.shiftId);
    if (!shift) {
      setResizingShift(null);
      setDragEnd(null);
      return;
    }

    let newStart = resizingShift.originalStart;
    let newEnd = resizingShift.originalEnd;

    if (resizingShift.edge === 'start') {
      newStart = dragEnd;
    } else {
      newEnd = dragEnd;
    }

    // 最低30分のシフト
    if (newEnd - newStart < 0.5) {
      setResizingShift(null);
      setDragEnd(null);
      return;
    }

    // 重複チェック（自分自身のシフトを除外）
    if (hasOverlap(staffId, newStart, newEnd, resizingShift.shiftId)) {
      alert('この時間帯は既にシフトが登録されています');
      setResizingShift(null);
      setDragEnd(null);
      return;
    }

    // 時刻を文字列に変換
    let startTimeStr = numberToTime(newStart);
    let endTimeStr = numberToTime(newEnd);

    if (newEnd >= 24) {
      endTimeStr = numberToTime(newEnd - 24);
    }
    if (newStart >= 24) {
      startTimeStr = numberToTime(newStart - 24);
    }

    try {
      await shiftStorage.update(shift.id, {
        startTime: startTimeStr,
        endTime: endTimeStr,
      });
      await onUpdate();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('シフトの更新に失敗しました');
    }

    setResizingShift(null);
    setDragEnd(null);
  };

  // ドラッグ開始（新規シフト作成用）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, staffId: string) => {
    // リサイズ中は新規作成を無効化
    if (resizingShift) return;

    const element = e.currentTarget;
    const time = getTimeFromMousePosition(e, element);
    setIsDragging(true);
    setDragStart({ staffId, time });
    setDragEnd(time);
  };

  // ドラッグ中
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, staffId: string) => {
    // リサイズ中の処理
    if (resizingShift) {
      handleResizeMove(e, staffId);
      return;
    }

    // 新規作成のドラッグ処理
    if (!isDragging || !dragStart || dragStart.staffId !== staffId) return;

    const element = e.currentTarget;
    const time = getTimeFromMousePosition(e, element);
    setDragEnd(time);
  };

  // ドラッグ終了
  const handleMouseUp = async () => {
    if (!isDragging || !dragStart || dragEnd === null) return;

    const startTime = Math.min(dragStart.time, dragEnd);
    const endTime = Math.max(dragStart.time, dragEnd);

    // 最低30分以上のシフトのみ作成
    if (endTime - startTime < 0.5) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // 重複チェック
    if (hasOverlap(dragStart.staffId, startTime, endTime)) {
      alert('この時間帯は既にシフトが登録されています');
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const staffMember = staff.find((s) => s.id === dragStart.staffId);
    if (!staffMember) return;

    // 開始時刻と終了時刻を文字列に変換
    let startTimeStr = numberToTime(startTime);
    let endTimeStr = numberToTime(endTime);

    // 24時を超える場合は翌日の時刻として扱う（0-2時の範囲）
    if (endTime >= 24) {
      endTimeStr = numberToTime(endTime - 24);
    }
    if (startTime >= 24) {
      startTimeStr = numberToTime(startTime - 24);
    }

    try {
      const newShift: Shift = {
        id: generateId(),
        staffId: dragStart.staffId,
        date: date,
        position: staffMember.position,
        startTime: startTimeStr,
        endTime: endTimeStr,
        isStandard: false,
        isConfirmed: false,
      };

      await shiftStorage.add(newShift);
      await onUpdate();
    } catch (error) {
      console.error('Error creating shift:', error);
      alert('シフトの作成に失敗しました');
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // ドラッグ中のプレビューバーを計算
  const getDragPreviewStyle = () => {
    if (!dragStart || dragEnd === null) return null;

    const start = Math.min(dragStart.time, dragEnd);
    const end = Math.max(dragStart.time, dragEnd);

    const left = ((start - minHour) / totalHours) * 100;
    const width = ((end - start) / totalHours) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // リサイズ中のプレビューバーを計算
  const getResizePreviewStyle = (shift: Shift) => {
    if (!resizingShift || resizingShift.shiftId !== shift.id || dragEnd === null) {
      return null;
    }

    let newStart = resizingShift.originalStart;
    let newEnd = resizingShift.originalEnd;

    if (resizingShift.edge === 'start') {
      newStart = dragEnd;
    } else {
      newEnd = dragEnd;
    }

    const left = ((newStart - minHour) / totalHours) * 100;
    const width = ((newEnd - newStart) / totalHours) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  if (staff.length === 0) {
    return (
      <div className="card">
        {title && <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>}
        <p className="text-gray-500 text-center py-8">スタッフが登録されていません</p>
      </div>
    );
  }

  // 役職順にスタッフを並び替え（役職名でソート）
  const sortedStaff = [...staff].sort((a, b) => a.position.localeCompare(b.position, 'ja'));

  return (
    <div className="card">
      {title && <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>}

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          💡 <strong>新規作成:</strong> 空いているエリアをドラッグ（15分単位、最低30分） ｜
          <strong>時間調整:</strong> シフトの左右端をドラッグ ｜
          <strong>削除:</strong> シフトにマウスを乗せて×ボタン
        </p>
      </div>

      <div className="overflow-x-auto">
        {/* 時間軸ヘッダー */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0"></div>
          <div className="flex-1 relative border-b border-gray-300" style={{ height: '24px' }}>
            {hourLabels.map((hour, index) => {
              const displayHour = hour >= 24 ? hour - 24 : hour;
              const dayLabel = hour >= 24 ? '翌' : '';
              const position = (index / (hourLabels.length - 1)) * 100;
              return (
                <div
                  key={hour}
                  className="absolute text-xs text-gray-600"
                  style={{
                    left: `${position}%`,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {dayLabel}
                  {displayHour}:00
                </div>
              );
            })}
          </div>
        </div>

        {/* シフトタイムライン */}
        <div className="space-y-1">
          {sortedStaff.map((staffMember) => {
            const staffShifts = shifts.filter((s) => s.staffId === staffMember.id);
            const isHovered = hoveredStaffId === staffMember.id;
            const isDraggingForThisStaff = isDragging && dragStart?.staffId === staffMember.id;

            return (
              <div
                key={staffMember.id}
                className="flex items-center mb-1"
                onMouseEnter={() => setHoveredStaffId(staffMember.id)}
                onMouseLeave={() => setHoveredStaffId(null)}
              >
                {/* 左側：役職と名前 */}
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getPositionColor(staffMember.position)} text-xs`}>
                      {staffMember.position}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {staffMember.name}
                    </span>
                  </div>
                </div>

                {/* 右側：タイムラインバー */}
                <div
                  className={`flex-1 relative h-12 ${isHovered ? 'bg-blue-50' : ''} rounded transition-colors ${resizingShift ? 'cursor-ew-resize' : 'cursor-crosshair'}`}
                  onMouseDown={(e) => handleMouseDown(e, staffMember.id)}
                  onMouseMove={(e) => handleMouseMove(e, staffMember.id)}
                  onMouseUp={() => {
                    if (resizingShift) {
                      handleResizeEnd(staffMember.id);
                    } else {
                      handleMouseUp();
                    }
                  }}
                  onMouseLeave={() => {
                    if (isDragging) handleMouseUp();
                    if (resizingShift) handleResizeEnd(staffMember.id);
                  }}
                >
                  {/* 背景グリッド */}
                  <div className="absolute inset-0 pointer-events-none">
                    {hourLabels.map((hour, index) => {
                      const position = (index / (hourLabels.length - 1)) * 100;
                      return (
                        <div
                          key={hour}
                          className="absolute top-0 bottom-0 border-l border-gray-200"
                          style={{ left: `${position}%` }}
                        ></div>
                      );
                    })}
                  </div>

                  {/* 既存のシフトバー */}
                  {staffShifts.map((shift) => {
                    const isResizing = resizingShift?.shiftId === shift.id;
                    const resizePreview = getResizePreviewStyle(shift);
                    const style = isResizing && resizePreview ? resizePreview : getShiftBarStyle(shift);
                    const isHovering = hoveredShiftId === shift.id;

                    return (
                      <div
                        key={shift.id}
                        className={`absolute top-1 bottom-1 ${getPositionColor(
                          staffMember.position
                        )} ${isResizing ? 'opacity-80 border-2 border-blue-600' : ''} rounded flex items-center justify-between text-xs font-medium shadow-sm hover:shadow-lg transition-all group cursor-pointer`}
                        style={style}
                        onMouseEnter={() => !isResizing && setHoveredShiftId(shift.id)}
                        onMouseLeave={() => setHoveredShiftId(null)}
                        title={`${staffMember.name}: ${formatTime(shift.startTime)} - ${formatTime(
                          shift.endTime
                        )}`}
                      >
                        {/* 左端のリサイズハンドル */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black hover:bg-opacity-20 flex items-center justify-center"
                          onMouseDown={(e) => handleResizeStart(e, shift, 'start')}
                        >
                          <div className="w-1 h-4 bg-white bg-opacity-50 rounded"></div>
                        </div>

                        {/* 時刻表示 */}
                        <span className="truncate pl-3">
                          {isResizing && dragEnd !== null && resizingShift.edge === 'start'
                            ? numberToTime(dragEnd)
                            : formatTime(shift.startTime)}
                        </span>
                        <span className="truncate pr-3">
                          {isResizing && dragEnd !== null && resizingShift.edge === 'end'
                            ? numberToTime(dragEnd)
                            : formatTime(shift.endTime)}
                        </span>

                        {/* 削除ボタン（ホバー時のみ表示） */}
                        {isHovering && (
                          <button
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShift(shift.id);
                            }}
                            title="削除"
                          >
                            ×
                          </button>
                        )}

                        {/* 右端のリサイズハンドル */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black hover:bg-opacity-20 flex items-center justify-center"
                          onMouseDown={(e) => handleResizeStart(e, shift, 'end')}
                        >
                          <div className="w-1 h-4 bg-white bg-opacity-50 rounded"></div>
                        </div>
                      </div>
                    );
                  })}

                  {/* ドラッグ中のプレビューバー */}
                  {isDraggingForThisStaff && getDragPreviewStyle() && (
                    <div
                      className="absolute top-1 bottom-1 bg-blue-400 bg-opacity-60 border-2 border-blue-600 rounded flex items-center justify-center text-xs font-medium pointer-events-none"
                      style={getDragPreviewStyle()!}
                    >
                      <span className="text-white">
                        {dragStart && dragEnd !== null && (
                          <>
                            {numberToTime(Math.min(dragStart.time, dragEnd))} -{' '}
                            {numberToTime(Math.max(dragStart.time, dragEnd))}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
