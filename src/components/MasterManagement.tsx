import { useState, useEffect } from 'react';
import type { Staff, PositionMaster } from '../types';
import PositionManagement from './PositionManagement';
import BuildingManagement from './BuildingManagement';
import RoomManagement from './RoomManagement';
import TimeSlotManagement from './TimeSlotManagement';
import DailyStaffRequirementSettings from './DailyStaffRequirementSettings';
import { getToday } from '../utils/helpers';

interface MasterManagementProps {
  currentUser: Staff;
  positions: PositionMaster[];
  onUpdate: () => Promise<void>;
}

export default function MasterManagement({ currentUser, positions, onUpdate }: MasterManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'timeslots' | 'requirements' | 'positions' | 'buildings' | 'rooms'>(() => {
    const savedSubTab = localStorage.getItem('masterManagementSubTab');
    const validSubTabs = ['timeslots', 'requirements', 'positions', 'buildings', 'rooms'];
    return validSubTabs.includes(savedSubTab || '') ? (savedSubTab as 'timeslots' | 'requirements' | 'positions' | 'buildings' | 'rooms') : 'timeslots';
  });

  useEffect(() => {
    localStorage.setItem('masterManagementSubTab', activeSubTab);
  }, [activeSubTab]);

  return (
    <div>
      {/* サブタブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('timeslots')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeSubTab === 'timeslots'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            時間帯設定
          </button>
          <button
            onClick={() => setActiveSubTab('requirements')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeSubTab === 'requirements'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            必要人数設定
          </button>
          <button
            onClick={() => setActiveSubTab('positions')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeSubTab === 'positions'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            役職設定
          </button>
          <button
            onClick={() => setActiveSubTab('buildings')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeSubTab === 'buildings'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            館マスタ
          </button>
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
              activeSubTab === 'rooms'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            客室マスタ
          </button>
        </div>
      </div>

      {/* サブタブコンテンツ */}
      {activeSubTab === 'timeslots' && (
        <TimeSlotManagement />
      )}
      {activeSubTab === 'requirements' && (
        <DailyStaffRequirementSettings selectedDate={getToday()} />
      )}
      {activeSubTab === 'positions' && (
        <PositionManagement currentUser={currentUser} positions={positions} onUpdate={onUpdate} />
      )}
      {activeSubTab === 'buildings' && (
        <BuildingManagement />
      )}
      {activeSubTab === 'rooms' && (
        <RoomManagement />
      )}
    </div>
  );
}
