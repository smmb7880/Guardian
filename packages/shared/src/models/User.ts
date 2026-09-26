export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  familyId?: string;
  createdAt: string;
  updatedAt: string;
}
