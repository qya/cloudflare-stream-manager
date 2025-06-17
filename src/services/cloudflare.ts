import axios from 'axios';
import { CloudflareConfig, Video, Watermark, UsageStats } from '../types';

class CloudflareStreamService {
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    this.config = config;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/stream`;
  }

  async getVideos(): Promise<Video[]> {
    try {
      const response = await axios.get(`${this.getBaseUrl()}`, {
        headers: this.getHeaders(),
      });
      return response.data.result || [];
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    try {
      await axios.delete(`${this.getBaseUrl()}/${videoId}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  async getWatermarks(): Promise<Watermark[]> {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/watermarks`, {
        headers: this.getHeaders(),
      });
      return response.data.result || [];
    } catch (error) {
      console.error('Error fetching watermarks:', error);
      throw error;
    }
  }

  async uploadWatermark(file: File, name?: string): Promise<Watermark> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (name) {
        formData.append('name', name);
      }

      const response = await axios.post(`${this.getBaseUrl()}/watermarks`, formData, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.result;
    } catch (error) {
      console.error('Error uploading watermark:', error);
      throw error;
    }
  }

  async uploadWatermarkFromUrl(url: string, options: {
    name?: string;
    opacity?: number;
    padding?: number;
    scale?: number;
    position?: string;
  } = {}): Promise<Watermark> {
    try {
      const requestBody: any = {
        url: url,
        ...options
      };

      console.log('Uploading watermark from URL:', url);
      console.log('Watermark options:', { ...requestBody, url: url.substring(0, 50) + '...' });

      const response = await axios.post(`${this.getBaseUrl()}/watermarks`, requestBody, {
        headers: this.getHeaders(),
      });

      console.log('Watermark URL upload response:', {
        success: response.data.success,
        watermarkUid: response.data.result?.uid,
        name: response.data.result?.name
      });

      return response.data.result;
    } catch (error) {
      console.error('Error uploading watermark from URL:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async deleteWatermark(watermarkId: string): Promise<void> {
    try {
      await axios.delete(`${this.getBaseUrl()}/watermarks/${watermarkId}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Error deleting watermark:', error);
      throw error;
    }
  }

  async createUploadUrl(options: {
    maxDurationSeconds?: number;
    creator?: string;
    requireSignedURLs?: boolean;
    allowedOrigins?: string[];
    thumbnailTimestampPct?: number;
    watermarkUid?: string;
  } = {}): Promise<{ uploadURL: string; uid: string }> {
    try {
      // Clean up options to remove undefined/empty values
      const cleanOptions: any = {};
      
      if (options.maxDurationSeconds) {
        cleanOptions.maxDurationSeconds = options.maxDurationSeconds;
      }
      
      if (options.creator) {
        cleanOptions.creator = options.creator;
      }
      
      if (options.requireSignedURLs !== undefined) {
        cleanOptions.requireSignedURLs = options.requireSignedURLs;
      }
      
      if (options.allowedOrigins && options.allowedOrigins.length > 0) {
        cleanOptions.allowedOrigins = options.allowedOrigins;
      }
      
      if (options.thumbnailTimestampPct !== undefined) {
        cleanOptions.thumbnailTimestampPct = options.thumbnailTimestampPct;
      }
      
      if (options.watermarkUid && options.watermarkUid.trim() !== '') {
        cleanOptions.watermark = { uid: options.watermarkUid };
      }

      console.log('Creating upload URL with cleaned options:', cleanOptions);

      const response = await axios.post(`${this.getBaseUrl()}/direct_upload`, cleanOptions, {
        headers: this.getHeaders(),
      });

      console.log('Upload URL response:', {
        success: response.data.success,
        resultKeys: Object.keys(response.data.result || {}),
      });

      return response.data.result;
    } catch (error) {
      console.error('Error creating upload URL:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async getVideoDetails(videoId: string): Promise<Video> {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/${videoId}`, {
        headers: this.getHeaders(),
      });
      return response.data.result;
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  async updateVideo(videoId: string, updates: {
    meta?: { name?: string };
    requireSignedURLs?: boolean;
    allowedOrigins?: string[];
    thumbnailTimestampPct?: number;
    watermarkUid?: string;
  }): Promise<Video> {
    try {
      const response = await axios.post(`${this.getBaseUrl()}/${videoId}`, updates, {
        headers: this.getHeaders(),
      });
      return response.data.result;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  async getUsageStats(): Promise<UsageStats> {
    try {
      // Fetch videos and watermarks in parallel
      const [videos, watermarks] = await Promise.all([
        this.getVideos(),
        this.getWatermarks()
      ]);

      // Calculate total videos
      const totalVideos = videos.length;

      // Calculate ready videos (status === 'ready' or readyToStream === true)
      const readyVideos = videos.filter(video => 
        video.status === 'ready' || video.readyToStream
      ).length;

      // Calculate total watermarks
      const totalWatermarks = watermarks.length;

      // Calculate storage used (sum of all video sizes)
      const totalBytes = videos.reduce((sum, video) => sum + (video.size || 0), 0);
      const storageUsed = this.formatBytes(totalBytes);

      return {
        totalVideos,
        readyVideos,
        watermarks: totalWatermarks,
        storageUsed
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getTusEndpoint(): string {
    // For TUS uploads, use the main Stream API endpoint
    return `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/stream`;
  }

  getApiToken(): string {
    return this.config.apiToken;
  }

  async uploadVideoFromUrl(url: string, options: {
    meta?: { name?: string };
    requireSignedURLs?: boolean;
    allowedOrigins?: string[];
    thumbnailTimestampPct?: number;
    watermarkUid?: string;
    creator?: string;
  } = {}): Promise<Video> {
    try {
      const requestBody: any = {
        url: url,
        ...options
      };

      // Clean up watermark option
      if (options.watermarkUid && options.watermarkUid.trim() !== '') {
        requestBody.watermark = { uid: options.watermarkUid };
        delete requestBody.watermarkUid;
      }

      console.log('Uploading video from URL:', url);
      console.log('Video options:', { ...requestBody, url: url.substring(0, 50) + '...' });

      const response = await axios.post(`${this.getBaseUrl()}/copy`, requestBody, {
        headers: this.getHeaders(),
      });

      console.log('Video URL upload response:', {
        success: response.data.success,
        videoUid: response.data.result?.uid,
        status: response.data.result?.status
      });

      return response.data.result;
    } catch (error) {
      console.error('Error uploading video from URL:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async enableVideoDownload(videoId: string): Promise<{
    status: 'inprogress' | 'ready' | 'error';
    url: string;
    percentComplete: number;
  }> {
    try {
      console.log('Enabling download for video:', videoId);
      
      const response = await axios.post(`${this.getBaseUrl()}/${videoId}/downloads`, {}, {
        headers: this.getHeaders(),
      });

      console.log('Enable download response:', {
        success: response.data.success,
        status: response.data.result?.default?.status,
        percentComplete: response.data.result?.default?.percentComplete
      });

      return response.data.result.default;
    } catch (error) {
      console.error('Error enabling video download:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async getVideoDownloadStatus(videoId: string): Promise<{
    status: 'inprogress' | 'ready' | 'error';
    url: string;
    percentComplete: number;
  } | null> {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/${videoId}/downloads`, {
        headers: this.getHeaders(),
      });

      if (response.data.result?.default) {
        return response.data.result.default;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting video download status:', error);
      if (axios.isAxiosError(error) && error.response) {
        // If downloads endpoint returns 404, it means downloads haven't been enabled yet
        if (error.response.status === 404) {
          return null;
        }
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  async downloadVideo(videoId: string, filename?: string): Promise<void> {
    try {
      // First check if download is already enabled
      let downloadInfo = await this.getVideoDownloadStatus(videoId);
      
      // If not enabled, enable it
      if (!downloadInfo) {
        console.log('Download not enabled, enabling for video:', videoId);
        downloadInfo = await this.enableVideoDownload(videoId);
      }

      // If still processing, wait for it to be ready
      if (downloadInfo.status === 'inprogress') {
        console.log('Download processing, current progress:', downloadInfo.percentComplete + '%');
        throw new Error(`Download is still processing (${downloadInfo.percentComplete}% complete). Please try again in a few moments.`);
      }

      if (downloadInfo.status === 'error') {
        throw new Error('Download failed to process. Please try again later.');
      }

      if (downloadInfo.status === 'ready') {
        let downloadUrl = downloadInfo.url;
        
        // Add custom filename if provided
        if (filename) {
          // Clean filename to only allow safe characters
          const cleanFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 120);
          downloadUrl += `?filename=${cleanFilename}`;
        }

        console.log('Starting download from URL:', downloadUrl);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'video.mp4';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      throw error;
    }
  }
}

export default CloudflareStreamService;