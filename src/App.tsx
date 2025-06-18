import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import VideoUpload from './components/Upload/VideoUpload';
import VideoList from './components/Videos/VideoList';
import WatermarkManager from './components/Watermarks/WatermarkManager';
import ConfigForm from './components/Settings/ConfigForm';
import AboutPage from './components/About/AboutPage';
import ErrorBoundary from './components/ErrorBoundary';
import { CloudflareConfig, UsageStats } from './types';
import CloudflareStreamService from './services/cloudflare';
import { BarChart3, Video, Upload, Users, Settings, WifiOff, Wifi } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState<CloudflareConfig | null>(null);
  const [cloudflareService, setCloudflareService] = useState<CloudflareStreamService | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Electron API is ready
  useEffect(() => {
    // Set up IPC listeners for menu navigation
    if (window.electron) {
      window.electron.ipcRenderer.on('navigate-to', (tab: string) => {
        setActiveTab(tab);
      });

      window.electron.ipcRenderer.on('refresh-data', () => {
        setRefreshTrigger(prev => prev + 1);
      });

      window.electron.ipcRenderer.on('file-selected', (filePath: string) => {
        setActiveTab('upload');
        // You could pass the file path to the upload component here if needed
      });
    }

    return () => {
      // Clean up listeners if needed
    };
  }, []);

  // Notify main process when configuration state changes
  useEffect(() => {
    if (window.electron) {
      window.electron.ipcRenderer.invoke('update-config-state', isConfigured);
    }
  }, [isConfigured]);

  // Load config from localStorage on startup
  useEffect(() => {
    const savedConfig = localStorage.getItem('cloudflareConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.accountId && parsedConfig.apiToken) {
          setConfig(parsedConfig);
          setCloudflareService(new CloudflareStreamService(parsedConfig));
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Failed to parse saved config:', error);
      }
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      if (cloudflareService && isConfigured) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cloudflareService, isConfigured]);

  const fetchUsageStats = async () => {
    if (!cloudflareService) return;
    
    setIsLoadingStats(true);
    try {
      const stats = await cloudflareService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch stats when service is available or refresh is triggered
  useEffect(() => {
    if (cloudflareService && isConfigured) {
      fetchUsageStats();
    }
  }, [cloudflareService, isConfigured, refreshTrigger]);

  const handleConfigSave = (newConfig: CloudflareConfig) => {
    setConfig(newConfig);
    setCloudflareService(new CloudflareStreamService(newConfig));
    localStorage.setItem('cloudflareConfig', JSON.stringify(newConfig));
    setIsConfigured(true);
    setActiveTab('dashboard');
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('videos');
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'videos': return 'Video Library';
      case 'upload': return 'Upload Video';
      case 'watermarks': return 'Watermark Manager';
      case 'settings': return 'Settings';
      case 'about': return 'About';
      default: return 'Cloudflare Stream Manager';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {!isOnline ? 'Offline' : isLoadingStats ? '...' : usageStats?.totalVideos ?? '-'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready Videos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {!isOnline ? 'Offline' : isLoadingStats ? '...' : usageStats?.readyVideos ?? '-'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Watermarks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {!isOnline ? 'Offline' : isLoadingStats ? '...' : usageStats?.watermarks ?? '-'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-semibold text-gray-900">
                {!isOnline ? 'Offline' : isLoadingStats ? '...' : usageStats?.storageUsed ?? '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {cloudflareService ? (
        !isOnline ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-8">
              <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">You're offline. Video list requires internet connectivity.</p>
            </div>
          </div>
        ) : (
          <VideoList 
            cloudflareService={cloudflareService}
            refreshTrigger={refreshTrigger}
          />
        )
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Configure your Cloudflare credentials to view videos.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderOfflineBanner = () => {
    if (!isOnline) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">You're offline</h3>
              <p className="text-sm text-red-600 mt-1">
                Some features may not work properly without an internet connection. 
                Cloudflare Stream API requires online connectivity.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (!cloudflareService && activeTab !== 'settings' && activeTab !== 'about') {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Service not initialized. Please check your configuration.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      
      case 'videos':
        return cloudflareService ? (
          !isOnline ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">You're offline. Video management requires internet connectivity.</p>
              </div>
            </div>
          ) : (
            <VideoList 
              cloudflareService={cloudflareService}
              refreshTrigger={refreshTrigger}
            />
          )
        ) : null;
      
      case 'upload':
        return cloudflareService ? (
          !isOnline ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">You're offline. Video upload requires internet connectivity.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <WatermarkManager
                cloudflareService={cloudflareService}
                onWatermarkSelect={setSelectedWatermarkId}
                selectedWatermarkId={selectedWatermarkId}
              />
              <VideoUpload
                cloudflareService={cloudflareService}
                watermarkId={selectedWatermarkId}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          )
        ) : null;
      
      case 'watermarks':
        return cloudflareService ? (
          !isOnline ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">You're offline. Watermark management requires internet connectivity.</p>
              </div>
            </div>
          ) : (
            <WatermarkManager cloudflareService={cloudflareService} />
          )
        ) : null;
      
      case 'settings':
        return (
          <ConfigForm 
            onConfigSave={handleConfigSave}
            initialConfig={config ?? undefined}
          />
        );
      
      case 'about':
        return <AboutPage />;
      
      default:
        return renderDashboard();
    }
  };

  // Show welcome/configuration screen if not configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Stream Manager
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Your desktop companion for Cloudflare Stream
            </p>
            <p className="text-gray-500">
              Configure your Cloudflare credentials to get started managing your video content
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Initial Setup</h2>
              </div>
              <p className="text-blue-100 mt-2">
                Enter your Cloudflare Stream API credentials to begin
              </p>
            </div>
            
            <div className="p-8">
              <ConfigForm onConfigSave={handleConfigSave} />
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Don't have a Cloudflare account?{' '}
              <a 
                href="https://dash.cloudflare.com/sign-up" 
                onClick={async (e) => {
                  e.preventDefault();
                  const url = "https://dash.cloudflare.com/sign-up";
                  
                  if (window.electron?.shell?.openExternal) {
                    // Electron: Open in system default browser
                    try {
                      const result = await window.electron.shell.openExternal(url);
                      if (!result.success) {
                        throw new Error(result.error || 'Failed to open external URL');
                      }
                    } catch (err) {
                      console.error('Failed to open external URL:', err);
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  } else if (window.electron?.ipcRenderer?.invoke) {
                    // Fallback: IPC invoke
                    try {
                      const result = await window.electron.ipcRenderer.invoke('open-external', url);
                      if (!result.success) {
                        throw new Error(result.error);
                      }
                    } catch (err) {
                      console.error('Failed to open external URL:', err);
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  } else {
                    // Web browser fallback
                    window.open(url, "_blank", "noopener,noreferrer");
                  }
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up here
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show main application interface
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getPageTitle()}
          onRefresh={activeTab === 'videos' || activeTab === 'dashboard' ? handleRefresh : undefined}
          isOnline={isOnline}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderOfflineBanner()}
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;