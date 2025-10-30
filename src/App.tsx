import { useState, useEffect } from 'react';
import type { Staff, Shift, Reservation, PositionMaster } from './types';
import { setupInitialData, staffStorage, shiftStorage, reservationStorage, currentUserStorage, positionStorage } from './utils/supabaseStorage';
import { getToday, formatDateJP, getDayOfWeek } from './utils/helpers';
import TodayShift from './components/TodayShift';
import ShiftCalendar from './components/ShiftCalendar';
import StaffManagement from './components/StaffManagement';
import StandardShiftNew from './components/StandardShiftNew';
import ReservationManagement from './components/ReservationManagement';
import ShiftCompletion from './components/ShiftCompletion';
import PositionManagement from './components/PositionManagement';
import ReservationReview from './components/ReservationReview';
import Login from './components/Login';

function App() {
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  // localStorageから前回のタブを復元（なければ'today'）
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'standard' | 'reservation' | 'review' | 'completion' | 'staff' | 'positions'>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as 'today' | 'calendar' | 'standard' | 'reservation' | 'review' | 'completion' | 'staff' | 'positions') || 'today';
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [positions, setPositions] = useState<PositionMaster[]>([]);

  // activeTabが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // 初期化
  useEffect(() => {
    const init = async () => {
      await setupInitialData();
      const user = currentUserStorage.get();
      setCurrentUser(user);
      await loadData();
    };
    init();
  }, []);

  const loadData = async () => {
    const [staffData, shiftsData, reservationsData, positionsData] = await Promise.all([
      staffStorage.getAll(),
      shiftStorage.getAll(),
      reservationStorage.getAll(),
      positionStorage.getAll(),
    ]);
    setStaff(staffData);
    setShifts(shiftsData);
    setReservations(reservationsData);
    setPositions(positionsData);
  };

  const handleLogin = (user: Staff) => {
    setCurrentUser(user);
    currentUserStorage.set(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    currentUserStorage.clear();
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">旅館シフト管理</h1>
              <p className="text-gray-600">{formatDateJP(getToday())} ({getDayOfWeek(getToday())})</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">ログイン中</p>
                <p className="font-semibold text-gray-800">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.position}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'today'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              本日のシフト
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              カレンダー
            </button>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('standard')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'standard'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                標準シフト
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('reservation')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'reservation'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                予約管理
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('review')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'review'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                予約レビュー
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('completion')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'completion'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                シフト完了
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                スタッフ管理
              </button>
            )}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('positions')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'positions'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                役職管理
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'today' && (
            <TodayShift
              currentUser={currentUser}
              staff={staff}
              shifts={shifts}
              reservations={reservations}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'calendar' && (
            <ShiftCalendar
              currentUser={currentUser}
              staff={staff}
              shifts={shifts}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'standard' && currentUser.role === 'admin' && (
            <StandardShiftNew
              currentUser={currentUser}
              staff={staff}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'reservation' && currentUser.role === 'admin' && (
            <ReservationManagement
              currentUser={currentUser}
              reservations={reservations}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'review' && currentUser.role === 'admin' && (
            <ReservationReview
              currentUser={currentUser}
              reservations={reservations}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'completion' && currentUser.role === 'admin' && (
            <ShiftCompletion
              currentUser={currentUser}
              staff={staff}
              shifts={shifts}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'staff' && currentUser.role === 'admin' && (
            <StaffManagement
              staff={staff}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'positions' && currentUser.role === 'admin' && (
            <PositionManagement
              currentUser={currentUser}
              positions={positions}
              onUpdate={loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
