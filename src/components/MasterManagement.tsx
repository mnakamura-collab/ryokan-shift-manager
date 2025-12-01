import { useState, useEffect } from 'react';
import type { Staff, PositionMaster } from '../types';
import StaffManagement from './StaffManagement';
import PositionManagement from './PositionManagement';
import BuildingManagement from './BuildingManagement';
import RoomManagement from './RoomManagement';

interface MasterManagementProps {
  currentUser: Staff;
  staff: Staff[];
  positions: PositionMaster[];
  onUpdate: () => Promise<void>;
}

export default function MasterManagement({ currentUser, staff, positions, onUpdate }: MasterManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'positions' | 'buildings' | 'rooms'>(() => {
    const savedSubTab = localStorage.getItem('masterManagementSubTab');
    const validSubTabs = ['staff', 'positions', 'buildings', 'rooms'];
    return validSubTabs.includes(savedSubTab || '') ? (savedSubTab as 'staff' | 'positions' | 'buildings' | 'rooms') : 'staff';
  });

  useEffect(() => {
    localStorage.setItem('masterManagementSubTab', activeSubTab);
  }, [activeSubTab]);

  return (
    <div>
      {/* サブタブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('staff')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'staff'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            スタッフ管理
          </button>
          <button
            onClick={() => setActiveSubTab('positions')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'positions'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            役職管理
          </button>
          <button
            onClick={() => setActiveSubTab('buildings')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
              activeSubTab === 'buildings'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            館マスタ
          </button>
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors ${
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
      {activeSubTab === 'staff' && (
        <StaffManagement staff={staff} onUpdate={onUpdate} />
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
