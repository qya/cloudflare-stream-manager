import React from 'react';
import { RefreshCw, Bell, User, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  isOnline?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onRefresh, isLoading, isOnline = true }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Online/Offline Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading || !isOnline}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                isLoading ? 'animate-spin text-blue-500' : 
                !isOnline ? 'text-gray-400 cursor-not-allowed' :
                'text-gray-500 hover:text-gray-700'
              }`}
              title={!isOnline ? 'Cannot refresh while offline' : 'Refresh'}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
          {/*
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
           <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div> */}
        </div>
      </div>
    </header>
  );
};

export default Header;