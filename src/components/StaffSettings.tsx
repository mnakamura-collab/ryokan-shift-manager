import { useState } from 'react';
import type { Staff } from '../types';
import StaffAvailabilitySettings from './StaffAvailabilitySettings';
import StaffWorkLimitSettings from './StaffWorkLimitSettings';
import UnavailableDateRequest from './UnavailableDateRequest';
import UnavailableDateApproval from './UnavailableDateApproval';

interface StaffSettingsProps {
  currentUser: Staff;
  staff: Staff[];
}

type SubTab = 'availability' | 'worklimit' | 'request' | 'approval';

export default function StaffSettings({ currentUser, staff }: StaffSettingsProps) {
  const [subTab, setSubTab] = useState<SubTab>(() => {
    // 管理者はデフォルトで勤務可能時間、一般スタッフは希望休申請
    return currentUser.role === 'admin' ? 'availability' : 'request';
  });

  return (
    <div className="space-y-6">
      {/* サブタブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSubTab('availability')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              subTab === 'availability'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            勤務可能時間
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setSubTab('worklimit')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                subTab === 'worklimit'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              労働時間制約
            </button>
          )}
          <button
            onClick={() => setSubTab('request')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              subTab === 'request'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            希望休申請
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setSubTab('approval')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                subTab === 'approval'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              希望休承認
            </button>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div>
        {subTab === 'availability' && (
          <StaffAvailabilitySettings
            currentUser={currentUser}
            staff={staff}
            isAdminView={currentUser.role === 'admin'}
          />
        )}
        {subTab === 'worklimit' && currentUser.role === 'admin' && (
          <StaffWorkLimitSettings
            currentUser={currentUser}
            staff={staff}
            isAdminView={true}
          />
        )}
        {subTab === 'request' && (
          <UnavailableDateRequest currentUser={currentUser} />
        )}
        {subTab === 'approval' && currentUser.role === 'admin' && (
          <UnavailableDateApproval staff={staff} />
        )}
      </div>
    </div>
  );
}
