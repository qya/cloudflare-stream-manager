import * as tus from 'tus-js-client';
import { TusUploadOptions, UploadProgress } from '../types';

export class TusUploadService {
  static async uploadFile(options: TusUploadOptions): Promise<string | null> {
    return new Promise((resolve, reject) => {
      console.log('TUS upload starting with Cloudflare-compliant config for file:', options.file.name);
      console.log('File size:', options.file.size, 'bytes (', (options.file.size / 1024 / 1024).toFixed(2), 'MB)');

      // Calculate proper chunk size according to Cloudflare requirements
      // Minimum 5,242,880 bytes, must be divisible by 256 KiB (262,144 bytes)
      const minChunkSize = 5242880; // 5MB minimum
      const chunkDivisor = 262144; // 256 KiB
      let chunkSize = options.chunkSize || 52428800; // Default to 50MB for better performance
      
      // Ensure chunk size meets Cloudflare requirements
      if (chunkSize < minChunkSize) {
        chunkSize = minChunkSize;
      }
      
      // Round to nearest multiple of 256 KiB
      chunkSize = Math.round(chunkSize / chunkDivisor) * chunkDivisor;
      
      console.log('Using chunk size:', chunkSize, 'bytes (', (chunkSize / 1024 / 1024).toFixed(1), 'MB)');

      // Prepare metadata according to Cloudflare format - exactly as in their docs
      const metadata: Record<string, string> = {
        name: options.file.name,
        filetype: options.file.type,
      };

      // Add watermark if specified
      if (options.metadata?.watermark) {
        metadata.watermark = options.metadata.watermark;
      }

      // Prepare headers - Authorization goes in headers, not metadata
      const headers: Record<string, string> = {};
      if (options.metadata?.authorization) {
        headers.Authorization = options.metadata.authorization;
      }

      console.log('TUS metadata:', metadata);
      console.log('TUS headers:', { ...headers, Authorization: headers.Authorization ? '[HIDDEN]' : 'none' });

      let videoId: string | null = null;
      let uploadUrl: string | null = null;

      const upload = new tus.Upload(options.file, {
        endpoint: options.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000], // As per Cloudflare docs
        chunkSize: chunkSize,
        metadata: metadata,
        headers: headers,
        uploadSize: options.file.size,
        storeFingerprintForResuming: false, // Important: disable for Cloudflare
        removeFingerprintOnSuccess: true,
        onError: (error) => {
          console.error('TUS upload failed with detailed error:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...(error as any).originalRequest && {
              request: {
                method: (error as any).originalRequest?.getMethod?.(),
                url: (error as any).originalRequest?.getURL?.(),
                headers: (error as any).originalRequest?.getHeader?.('Upload-Metadata'),
              }
            },
            ...(error as any).originalResponse && {
              response: {
                status: (error as any).originalResponse?.getStatus?.(),
                body: (error as any).originalResponse?.getBody?.(),
                headers: (error as any).originalResponse?.getHeader?.('content-type'),
              }
            }
          });
          options.onError?.(error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const progress: UploadProgress = {
            bytesUploaded,
            bytesTotal,
            percentage: Math.round((bytesUploaded / bytesTotal) * 100),
          };
          
          console.log(`Upload progress: ${progress.percentage}% (${this.formatBytes(bytesUploaded)}/${this.formatBytes(bytesTotal)}) - Chunks: ${Math.ceil(bytesUploaded / chunkSize)}/${Math.ceil(bytesTotal / chunkSize)}`);
          options.onProgress?.(progress);
        },
        onSuccess: () => {
          console.log('TUS upload completed successfully!');
          console.log('Final video ID:', videoId);
          console.log('Final upload URL:', uploadUrl);
          
          // Wait a moment to ensure Cloudflare processes the completion
          setTimeout(() => {
            options.onSuccess?.(upload);
            resolve(videoId);
          }, 1000);
        },
        onBeforeRequest: (req) => {
          const method = req.getMethod();
          const url = req.getURL();
          console.log(`TUS ${method} request to:`, url);
          
          if (method === 'POST') {
            console.log('Creating upload - POST request');
          } else if (method === 'PATCH') {
            console.log('Uploading chunk - PATCH request');
          }
        },
        onAfterResponse: (req, res) => {
          const method = req.getMethod();
          const status = res.getStatus();
          const url = req.getURL();
          
          console.log(`TUS ${method} response: ${status} from ${url}`);
          
          // Log important headers
          const mediaId = res.getHeader('stream-media-id');
          const location = res.getHeader('Location');
          const uploadOffset = res.getHeader('Upload-Offset');
          const uploadLength = res.getHeader('Upload-Length');
          
          if (mediaId) {
            console.log('Stream Media ID from response:', mediaId);
            videoId = mediaId;
          }
          
          if (location) {
            console.log('Location header:', location);
            uploadUrl = location;
            
            // Extract video ID from location if not already set
            if (!videoId && location) {
              const match = location.match(/\/([a-f0-9]{32})$/);
              if (match) {
                videoId = match[1];
                console.log('Extracted video ID from location:', videoId);
              }
            }
          }
          
          if (uploadOffset !== null) {
            console.log('Upload offset:', uploadOffset);
          }
          
          if (uploadLength !== null) {
            console.log('Upload length:', uploadLength);
          }
          
          // Check if upload is complete
          if (uploadOffset && uploadLength && uploadOffset === uploadLength) {
            console.log('Upload appears to be complete (offset === length)');
          }
        },
      });

      console.log('Starting TUS upload with endpoint:', options.endpoint);
      upload.start();
    });
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}