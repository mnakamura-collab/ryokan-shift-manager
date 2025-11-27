import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { Staff, Shift } from '../types';
import { formatDate, getDaysInMonth, getPositionColor, getDayOfWeek } from '../utils/helpers';

interface MonthlyStaffViewProps {
  currentUser: Staff;
  staff: Staff[];
  shifts: Shift[];
  currentYear: number;
  currentMonth: number;
  onDateClick: (date: string) => void;
  onEditShift?: (shift: Shift) => void;
}

export default function MonthlyStaffView({
  currentUser,
  staff,
  shifts,
  currentYear,
  currentMonth,
  onDateClick,
  onEditShift,
}: MonthlyStaffViewProps) {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const today = formatDate(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  // 役職順にスタッフを並び替え
  const sortedStaff = [...staff].sort((a, b) => a.position.localeCompare(b.position, 'ja'));

  // 指定日のスタッフのシフトを取得
  const getShiftForDate = (staffId: string, day: number) => {
    const date = formatDate(new Date(currentYear, currentMonth - 1, day));
    return shifts.find((s) => s.staffId === staffId && s.date === date);
  };

  // PDF出力処理
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `シフト表_${currentYear}年${currentMonth}月`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 5mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table {
          width: 100%;
          font-size: 8px;
          page-break-inside: avoid;
        }
        th, td {
          padding: 2px 1px !important;
          font-size: 7px !important;
          line-height: 1.2;
          white-space: nowrap;
        }
        .badge {
          display: none;
        }
        .staff-name {
          font-size: 8px !important;
        }
      }
    `,
    onAfterPrint: () => {
      console.log('PDF出力完了');
    },
    onPrintError: (errorLocation, error) => {
      console.error('PDF出力エラー:', errorLocation, error);
      alert('PDF出力に失敗しました: ' + error);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            console.log('PDF出力ボタンがクリックされました');
            console.log('printRef.current:', printRef.current);
            console.log('handlePrint:', handlePrint);
            if (handlePrint) {
              handlePrint();
            } else {
              console.error('handlePrint is not defined');
            }
          }}
          className="btn btn-secondary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          PDF出力
        </button>
      </div>
      <div ref={printRef} className="card overflow-x-auto print:shadow-none print:p-0">
        {/* PDF出力時のヘッダー */}
        <div className="hidden print:block mb-2">
          <h1 className="text-lg font-bold text-center text-gray-800 mb-1">
            {currentYear}年{currentMonth}月 シフト表
          </h1>
          <div className="text-[8px] text-gray-600 text-right">
            出力日: {formatDate(new Date())}
          </div>
        </div>
        <table className="w-full border-collapse text-sm print:text-xs print:border print:border-gray-400">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left font-semibold text-gray-700 border-r-2 border-gray-300 print:border print:border-gray-400">
              スタッフ
            </th>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const date = formatDate(new Date(currentYear, currentMonth - 1, day));
              const dayOfWeek = getDayOfWeek(date);
              const isToday = date === today;
              const isSunday = dayOfWeek === '日';
              const isSaturday = dayOfWeek === '土';

              return (
                <th
                  key={day}
                  className={`px-2 py-2 text-center font-medium min-w-[80px] print:min-w-0 print:px-1 print:py-1 print:border print:border-gray-400 ${
                    isToday
                      ? 'bg-primary-100'
                      : isSunday
                      ? 'bg-red-50'
                      : isSaturday
                      ? 'bg-blue-50'
                      : ''
                  }`}
                >
                  <div
                    className={`${
                      isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-bold print:text-[7px]">{day}</div>
                    <div className="text-xs print:text-[6px]">({dayOfWeek})</div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedStaff.map((staffMember) => (
            <tr key={staffMember.id} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
              <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r-2 border-gray-300 print:border print:border-gray-400 print:px-1 print:py-1">
                <div className="flex items-center gap-2 print:flex-col print:gap-0">
                  <span className={`badge ${getPositionColor(staffMember.position)} text-xs whitespace-nowrap print:text-[6px] print:px-1 print:py-0`}>
                    {staffMember.position}
                  </span>
                  <span className="font-medium text-gray-800 whitespace-nowrap staff-name print:text-[7px]">
                    {staffMember.name}
                  </span>
                </div>
              </td>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = formatDate(new Date(currentYear, currentMonth - 1, day));
                const shift = getShiftForDate(staffMember.id, day);
                const isToday = date === today;
                const dayOfWeek = getDayOfWeek(date);
                const isSunday = dayOfWeek === '日';
                const isSaturday = dayOfWeek === '土';

                return (
                  <td
                    key={day}
                    className={`px-2 py-2 text-center cursor-pointer print:border print:border-gray-400 print:cursor-default ${
                      isToday
                        ? 'bg-primary-50'
                        : isSunday
                        ? 'bg-red-50'
                        : isSaturday
                        ? 'bg-blue-50'
                        : ''
                    }`}
                    onClick={() => onDateClick(date)}
                  >
                    {shift ? (
                      <div
                        className={`${getPositionColor(
                          staffMember.position
                        )} px-2 py-1 rounded text-xs whitespace-nowrap print:px-1 print:py-0 print:text-[6px] print:rounded-none ${
                          currentUser.role === 'admin' ? 'cursor-pointer hover:opacity-80 print:cursor-default' : ''
                        }`}
                        onClick={(e) => {
                          if (currentUser.role === 'admin' && onEditShift) {
                            e.stopPropagation();
                            onEditShift(shift);
                          }
                        }}
                      >
                        <div className="print:leading-tight">{shift.startTime.slice(0, 5)}</div>
                        <div className="print:hidden">-</div>
                        <div className="print:leading-tight">{shift.endTime.slice(0, 5)}</div>
                      </div>
                    ) : (
                      <div className="text-gray-300 print:text-[6px]">-</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
