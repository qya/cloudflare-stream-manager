import React, { useState, useRef } from 'react';
import { Upload, Film, X, CheckCircle, AlertCircle, Link, HardDrive, Trash2 } from 'lucide-react';
import { TusUploadService } from '../../services/tusUpload';
import { UploadProgress } from '../../types';
import CloudflareStreamService from '../../services/cloudflare';

interface VideoUploadProps {
  cloudflareService: CloudflareStreamService;
  watermarkId?: string;
  onUploadComplete?: (videoId: string) => void;
}

interface UploadItem {
  id: string;
  file?: File;
  url?: string;
  progress: UploadProgress | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  videoId?: string;
  name: string;
}

interface UploadState {
  items: UploadItem[];
  globalStatus: 'idle' | 'uploading' | 'completed';
}

type UploadTab = 'local' | 'remote';

const VideoUpload: React.FC<VideoUploadProps> = ({ 
  cloudflareService, 
  watermarkId,
  onUploadComplete 
}) => {
  const [activeTab, setActiveTab] = useState<UploadTab>('local');
  const [uploadState, setUploadState] = useState<UploadState>({
    items: [],
    globalStatus: 'idle',
  });
  const [dragActive, setDragActive] = useState(false);
  const [remoteUrls, setRemoteUrls] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(isVideoFile);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const isVideoFile = (file: File): boolean => {
    // Check MIME type first
    if (file.type.startsWith('video/')) {
      return true;
    }
    
    // If MIME type is not recognized (common issue with .mkv files on Windows),
    // check file extension
    const fileName = file.name.toLowerCase();
    const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleFileSelect = (files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: generateId(),
      file,
      progress: null,
      status: 'idle' as const,
      name: file.name,
    }));

    setUploadState(prev => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isVideoFile);
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset the input value to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemoteUrls(e.target.value);
  };

  const addUrlsToQueue = () => {
    const urls = remoteUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) return;

    const newItems: UploadItem[] = urls.map(url => ({
      id: generateId(),
      url,
      progress: null,
      status: 'idle' as const,
      name: url.split('/').pop() || 'Remote Video',
    }));

    setUploadState(prev => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));

    setRemoteUrls('');
  };

  const removeItem = (itemId: string) => {
    setUploadState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  const clearAll = () => {
    setUploadState({
      items: [],
      globalStatus: 'idle',
    });
    setRemoteUrls('');
  };

  const startBulkUpload = async () => {
    const itemsToUpload = uploadState.items.filter(item => item.status === 'idle');
    if (itemsToUpload.length === 0) return;

    setUploadState(prev => ({ ...prev, globalStatus: 'uploading' }));

    // Process uploads concurrently but limit concurrent uploads to avoid overwhelming the server
    const concurrentLimit = 3;
    const batches = [];
    
    for (let i = 0; i < itemsToUpload.length; i += concurrentLimit) {
      batches.push(itemsToUpload.slice(i, i + concurrentLimit));
    }

    try {
      for (const batch of batches) {
        await Promise.all(batch.map(item => uploadSingleItem(item)));
      }
      
      setUploadState(prev => ({ ...prev, globalStatus: 'completed' }));
    } catch (error) {
      console.error('Bulk upload error:', error);
      setUploadState(prev => ({ ...prev, globalStatus: 'completed' }));
    }
  };

  const uploadSingleItem = async (item: UploadItem) => {
    try {
      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.id === item.id ? { ...i, status: 'uploading' as const, error: undefined } : i
        ),
      }));

      if (item.file) {
        await handleLocalUpload(item);
      } else if (item.url) {
        await handleRemoteUpload(item);
      }
    } catch (error) {
      console.error(`Upload failed for ${item.name}:`, error);
      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.id === item.id ? { 
            ...i, 
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : i
        ),
      }));
    }
  };

  const handleLocalUpload = async (item: UploadItem) => {
    if (!item.file) return;

    console.log('Starting local upload for file:', item.file.name, 'Size:', item.file.size);

    const tusEndpoint = cloudflareService.getTusEndpoint();
    console.log('Using TUS endpoint:', tusEndpoint);

    const metadata: Record<string, string> = {
      name: item.file.name,
      filename: item.file.name,
      filetype: item.file.type,
      authorization: `Bearer ${cloudflareService.getApiToken()}`,
    };

    if (watermarkId && watermarkId.trim() !== '') {
      metadata.watermark = watermarkId;
    }

    console.log('TUS upload metadata prepared:', { ...metadata, authorization: 'Bearer [HIDDEN]' });

    const videoId = await TusUploadService.uploadFile({
      endpoint: tusEndpoint,
      file: item.file,
      metadata: metadata,
      onProgress: (progress) => {
        setUploadState(prev => ({
          ...prev,
          items: prev.items.map(i => 
            i.id === item.id ? { ...i, progress } : i
          ),
        }));
      },
      onSuccess: (upload) => {
        console.log('TUS upload success callback triggered for:', item.name);
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        throw error;
      },
    });

    console.log('TUS upload method returned video ID:', videoId);

    if (videoId) {
      await verifyUploadCompletion(item.id, videoId);
    } else {
      throw new Error('Upload completed but no video ID was returned');
    }
  };

  const handleRemoteUpload = async (item: UploadItem) => {
    if (!item.url) return;

    console.log('Starting remote upload from URL:', item.url);

    // Set up fake progress for URL uploads
    const progressInterval = setInterval(() => {
      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => {
          if (i.id !== item.id || i.status !== 'uploading') return i;
          
          const currentProgress = i.progress?.percentage || 0;
          if (currentProgress < 90) {
            return {
              ...i,
              progress: {
                bytesUploaded: currentProgress + 10,
                bytesTotal: 100,
                percentage: Math.min(currentProgress + 10, 90)
              }
            };
          }
          return i;
        }),
      }));
    }, 500);

    try {
      const uploadOptions: any = {
        meta: {
          name: item.name
        }
      };

      if (watermarkId && watermarkId.trim() !== '') {
        uploadOptions.watermarkUid = watermarkId;
      }

      const video = await cloudflareService.uploadVideoFromUrl(item.url, uploadOptions);

      clearInterval(progressInterval);
      
      console.log('Remote upload completed:', video.uid);
      
      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.id === item.id ? { 
            ...i, 
            progress: { bytesUploaded: 100, bytesTotal: 100, percentage: 100 }
          } : i
        ),
      }));

      await verifyUploadCompletion(item.id, video.uid);
      
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const verifyUploadCompletion = async (itemId: string, videoId: string) => {
    console.log('Verifying upload completion for video:', videoId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const videoDetails = await cloudflareService.getVideoDetails(videoId);
      console.log('Video details after upload:', {
        uid: videoDetails.uid,
        status: videoDetails.status,
        filename: videoDetails.filename,
        size: videoDetails.size
      });

      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.id === itemId ? { 
            ...i, 
            status: 'success' as const,
            videoId: videoId
          } : i
        ),
      }));
      
      onUploadComplete?.(videoId);
      
    } catch (verificationError) {
      console.warn('Could not verify upload immediately, but upload appears successful:', verificationError);
      setUploadState(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.id === itemId ? { 
            ...i, 
            status: 'success' as const,
            videoId: videoId
          } : i
        ),
      }));
      
      onUploadComplete?.(videoId);
    }
  };

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
      <button
        onClick={() => setActiveTab('local')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

  const renderLocalUpload = () => (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
        dragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Drop your videos here, or{' '}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-blue-600 hover:text-blue-700 underline"
        >
          browse
        </button>
      </h3>
      <p className="text-gray-500">
        Supports MP4, MOV, AVI, MKV, and WebM files up to 5GB each
      </p>
      <p className="text-sm text-gray-400 mt-2">
        You can select multiple files at once
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/avi,video/x-msvideo,video/webm,video/x-matroska,.mp4,.mov,.avi,.mkv,.webm"
        onChange={handleFileInput}
        multiple
        className="hidden"
      />
    </div>
  );

  const renderRemoteUpload = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
        <Link className="w-6 h-6 text-blue-600" />
        <div>
          <h4 className="font-medium text-blue-900">Upload from URLs</h4>
          <p className="text-sm text-blue-700">
            Enter direct links to video files (one URL per line)
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <label htmlFor="video-urls" className="block text-sm font-medium text-gray-700">
          Video URLs
        </label>
        <textarea
          id="video-urls"
          value={remoteUrls}
          onChange={handleUrlsChange}
          placeholder={`https://example.com/video1.mp4\nhttps://example.com/video2.mov\nhttps://example.com/video3.webm`}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          disabled={uploadState.globalStatus === 'uploading'}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Make sure URLs are publicly accessible and point directly to video files
          </p>
          <button
            onClick={addUrlsToQueue}
            disabled={!remoteUrls.trim() || uploadState.globalStatus === 'uploading'}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );

  const renderUploadQueue = () => {
    if (uploadState.items.length === 0) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'success': return 'text-green-600';
        case 'error': return 'text-red-600';
        case 'uploading': return 'text-blue-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'success': return <CheckCircle className="w-5 h-5" />;
        case 'error': return <AlertCircle className="w-5 h-5" />;
        case 'uploading': return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
        default: return <Film className="w-5 h-5" />;
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">
            Upload Queue ({uploadState.items.length} items)
          </h4>
          <button
            onClick={clearAll}
            disabled={uploadState.globalStatus === 'uploading'}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {uploadState.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={getStatusColor(item.status)}>
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.file && (
                    <p className="text-sm text-gray-500">
                      {TusUploadService.formatBytes(item.file.size)}
                    </p>
                  )}
                  {item.url && (
                    <p className="text-sm text-gray-500 truncate">{item.url}</p>
                  )}
                  {item.error && (
                    <p className="text-sm text-red-600">{item.error}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {item.progress && (
                  <div className="w-32">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{item.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => removeItem(item.id)}
                  disabled={item.status === 'uploading'}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUploadArea = () => {
    return (
      <div className="space-y-6">
        {renderTabNavigation()}
        
        {activeTab === 'local' ? renderLocalUpload() : renderRemoteUpload()}

        {renderUploadQueue()}

        {uploadState.globalStatus === 'completed' && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">All uploads completed!</span>
          </div>
        )}
      </div>
    );
  };

  const idleItems = uploadState.items.filter(item => item.status === 'idle');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Video Upload</h3>
      
      {renderUploadArea()}
      
      {idleItems.length > 0 && uploadState.globalStatus !== 'uploading' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={startBulkUpload}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Upload ({idleItems.length} items)
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;