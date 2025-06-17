import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, Trash2, Plus, X, HardDrive, Link, Eye, Download } from 'lucide-react';
import { Watermark } from '../../types';
import CloudflareStreamService from '../../services/cloudflare';

interface WatermarkManagerProps {
  cloudflareService: CloudflareStreamService;
  onWatermarkSelect?: (watermarkId: string) => void;
  selectedWatermarkId?: string;
}

type WatermarkTab = 'local' | 'remote';

interface WatermarkConfig {
  name: string;
  opacity: number;
  padding: number;
  scale: number;
  position: string;
}

const WatermarkManager: React.FC<WatermarkManagerProps> = ({ 
  cloudflareService,
  onWatermarkSelect,
  selectedWatermarkId
}) => {
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeTab, setActiveTab] = useState<WatermarkTab>('local');
  const [imageUrl, setImageUrl] = useState('');
  const [previewWatermark, setPreviewWatermark] = useState<Watermark | null>(null);
  const [config, setConfig] = useState<WatermarkConfig>({
    name: '',
    opacity: 1.0,
    padding: 0.05,
    scale: 0.15,
    position: 'upperRight'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const positionOptions = [
    { value: 'upperRight', label: 'Upper Right' },
    { value: 'upperLeft', label: 'Upper Left' },
    { value: 'lowerRight', label: 'Lower Right' },
    { value: 'lowerLeft', label: 'Lower Left' },
    { value: 'center', label: 'Center' }
  ];

  const fetchWatermarks = async () => {
    try {
      setLoading(true);
      const fetchedWatermarks = await cloudflareService.getWatermarks();
      setWatermarks(fetchedWatermarks);
    } catch (err) {
      console.error('Failed to fetch watermarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatermarks();
  }, []);

  const resetForm = () => {
    setShowUploadForm(false);
    setImageUrl('');
    setConfig({
      name: '',
      opacity: 1.0,
      padding: 0.05,
      scale: 0.15,
      position: 'upperRight'
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLocalUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      const watermarkName = config.name || file.name;
      const watermark = await cloudflareService.uploadWatermark(file, watermarkName);
      setWatermarks([watermark, ...watermarks]);
      resetForm();
    } catch (err) {
      alert('Failed to upload watermark');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoteUpload = async () => {
    if (!imageUrl.trim()) {
      alert('Please enter an image URL');
      return;
    }

    try {
      setUploading(true);
      const watermarkName = config.name || imageUrl.split('/').pop() || 'Remote Watermark';
      
      const uploadOptions = {
        name: watermarkName,
        opacity: config.opacity,
        padding: config.padding,
        scale: config.scale,
        position: config.position
      };

      const watermark = await cloudflareService.uploadWatermarkFromUrl(imageUrl, uploadOptions);
      setWatermarks([watermark, ...watermarks]);
      resetForm();
    } catch (err) {
      alert('Failed to upload watermark from URL');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteWatermark = async (watermarkId: string) => {
    if (!confirm('Are you sure you want to delete this watermark?')) return;
    
    try {
      await cloudflareService.deleteWatermark(watermarkId);
      setWatermarks(prev => prev.filter(w => w.uid !== watermarkId));
      if (selectedWatermarkId === watermarkId) {
        onWatermarkSelect?.('');
      }
    } catch (err) {
      alert('Failed to delete watermark');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
      <button
        onClick={() => setActiveTab('local')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'local'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <HardDrive className="w-4 h-4" />
        <span>Local Upload</span>
      </button>
      <button
        onClick={() => setActiveTab('remote')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'remote'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Link className="w-4 h-4" />
        <span>Remote Upload</span>
      </button>
    </div>
  );

  const renderConfigForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Watermark Name
        </label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter watermark name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Position
        </label>
        <select
          value={config.position}
          onChange={(e) => setConfig(prev => ({ ...prev, position: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {positionOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Opacity ({config.opacity})
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.opacity}
          onChange={(e) => setConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Transparent</span>
          <span>Opaque</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scale ({config.scale})
        </label>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.05"
          value={config.scale}
          onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Small</span>
          <span>Large</span>
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Padding ({config.padding})
        </label>
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={config.padding}
          onChange={(e) => setConfig(prev => ({ ...prev, padding: parseFloat(e.target.value) }))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>No Padding</span>
          <span>High Padding</span>
        </div>
      </div>
    </div>
  );

  const renderLocalUpload = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Image
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Click to select an image file (PNG, JPG, GIF)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLocalUpload(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );

  const renderRemoteUpload = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
        <Link className="w-6 h-6 text-blue-600" />
        <div>
          <h4 className="font-medium text-blue-900">Upload from URL</h4>
          <p className="text-sm text-blue-700">
            Enter a direct link to an image file (PNG, JPG, GIF)
          </p>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image URL
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/watermark.png"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={uploading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Make sure the URL is publicly accessible and points directly to an image file
        </p>
      </div>
    </div>
  );

  const renderPreviewModal = () => {
    if (!previewWatermark) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {previewWatermark.meta?.name || previewWatermark.filename || previewWatermark.name || 'Untitled Watermark'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {previewWatermark.width}x{previewWatermark.height} • {formatBytes(previewWatermark.size)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {previewWatermark.downloadedFrom && (
                <a
                  href={previewWatermark.downloadedFrom}
                  onClick={(e) => {
                    e.preventDefault();
                    if (previewWatermark.downloadedFrom) {
                      window.electron?.shell?.openExternal(previewWatermark.downloadedFrom);
                    }
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Open original image"
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => setPreviewWatermark(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Image Preview */}
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                  {previewWatermark.downloadedFrom ? (
                    <img
                      src={previewWatermark.downloadedFrom}
                      alt={previewWatermark.name}
                      className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Preview not available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Watermark Details */}
              <div className="lg:w-80 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Watermark Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ID:</span>
                      <span className="text-sm font-mono text-gray-900 break-all">
                        {previewWatermark.uid}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dimensions:</span>
                      <span className="text-sm text-gray-900">
                        {previewWatermark.width} × {previewWatermark.height}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">File Size:</span>
                      <span className="text-sm text-gray-900">
                        {formatBytes(previewWatermark.size)}
                      </span>
                    </div>
                    
                    {previewWatermark.opacity && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Opacity:</span>
                        <span className="text-sm text-gray-900">
                          {(previewWatermark.opacity * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {previewWatermark.scale && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Scale:</span>
                        <span className="text-sm text-gray-900">
                          {(previewWatermark.scale * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {previewWatermark.padding && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Padding:</span>
                        <span className="text-sm text-gray-900">
                          {(previewWatermark.padding * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    
                    {previewWatermark.position && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Position:</span>
                        <span className="text-sm text-gray-900 capitalize">
                          {previewWatermark.position.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    )}
                    
                    {previewWatermark.created && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(previewWatermark.created).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {onWatermarkSelect && (
                    <button
                      onClick={() => {
                        onWatermarkSelect(previewWatermark.uid);
                        setPreviewWatermark(null);
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedWatermarkId === previewWatermark.uid
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selectedWatermarkId === previewWatermark.uid ? 'Currently Selected' : 'Select Watermark'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleDeleteWatermark(previewWatermark.uid);
                      setPreviewWatermark(null);
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Delete Watermark
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Watermarks</h3>
            <p className="text-sm text-gray-500 mt-1">{watermarks.length} watermarks</p>
          </div>
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Watermark</span>
          </button>
        </div>
      </div>

      {showUploadForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Upload New Watermark</h4>
            <button
              onClick={resetForm}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderTabNavigation()}
          {renderConfigForm()}
          
          {activeTab === 'local' ? renderLocalUpload() : renderRemoteUpload()}

          {activeTab === 'remote' && imageUrl.trim() && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleRemoteUpload}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload from URL
              </button>
            </div>
          )}
          
          {uploading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Uploading watermark...</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {watermarks.length === 0 ? (
          <div className="p-12 text-center">
            <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No watermarks uploaded</h3>
            <p className="text-gray-500">Upload your first watermark to get started</p>
          </div>
        ) : (
          watermarks.map((watermark) => (
            <div key={watermark.uid} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                    onClick={() => setPreviewWatermark(watermark)}
                    title="Click to preview"
                  >
                    {watermark.downloadedFrom ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={watermark.downloadedFrom} 
                          alt={watermark.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Image className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {watermark.meta?.name || watermark.filename || watermark.name || 'Untitled'}
                    </h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{watermark.width}x{watermark.height}</span>
                      <span>{formatBytes(watermark.size)}</span>
                      {watermark.opacity && <span>Opacity: {watermark.opacity}</span>}
                      {watermark.position && <span>Position: {watermark.position}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewWatermark(watermark)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Preview watermark"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {onWatermarkSelect && (
                    <button
                      onClick={() => onWatermarkSelect(watermark.uid)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedWatermarkId === watermark.uid
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedWatermarkId === watermark.uid ? 'Selected' : 'Select'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteWatermark(watermark.uid)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {renderPreviewModal()}
    </div>
  );
};

export default WatermarkManager;