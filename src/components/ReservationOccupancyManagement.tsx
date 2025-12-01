import { useState, useEffect } from 'react';
import type { Staff, Reservation } from '../types';
import ReservationManagement from './ReservationManagement';
import ReservationReview from './ReservationReview';
import DailyOccupancyManagement from './DailyOccupancyManagement';

interface ReservationOccupancyManagementProps {
  currentUser: Staff;
  reservations: Reservation[];
  onUpdate: () => Promise<void>;
}

export default function ReservationOccupancyManagement({ currentUser, reservations, onUpdate }: ReservationOccupancyManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'reservation' | 'review' | 'occupancy'>(() => {
    const savedSubTab = localStorage.getItem('reservationOccupancySubTab');
    const validSubTabs = ['reservation', 'review', 'occupancy'];
    return validSubTabs.includes(savedSubTab || '') ? (savedSubTab as 'reservation' | 'review' | 'occupancy') : 'reservation';
  });

  useEffect(() => {
    localStorage.setItem('reservationOccupancySubTab', activeSubTab);
  }, [activeSubTab]);

  return (
    <div>
      {/* サブタブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('reservation')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'reservation'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            予約管理
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'review'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            予約レビュー
          </button>
          <button
            onClick={() => setActiveSubTab('occupancy')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'occupancy'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            稼働状況管理
          </button>
        </div>
      </div>

      {/* サブタブコンテンツ */}
      {activeSubTab === 'reservation' && (
        <ReservationManagement currentUser={currentUser} reservations={reservations} onUpdate={onUpdate} />
      )}
      {activeSubTab === 'review' && (
        <ReservationReview currentUser={currentUser} reservations={reservations} onUpdate={onUpdate} />
      )}
      {activeSubTab === 'occupancy' && (
        <DailyOccupancyManagement />
      )}
    </div>
  );
}
