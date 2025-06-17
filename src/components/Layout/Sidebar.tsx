import React from 'react';
import { Video, Upload, Droplets, Settings, Home, Info } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'videos', name: 'Videos', icon: Video },
    { id: 'upload', name: 'Upload', icon: Upload },
    { id: 'watermarks', name: 'Watermarks', icon: Droplets },
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'about', name: 'About', icon: Info },
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-full">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Stream Manager</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">Cloudflare Stream</p>
          <p className="text-xs text-gray-600 mt-1">Manage your video content with ease</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;