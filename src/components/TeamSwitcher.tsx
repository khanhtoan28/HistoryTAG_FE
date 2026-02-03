import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiChevronDown, FiLoader, FiUsers, FiRefreshCw } from 'react-icons/fi';

export default function TeamSwitcher() {
  const { activeTeam, availableTeams, switchTeam, isTeamSwitching } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Debug: Log availableTeams to help diagnose
  React.useEffect(() => {
    console.log('[TeamSwitcher] Debug info:', {
      availableTeams,
      availableTeamsLength: availableTeams?.length,
      activeTeam,
      willShow: (availableTeams?.length || 0) > 1,
      availableTeamsType: typeof availableTeams,
      isArray: Array.isArray(availableTeams)
    });
  }, [availableTeams, activeTeam]);

  const handleTeamSelect = async (teamId: string) => {
    try {
      await switchTeam(teamId);
      setIsOpen(false);
    } catch (error) {
      // Error handled by AuthContext
      console.error('Team switch failed:', error);
    }
  };

  // Don't show if user only has 1 team or no teams
  // Check both availableTeams from AuthContext and ensure it's an array with length > 1
  const teamsCount = Array.isArray(availableTeams) ? availableTeams.length : 0;
  if (teamsCount <= 1) {
    console.log('[TeamSwitcher] Not showing - teamsCount:', teamsCount, 'availableTeams:', availableTeams);
    return null;
  }

  console.log('[TeamSwitcher] Rendering with teams:', availableTeams, 'activeTeam:', activeTeam);

  // Map team names to Vietnamese
  const getTeamName = (teamId: string) => {
    const teamMap: Record<string, string> = {
      'DEV': 'Phát triển',
      'DEPLOYMENT': 'Triển khai',
      'MAINTENANCE': 'Bảo trì',
      'SALES': 'Kinh doanh',
      'CUSTOMER_SERVICE': 'Chăm sóc khách hàng',
    };
    return teamMap[teamId] || teamId;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTeamSwitching}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
        title="Chuyển đổi đội làm việc"
      >
        <FiRefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {activeTeam ? getTeamName(activeTeam) : 'Chọn đội'}
        </span>
        <FiChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {isTeamSwitching && <FiLoader className="w-4 h-4 animate-spin text-blue-500" />}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 min-w-[180px] bg-white border border-gray-300 rounded-md shadow-lg z-50 dark:bg-gray-800 dark:border-gray-700">
          {availableTeams.map(team => (
            <button
              key={team}
              onClick={() => handleTeamSelect(team)}
              disabled={isTeamSwitching}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors duration-150 dark:hover:bg-gray-700 ${
                team === activeTeam 
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{getTeamName(team)}</span>
                {team === activeTeam && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}