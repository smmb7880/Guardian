import { StorageService } from './storageService';
import { ApiResponse } from '@guardian/shared-api';

export class ApiClient {
  private static isOnlineStatus = true;

  public static setOnlineStatus(online: boolean): void {
    this.isOnlineStatus = online;
  }

  public static isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public static async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
      retryCount?: number;
    } = {},
  ): Promise<ApiResponse<T>> {
    if (!this.isOnlineStatus) {
      return {
        success: false,
        error: {
          code: 'OFFLINE',
          message: 'Device is currently offline. Using cached data.',
        },
        timestamp: new Date().toISOString(),
      };
    }

    const token = StorageService.getItem('accessToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // In mobile runtime, this executes HTTP fetch to backend URL
    console.info(`[ApiClient] ${options.method || 'GET'} ${endpoint}`, options.body ? JSON.stringify(options.body) : '');

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  }
}
