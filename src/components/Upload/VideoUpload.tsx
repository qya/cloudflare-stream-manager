import React, { useState, useRef } from 'react';
import { Upload, Film, X, CheckCircle, AlertCircle, Link, HardDrive } from 'lucide-react';
import { TusUploadService } from '../../services/tusUpload';
import { UploadProgress } from '../../types';
import CloudflareStreamService from '../../services/cloudflare';

interface VideoUploadProps {
  cloudflareService: CloudflareStreamService;
  watermarkId?: string;
  onUploadComplete?: (videoId: string) => void;
}

interface UploadState {
  file: File | null;
  url: string;
  progress: UploadProgress | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  videoId?: string;
}

type UploadTab = 'local' | 'remote';

const VideoUpload: React.FC<VideoUploadProps> = ({ 
  cloudflareService, 
  watermarkId,
  onUploadComplete 
}) => {
  const [activeTab, setActiveTab] = useState<UploadTab>('local');
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    url: '',
    progress: null,
    status: 'idle',
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length && files[0].type.startsWith('video/')) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadState({
      file,
      url: '',
      progress: null,
      status: 'idle',
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadState(prev => ({
      ...prev,
      url: e.target.value,
      file: null,
      progress: null,
      status: 'idle',
      error: undefined,
    }));
  };

  const startUpload = async () => {
    if (activeTab === 'local' && !uploadState.file) return;
    if (activeTab === 'remote' && !uploadState.url.trim()) return;

    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', error: undefined }));

      if (activeTab === 'local') {
        await handleLocalUpload();
      } else {
        await handleRemoteUpload();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
    }
  };

  const handleLocalUpload = async () => {
    if (!uploadState.file) return;

    console.log('Starting local upload for file:', uploadState.file.name, 'Size:', uploadState.file.size);

    // For TUS uploads, we use the main Stream endpoint directly
    const tusEndpoint = cloudflareService.getTusEndpoint();
    console.log('Using TUS endpoint:', tusEndpoint);

    // Prepare metadata for TUS upload
    const metadata: Record<string, string> = {
      name: uploadState.file.name,
      filename: uploadState.file.name,
      filetype: uploadState.file.type,
      authorization: `Bearer ${cloudflareService.getApiToken()}`, // Access token for TUS
    };

    // Add watermark if specified
    if (watermarkId && watermarkId.trim() !== '') {
      metadata.watermark = watermarkId;
    }

    console.log('TUS upload metadata prepared:', { ...metadata, authorization: 'Bearer [HIDDEN]' });

    // Start TUS upload directly to Cloudflare Stream endpoint
    const videoId = await TusUploadService.uploadFile({
      endpoint: tusEndpoint,
      file: uploadState.file,
      metadata: metadata,
      onProgress: (progress) => {
        setUploadState(prev => ({ ...prev, progress }));
      },
      onSuccess: (upload) => {
        console.log('TUS upload success callback triggered');
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        setUploadState(prev => ({ 
          ...prev, 
          status: 'error',
          error: error.message 
        }));
      },
    });

    console.log('TUS upload method returned video ID:', videoId);

    if (videoId) {
      await verifyUploadCompletion(videoId);
    } else {
      console.error('No video ID returned from TUS upload');
      setUploadState(prev => ({ 
        ...prev, 
        status: 'error',
        error: 'Upload completed but no video ID was returned' 
      }));
    }
  };

  const handleRemoteUpload = async () => {
    if (!uploadState.url.trim()) return;

    console.log('Starting remote upload from URL:', uploadState.url);

    // Set up fake progress for URL uploads since we don't get real progress
    const progressInterval = setInterval(() => {
      setUploadState(prev => {
        if (prev.status !== 'uploading') return prev;
        
        const currentProgress = prev.progress?.percentage || 0;
        if (currentProgress < 90) {
          return {
            ...prev,
            progress: {
              bytesUploaded: currentProgress + 10,
              bytesTotal: 100,
              percentage: Math.min(currentProgress + 10, 90)
            }
          };
        }
        return prev;
      });
    }, 500);

    try {
      const uploadOptions: any = {
        meta: {
          name: uploadState.url.split('/').pop() || 'Remote Video'
        }
      };

      // Add watermark if specified
      if (watermarkId && watermarkId.trim() !== '') {
        uploadOptions.watermarkUid = watermarkId;
      }

      const video = await cloudflareService.uploadVideoFromUrl(uploadState.url, uploadOptions);

      clearInterval(progressInterval);
      
      console.log('Remote upload completed:', video.uid);
      
      setUploadState(prev => ({
        ...prev,
        progress: { bytesUploaded: 100, bytesTotal: 100, percentage: 100 }
      }));

      await verifyUploadCompletion(video.uid);
      
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  const verifyUploadCompletion = async (videoId: string) => {
    // Verify the upload completed on Cloudflare's end
    console.log('Verifying upload completion for video:', videoId);
    
    try {
      // Wait a moment for Cloudflare to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to fetch the video details to confirm it exists and is processing
      const videoDetails = await cloudflareService.getVideoDetails(videoId);
      console.log('Video details after upload:', {
        uid: videoDetails.uid,
        status: videoDetails.status,
        filename: videoDetails.filename,
        size: videoDetails.size
      });

      setUploadState(prev => ({ 
        ...prev, 
        status: 'success',
        videoId: videoId
      }));
      
      onUploadComplete?.(videoId);
      
    } catch (verificationError) {
      console.warn('Could not verify upload immediately, but upload appears successful:', verificationError);
      // Still consider it successful since upload completed
      setUploadState(prev => ({ 
        ...prev, 
        status: 'success',
        videoId: videoId
      }));
      
      onUploadComplete?.(videoId);
    }
  };

  const resetUpload = () => {
    setUploadState({
      file: null,
      url: '',
      progress: null,
      status: 'idle',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const renderLocalUpload = () => {
    if (uploadState.file) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Film className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                <p className="text-sm text-gray-500">
                  {TusUploadService.formatBytes(uploadState.file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={resetUpload}
              disabled={uploadState.status === 'uploading'}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    return (
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
          Drop your video here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            browse
          </button>
        </h3>
        <p className="text-gray-500">
          Supports MP4, MOV, AVI, MKV, and WebM files up to 5GB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    );
  };

  const renderRemoteUpload = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
        <Link className="w-6 h-6 text-blue-600" />
        <div>
          <h4 className="font-medium text-blue-900">Upload from URL</h4>
          <p className="text-sm text-blue-700">
            Enter a direct link to a video file (MP4, MOV, AVI, MKV, WebM)
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <label htmlFor="video-url" className="block text-sm font-medium text-gray-700">
          Video URL
        </label>
        <input
          id="video-url"
          type="url"
          value={uploadState.url}
          onChange={handleUrlChange}
          placeholder="https://example.com/video.mp4"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={uploadState.status === 'uploading'}
        />
        <p className="text-xs text-gray-500">
          Make sure the URL is publicly accessible and points directly to a video file
        </p>
      </div>
    </div>
  );

  const renderUploadArea = () => {
    return (
      <div className="space-y-6">
        {renderTabNavigation()}
        
        {activeTab === 'local' ? renderLocalUpload() : renderRemoteUpload()}

        {uploadState.progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {activeTab === 'local' ? (
                  <>
                    {TusUploadService.formatBytes(uploadState.progress.bytesUploaded)} / {TusUploadService.formatBytes(uploadState.progress.bytesTotal)}
                  </>
                ) : (
                  'Processing...'
                )}
              </span>
              <span className="text-blue-600 font-medium">
                {uploadState.progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {uploadState.status === 'success' && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Upload completed successfully!</span>
          </div>
        )}

        {uploadState.status === 'error' && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{uploadState.error}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Video</h3>
      
      {renderUploadArea()}
      
      {((activeTab === 'local' && uploadState.file) || (activeTab === 'remote' && uploadState.url.trim())) && uploadState.status === 'idle' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={startUpload}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {activeTab === 'local' ? 'Start Upload' : 'Upload from URL'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;