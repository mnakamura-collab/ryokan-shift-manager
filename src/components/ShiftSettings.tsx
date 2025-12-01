import { useState, useEffect } from 'react';
import type { Staff } from '../types';
import StandardShiftNew from './StandardShiftNew';
import TimeSlotManagement from './TimeSlotManagement';
import DailyStaffRequirementSettings from './DailyStaffRequirementSettings';
import { getToday } from '../utils/helpers';

interface ShiftSettingsProps {
  currentUser: Staff;
  staff: Staff[];
  onUpdate: () => Promise<void>;
}

export default function ShiftSettings({ currentUser, staff, onUpdate }: ShiftSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'standard' | 'timeslots' | 'requirements'>(() => {
    const savedSubTab = localStorage.getItem('shiftSettingsSubTab');
    const validSubTabs = ['standard', 'timeslots', 'requirements'];
    return validSubTabs.includes(savedSubTab || '') ? (savedSubTab as 'standard' | 'timeslots' | 'requirements') : 'standard';
  });

  useEffect(() => {
    localStorage.setItem('shiftSettingsSubTab', activeSubTab);
  }, [activeSubTab]);

  return (
    <div>
      {/* サブタブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('standard')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'standard'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            標準シフト
          </button>
          <button
            onClick={() => setActiveSubTab('timeslots')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'timeslots'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            時間帯設定
          </button>
          <button
            onClick={() => setActiveSubTab('requirements')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'requirements'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            必要人数設定
          </button>
        </div>
      </div>

      {/* サブタブコンテンツ */}
      {activeSubTab === 'standard' && (
        <StandardShiftNew currentUser={currentUser} staff={staff} onUpdate={onUpdate} />
      )}
      {activeSubTab === 'timeslots' && (
        <TimeSlotManagement />
      )}
      {activeSubTab === 'requirements' && (
        <DailyStaffRequirementSettings selectedDate={getToday()} />
      )}
    </div>
  );
}
