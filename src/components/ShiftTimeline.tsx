import type { Staff, Shift } from '../types';
import { getPositionColor } from '../utils/helpers';

interface ShiftTimelineProps {
  shifts: Shift[];
  staff: Staff[];
  title?: string;
}

export default function ShiftTimeline({ shifts, staff, title }: ShiftTimelineProps) {
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

  // 時間軸を24時間表示に固定（0:00から翌日の早朝まで連続表示）
  // 日をまたぐシフトを考慮して、3:00-翌3:00（27:00）の24時間表示
  const minHour = 3;  // 3:00から開始
  const maxHour = 27; // 翌日の3:00まで（27:00）
  const totalHours = maxHour - minHour; // 24時間

  // 時間軸のラベルを生成
  const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

  // 役職ごとにグループ化
  const groupedByPosition = shifts.reduce((acc, shift) => {
    if (!acc[shift.position]) {
      acc[shift.position] = [];
    }
    acc[shift.position].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  // シフトバーの位置とサイズを計算
  const getShiftBarStyle = (shift: Shift) => {
    const start = timeToNumber(shift.startTime);
    let end = timeToNumber(shift.endTime);

    // 日をまたぐシフトの場合（終了時刻 < 開始時刻）
    // 終了時刻に24時間を加算して翌日扱いにする
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

  if (shifts.length === 0) {
    return (
      <div className="card">
        {title && <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>}
        <p className="text-gray-500 text-center py-8">
          シフトはまだ登録されていません
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      {title && <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>}

      <div className="overflow-x-auto">
        {/* 時間軸ヘッダー */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0"></div>
          <div className="flex-1 flex border-b border-gray-300">
            {hourLabels.map((hour) => {
              const displayHour = hour >= 24 ? hour - 24 : hour;
              const dayLabel = hour >= 24 ? '翌' : '';
              return (
                <div
                  key={hour}
                  className="flex-1 text-center text-xs text-gray-600 pb-1"
                  style={{ minWidth: '40px' }}
                >
                  {dayLabel}{displayHour}:00
                </div>
              );
            })}
          </div>
        </div>

        {/* シフトタイムライン */}
        <div className="space-y-1">
          {Object.entries(groupedByPosition).map(([position, positionShifts]) => (
            <div key={position}>
              {positionShifts.map((shift) => {
                const staffMember = staff.find((s) => s.id === shift.staffId);
                const style = getShiftBarStyle(shift);

                return (
                  <div key={shift.id} className="flex items-center mb-1">
                    {/* 左側：役職と名前 */}
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${getPositionColor(position)} text-xs`}>
                          {position}
                        </span>
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {staffMember?.name}
                        </span>
                      </div>
                    </div>

                    {/* 右側：タイムラインバー */}
                    <div className="flex-1 relative h-8">
                      {/* 背景グリッド */}
                      <div className="absolute inset-0 flex">
                        {hourLabels.slice(0, -1).map((hour) => (
                          <div
                            key={hour}
                            className="flex-1 border-l border-gray-200"
                            style={{ minWidth: '40px' }}
                          ></div>
                        ))}
                      </div>

                      {/* シフトバー */}
                      <div
                        className={`absolute top-1 bottom-1 ${getPositionColor(position)} rounded px-2 flex items-center justify-between text-xs font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                        style={style}
                        title={`${staffMember?.name}: ${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`}
                      >
                        <span className="truncate">
                          {formatTime(shift.startTime)}
                        </span>
                        <span className="truncate">
                          {formatTime(shift.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
