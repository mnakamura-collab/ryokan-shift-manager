import type { Staff, Shift, Reservation } from '../types';
import { getToday, getPositionColor } from '../utils/helpers';

interface TodayShiftProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  reservations: Reservation[];
  onUpdate: () => void;
}

export default function TodayShift({ staff, shifts }: TodayShiftProps) {
  const todayShifts = shifts.filter((s) => s.date === getToday());

  const groupedByPosition = todayShifts.reduce((acc, shift) => {
    if (!acc[shift.position]) {
      acc[shift.position] = [];
    }
    acc[shift.position].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">本日のシフト</h2>

        {Object.keys(groupedByPosition).length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            本日のシフトはまだ登録されていません
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByPosition).map(([position, shifts]) => (
              <div key={position} className="border rounded-lg p-4">
                <h3 className={`font-semibold mb-3 px-3 py-1 inline-block rounded ${getPositionColor(position)}`}>
                  {position} ({shifts.length}名)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shifts.map((shift) => {
                    const staffMember = staff.find((s) => s.id === shift.staffId);
                    return (
                      <div key={shift.id} className="bg-gray-50 rounded p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{staffMember?.name}</p>
                          <p className="text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                        {shift.isStandard && (
                          <span className="badge bg-blue-100 text-blue-800 border-blue-300 text-xs">
                            標準
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
