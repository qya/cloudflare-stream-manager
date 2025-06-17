import React from 'react';
import { Info, Monitor, Cpu, HardDrive, Globe, Package } from 'lucide-react';

const AboutPage: React.FC = () => {
  const [electronInfo, setElectronInfo] = React.useState<{
    version: string;
    platform: string;
    nodeVersion: string;
    electronVersion: string;
    chromeVersion: string;
  } | null>(null);

  React.useEffect(() => {
    // Get Electron-specific information if available
    if (window.electron) {
      setElectronInfo({
        version: window.electron.getVersion(),
        platform: window.electron.getPlatform(),
        nodeVersion: window.electron.getNodeVersion(),
        electronVersion: window.electron.getElectronVersion(),
        chromeVersion: window.electron.getChromeVersion(),
      });
    }
  }, []);

  const appInfo = {
    name: 'Cloudflare Stream Manager',
    version: electronInfo?.version || '0.1.5',
    description: 'Desktop companion for managing Cloudflare Stream video content',
    author: 'Fais.tech',
    license: 'MIT'
  };

  const systemInfo = {
    platform: electronInfo?.platform || navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenResolution: `${screen.width} x ${screen.height}`,
    viewportSize: `${window.innerWidth} x ${window.innerHeight}`,
    colorDepth: `${screen.colorDepth}-bit`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Unknown',
    nodeVersion: electronInfo?.nodeVersion || 'N/A (Web)',
    electronVersion: electronInfo?.electronVersion || 'N/A (Web)',
    chromeVersion: electronInfo?.chromeVersion || 'Unknown'
  };

  const techStack = [
    { name: 'Electron', version: electronInfo?.electronVersion || '28.x', description: 'Desktop app framework' },
    { name: 'React', version: '18.x', description: 'Frontend framework' },
    { name: 'TypeScript', version: '5.x', description: 'Type-safe JavaScript' },
    { name: 'Vite', version: '5.x', description: 'Build tool and dev server' },
    { name: 'Tailwind CSS', version: '3.x', description: 'Utility-first CSS framework' },
    { name: 'Electron Forge', version: '7.x', description: 'Electron build toolchain' },
    { name: 'Lucide React', version: '0.x', description: 'Beautiful icons' },
    { name: 'Cloudflare Stream API', version: 'v1', description: 'Video streaming service' }
  ];

  return (
    <div className="space-y-6">
      {/* Application Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Application Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-gray-900">{appInfo.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Version</label>
              <p className="text-gray-900">{appInfo.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-gray-900">{appInfo.description}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Author</label>
              <p className="text-gray-900">{appInfo.author}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">License</label>
              <p className="text-gray-900">{appInfo.license}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Build Date</label>
              <p className="text-gray-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Specifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">System Specifications</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Platform</label>
              <p className="text-gray-900">{systemInfo.platform}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Language</label>
              <p className="text-gray-900">{systemInfo.language}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Screen Resolution</label>
              <p className="text-gray-900">{systemInfo.screenResolution}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Viewport Size</label>
              <p className="text-gray-900">{systemInfo.viewportSize}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Color Depth</label>
              <p className="text-gray-900">{systemInfo.colorDepth}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Timezone</label>
              <p className="text-gray-900">{systemInfo.timezone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Memory</label>
              <p className="text-gray-900">{systemInfo.memory}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Cookies Enabled</label>
              <p className="text-gray-900">{systemInfo.cookieEnabled ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Online Status</label>
              <p className="text-gray-900">{systemInfo.onLine ? 'Online' : 'Offline'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Node.js Version</label>
              <p className="text-gray-900">{systemInfo.nodeVersion}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Electron Version</label>
              <p className="text-gray-900">{systemInfo.electronVersion}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Chrome Version</label>
              <p className="text-gray-900">{systemInfo.chromeVersion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Technology Stack</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((tech, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{tech.name}</h3>
                <span className="text-sm text-gray-500">{tech.version}</span>
              </div>
              <p className="text-sm text-gray-600">{tech.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Browser Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Browser Information</h2>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="text-sm font-medium text-gray-600">User Agent</label>
          <p className="text-sm text-gray-900 mt-1 break-all">{systemInfo.userAgent}</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage; 