export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

export interface Video {
  uid: string;
  filename: string;
  size: number;
  duration?: number;
  status: 'pendingupload' | 'downloading' | 'queued' | 'inprogress' | 'ready' | 'error' | any;
  thumbnail?: string;
  preview?: string;
  created: string;
  modified: string;
  meta?: {
    name?: string;
    downloadedFrom?: {
      url: string;
      retrievedSource: string;
    };
  };
  playback?: {
    hls: string;
    dash: string;
  };
  input?: {
    width: number;
    height: number;
  };
  readyToStream: boolean;
  readyToStreamAt?: string;
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry?: string;
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
  allowedOrigins?: string[];
  creator?: string;
  watermark?: {
    uid: string;
  };
}

export interface Watermark {
  uid: string;
  size: number;
  height: number;
  width: number;
  created: string;
  downloadedFrom?: string;
  filename: string;
  meta?: {
    name?: string;
  };
  name?: string;
  opacity?: number;
  padding?: number;
  position?: string;
  scale?: number;
}

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
}

export interface TusUploadOptions {
  endpoint: string;
  file: File;
  chunkSize?: number;
  retryDelays?: number[];
  metadata?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (upload: any) => void;
  onError?: (error: Error) => void;
}

export interface UsageStats {
  totalVideos: number;
  readyVideos: number;
  watermarks: number;
  storageUsed: string;
}