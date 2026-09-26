export interface ChildDeviceCredentials {
  deviceId: string;
  childId: string;
  familyId: string;
  accessToken: string;
  refreshToken: string;
  platformDeviceId: string;
}

export class ChildDeviceSession {
  private credentials: ChildDeviceCredentials | null = null;

  setCredentials(creds: ChildDeviceCredentials): void {
    this.credentials = creds;
  }

  getCredentials(): ChildDeviceCredentials | null {
    return this.credentials;
  }

  getAccessToken(): string | null {
    return this.credentials?.accessToken ?? null;
  }

  getDeviceId(): string | null {
    return this.credentials?.deviceId ?? null;
  }

  isRegistered(): boolean {
    return this.credentials !== null && !!this.credentials.deviceId;
  }

  clear(): void {
    this.credentials = null;
  }
}
