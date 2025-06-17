import React, { useState, useEffect } from 'react';
import { Play, Download, Trash2, Eye, Clock, CheckCircle, AlertCircle, ExternalLink, X, Calendar, FileText, Monitor, Zap } from 'lucide-react';
import { Video } from '../../types';
import { TusUploadService } from '../../services/tusUpload';
import CloudflareStreamService from '../../services/cloudflare';

interface VideoListProps {
  cloudflareService: CloudflareStreamService;
  refreshTrigger?: number;
}

const VideoList: React.FC<VideoListProps> = ({ cloudflareService, refreshTrigger }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [downloadVideo, setDownloadVideo] = useState<Video | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    status: 'enabling' | 'inprogress' | 'ready' | 'error';
    percentComplete: number;
    message: string;
    downloadUrl?: string;
  }>({ status: 'enabling', percentComplete: 0, message: 'Preparing download...' });

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedVideos = await cloudflareService.getVideos();
      
      setVideos(fetchedVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [refreshTrigger]);

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
      await cloudflareService.deleteVideo(videoId);
      setVideos(prev => prev.filter(video => video.uid !== videoId));
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  const handlePreviewVideo = (video: Video) => {
    setPreviewVideo(video);
    setIsVideoLoading(true);
  };

  const handleVideoLoad = () => {
    setIsVideoLoading(false);
  };

  const handleVideoError = () => {
    setIsVideoLoading(false);
  };

  const handleDownloadVideo = async (video: Video) => {
    setDownloadVideo(video);
    setDownloadProgress({
      status: 'enabling',
      percentComplete: 0,
      message: 'Preparing download...'
    });

    try {
      // Generate a clean filename from video name or filename
      const videoName = video.meta?.name || video.filename || 'video';
      const cleanFilename = videoName.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');
      
      console.log('Starting download for video:', video.uid);

      // First check if download is already enabled
      let downloadInfo = await cloudflareService.getVideoDownloadStatus(video.uid);
      
      // If not enabled, enable it
      if (!downloadInfo) {
        setDownloadProgress({
          status: 'enabling',
          percentComplete: 0,
          message: 'Enabling download for this video...'
        });
        downloadInfo = await cloudflareService.enableVideoDownload(video.uid);
      }

      // If still processing, show progress and poll for updates
      if (downloadInfo.status === 'inprogress') {
        setDownloadProgress({
          status: 'inprogress',
          percentComplete: downloadInfo.percentComplete,
          message: `Processing video for download... ${downloadInfo.percentComplete}%`
        });

        // Poll for progress updates
        const pollInterval = setInterval(async () => {
          try {
            const updatedInfo = await cloudflareService.getVideoDownloadStatus(video.uid);
            if (updatedInfo) {
              if (updatedInfo.status === 'ready') {
                clearInterval(pollInterval);
                const downloadUrl = updatedInfo.url + (cleanFilename ? `?filename=${cleanFilename}` : '');
                setDownloadProgress({
                  status: 'ready',
                  percentComplete: 100,
                  message: 'Download ready! Click the button below to download.',
                  downloadUrl: downloadUrl
                });
              } else if (updatedInfo.status === 'error') {
                clearInterval(pollInterval);
                setDownloadProgress({
                  status: 'error',
                  percentComplete: 0,
                  message: 'Download processing failed. Please try again.'
                });
              } else {
                setDownloadProgress({
                  status: 'inprogress',
                  percentComplete: updatedInfo.percentComplete,
                  message: `Processing video for download... ${updatedInfo.percentComplete}%`
                });
              }
            }
          } catch (error) {
            clearInterval(pollInterval);
            setDownloadProgress({
              status: 'error',
              percentComplete: 0,
              message: 'Failed to check download progress.'
            });
          }
        }, 2000); // Poll every 2 seconds

      } else if (downloadInfo.status === 'ready') {
        const downloadUrl = downloadInfo.url + (cleanFilename ? `?filename=${cleanFilename}` : '');
        setDownloadProgress({
          status: 'ready',
          percentComplete: 100,
          message: 'Download ready! Click the button below to download.',
          downloadUrl: downloadUrl
        });
      } else if (downloadInfo.status === 'error') {
        setDownloadProgress({
          status: 'error',
          percentComplete: 0,
          message: 'Download processing failed. Please try again.'
        });
      }

    } catch (error) {
      console.error('Download failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      setDownloadProgress({
        status: 'error',
        percentComplete: 0,
        message: errorMessage
      });
    }
  };

  const handleOpenInBrowser = (video: Video) => {
    const url = video.preview;
    if (url) {
      // Check if we're in an Electron environment
      if (window.electron?.shell?.openExternal) {
        // Alternative Electron API structure
        window.electron.shell.openExternal(url);
      } else {
        // Fallback for web browsers: copy URL and show instructions
        navigator.clipboard.writeText(url).then(() => {
          alert(`URL copied to clipboard!\n\nTo open in your default browser:\n1. Open your default browser\n2. Paste the URL (Ctrl+V or Cmd+V)\n\nURL: ${url}`);
        }).catch(() => {
          // If clipboard fails, show the URL directly
          const userChoice = confirm(`Cannot open in default browser directly.\n\nURL: ${url}\n\nClick OK to copy this URL, then paste it in your default browser.`);
          if (userChoice) {
            // Try to select the URL text for manual copying
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: any) => {
    // Handle case where status might be an object
    const statusString = typeof status === 'string' ? status : status?.state || 'unknown';
    
    switch (statusString) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inprogress':
      case 'queued':
      case 'downloading':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: any) => {
    // Handle case where status might be an object
    const statusString = typeof status === 'string' ? status : status?.state || 'unknown';
    
    switch (statusString) {
      case 'ready':
        return 'Ready';
      case 'inprogress':
        return 'Processing';
      case 'queued':
        return 'Queued';
      case 'downloading':
        return 'Downloading';
      case 'error':
        return 'Error';
      case 'pendingupload':
        return 'Pending Upload';
      default:
        return typeof status === 'string' ? status : statusString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchVideos}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos uploaded</h3>
          <p className="text-gray-500">Upload your first video to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Videos</h3>
          <p className="text-sm text-gray-500 mt-1">{videos.length} videos total</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {videos.map((video) => {
            // Safety check to ensure video is a valid object
            if (!video || typeof video !== 'object' || !video.uid) {
              console.warn('Invalid video object:', video);
              return null;
            }
            
            return (
            <div key={video.uid} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div 
                    className="relative w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer group hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => video.status.state === 'ready' && handlePreviewVideo(video)}
                  >
                    {video.thumbnail ? (
                      <>
                        <img
                          src={video.thumbnail}
                          alt={video.filename}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {video.status.state === 'ready' && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </>
                    ) : (
                      <Play className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {video.meta?.name || video.filename || 'Untitled Video'}
                    </h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(video.status)}
                        <span>{getStatusText(video.status)}</span>
                      </div>
                      {video.size && typeof video.size === 'number' && (
                        <span>{TusUploadService.formatBytes(video.size)}</span>
                      )}
                      {video.duration && typeof video.duration === 'number' && (
                        <span>{formatDuration(video.duration)}</span>
                      )}
                      {video.input && typeof video.input.width === 'number' && typeof video.input.height === 'number' && (
                        <span>{video.input.width}x{video.input.height}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {video.created ? new Date(video.created).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                
                                 <div className="flex items-center space-x-2 ml-4">
                   {video.status.state === 'ready' && (
                    <>
                      <button
                        onClick={() => handlePreviewVideo(video)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview Video"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDownloadVideo(video)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Download Video"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(video.uid)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy Video ID"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteVideo(video.uid)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Video Preview</h3>
                  <p className="text-sm text-gray-500">
                    {previewVideo.meta?.name || previewVideo.filename || 'Untitled Video'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row h-[calc(90vh-100px)]">
              {/* Video Preview */}
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
                {previewVideo.status.state === 'ready' && previewVideo.preview ? (
                  <div className="relative w-full h-full max-w-4xl max-h-full">
                    {isVideoLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                        <div className="text-gray-700 text-lg">Loading preview...</div>
                      </div>
                    )}
                    <iframe
                      src={previewVideo.preview}
                      className="w-full h-full rounded-lg border border-gray-300"
                      frameBorder="0"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                      onLoad={handleVideoLoad}
                      onError={handleVideoError}
                      title={`Preview: ${previewVideo.meta?.name || previewVideo.filename || 'Video'}`}
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-600">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Preview not available</p>
                    <p className="text-sm opacity-75">
                      Status: {getStatusText(previewVideo.status)}
                    </p>
                  </div>
                )}
              </div>

              {/* Video Details Sidebar */}
              <div className="w-full lg:w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Video Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Video ID:</span>
                        <span className="text-gray-900 font-mono text-xs break-all">
                          {previewVideo.uid}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(previewVideo.status)}
                          <span className="text-gray-900">{getStatusText(previewVideo.status)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">File Size:</span>
                        <span className="text-gray-900">
                          {TusUploadService.formatBytes(previewVideo.size)}
                        </span>
                      </div>
                      {previewVideo.duration && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span className="text-gray-900">{formatDuration(previewVideo.duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technical Details */}
                  {previewVideo.input && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <Monitor className="w-4 h-4 mr-2" />
                        Video Properties
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Resolution:</span>
                          <span className="text-gray-900">
                            {previewVideo.input.width}x{previewVideo.input.height}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Aspect Ratio:</span>
                          <span className="text-gray-900">
                            {(previewVideo.input.width / previewVideo.input.height).toFixed(2)}:1
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Streaming Info */}
                  {previewVideo.playback && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        Streaming URLs
                      </h4>
                      <div className="space-y-2 text-sm">
                        {previewVideo.playback.hls && (
                          <div>
                            <span className="text-gray-500 block mb-1">HLS:</span>
                            <span className="text-xs text-gray-900 break-all bg-white p-2 rounded border font-mono">
                              {previewVideo.playback.hls}
                            </span>
                          </div>
                        )}
                        {previewVideo.playback.dash && (
                          <div>
                            <span className="text-gray-500 block mb-1">DASH:</span>
                            <span className="text-xs text-gray-900 break-all bg-white p-2 rounded border font-mono">
                              {previewVideo.playback.dash}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Timestamps
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-900">{formatDate(previewVideo.created)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Modified:</span>
                        <span className="text-gray-900">{formatDate(previewVideo.modified)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Uploaded:</span>
                        <span className="text-gray-900">{formatDate(previewVideo.uploaded)}</span>
                      </div>
                      {previewVideo.readyToStreamAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ready At:</span>
                          <span className="text-gray-900">{formatDate(previewVideo.readyToStreamAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Properties */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ready to Stream:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          previewVideo.readyToStream 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {previewVideo.readyToStream ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Signed URLs:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          previewVideo.requireSignedURLs 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {previewVideo.requireSignedURLs ? 'Required' : 'Not Required'}
                        </span>
                      </div>
                      {previewVideo.watermark && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Watermark:</span>
                          <span className="text-gray-900 font-mono text-xs">
                            {previewVideo.watermark.uid}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                                         {previewVideo.status.state === 'ready' && previewVideo.playback && (
                      <>
                        <button
                          onClick={() => handleOpenInBrowser(previewVideo)}
                          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in Browser
                        </button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(previewVideo.playback?.hls || '');
                            alert('HLS URL copied to clipboard!');
                          }}
                          className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Copy HLS URL
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(previewVideo.uid);
                        alert('Video ID copied to clipboard!');
                      }}
                      className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Copy Video ID
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloadVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Download Video</h3>
                  <p className="text-sm text-gray-500">
                    {downloadVideo.meta?.name || downloadVideo.filename || 'Untitled Video'}
                  </p>
                </div>
              </div>
              {(downloadProgress.status === 'error' || downloadProgress.status === 'ready') && (
                <button
                  onClick={() => setDownloadVideo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">
                      {downloadProgress.percentComplete}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        downloadProgress.status === 'error' 
                          ? 'bg-red-500' 
                          : downloadProgress.status === 'ready'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${downloadProgress.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Status Message */}
                <div className="flex items-center space-x-3">
                  {downloadProgress.status === 'enabling' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {downloadProgress.status === 'inprogress' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {downloadProgress.status === 'ready' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {downloadProgress.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-sm ${
                    downloadProgress.status === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {downloadProgress.message}
                  </p>
                </div>

                {/* Video Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Video ID:</span>
                    <span className="text-gray-900 font-mono text-xs">
                      {downloadVideo.uid}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">File Size:</span>
                    <span className="text-gray-900">
                      {TusUploadService.formatBytes(downloadVideo.size)}
                    </span>
                  </div>
                  {downloadVideo.duration && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-gray-900">{formatDuration(downloadVideo.duration)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {downloadProgress.status === 'error' && (
                    <>
                      <button
                        onClick={() => handleDownloadVideo(downloadVideo)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setDownloadVideo(null)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {downloadProgress.status === 'ready' && downloadProgress.downloadUrl && (
                    <div className="space-y-3 flex-1">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Download URL:</label>
                        <textarea
                          value={downloadProgress.downloadUrl}
                          readOnly
                          className="w-full p-2 text-xs border border-gray-300 rounded-md bg-gray-50 font-mono resize-none"
                          rows={3}
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            const videoName = downloadVideo?.meta?.name || downloadVideo?.filename || 'video';
                            const cleanFilename = videoName.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');
                            
                            const link = document.createElement('a');
                            link.href = downloadProgress.downloadUrl!;
                            link.download = cleanFilename + '.mp4';
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Download MP4 File
                        </button>
                        <button
                          onClick={() => setDownloadVideo(null)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                  {(downloadProgress.status === 'enabling' || downloadProgress.status === 'inprogress') && (
                    <div className="flex-1 text-center text-sm text-gray-500">
                      Please wait while we prepare your download...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoList;