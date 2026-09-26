import { Child, UserRole } from '@guardian/shared-types';
import { HashService } from '../auth/hashService';
import { AppError } from '../middleware/errorHandler';
import { verifyUserRole, verifyFamilyOwnership, RequestUserContext } from '../middleware/authMiddleware';
import { AuditService } from './auditService';
import { DeviceService } from './deviceService';

export class ChildService {
  private static children: Map<string, Child> = new Map();

  public static createChild(
    context: RequestUserContext,
    payload: { familyId: string; name: string; age?: number; avatarUrl?: string },
  ): Child {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, payload.familyId);

    const childId = `child-${HashService.generateRandomToken(8)}`;
    const now = new Date().toISOString();

    const child: Child = {
      id: childId,
      familyId: payload.familyId,
      name: payload.name,
      age: payload.age,
      avatarUrl: payload.avatarUrl,
      createdAt: now,
      updatedAt: now,
    };

    this.children.set(childId, child);

    AuditService.logEvent('CHILD_CREATED', 'CHILD', {
      familyId: payload.familyId,
      actorId: context.userId,
      entityId: childId,
      details: { childName: payload.name, age: payload.age },
    });

    return child;
  }

  public static getChildren(context: RequestUserContext, familyId: string): Child[] {
    verifyFamilyOwnership(context, familyId);
    const result: Child[] = [];
    for (const child of this.children.values()) {
      if (child.familyId === familyId) {
        result.push(child);
      }
    }
    return result;
  }

  public static getChild(context: RequestUserContext, childId: string): Child {
    const child = this.children.get(childId);
    if (!child) {
      throw new AppError(404, 'CHILD_NOT_FOUND', 'Requested child profile does not exist.');
    }
    verifyFamilyOwnership(context, child.familyId);
    return child;
  }

  public static updateChild(
    context: RequestUserContext,
    childId: string,
    payload: { name?: string; age?: number; avatarUrl?: string },
  ): Child {
    verifyUserRole(context, [UserRole.PARENT]);
    const child = this.getChild(context, childId); // includes ownership check

    if (payload.name !== undefined) child.name = payload.name;
    if (payload.age !== undefined) child.age = payload.age;
    if (payload.avatarUrl !== undefined) child.avatarUrl = payload.avatarUrl;
    child.updatedAt = new Date().toISOString();

    AuditService.logEvent('CHILD_UPDATED', 'CHILD', {
      familyId: child.familyId,
      actorId: context.userId,
      entityId: childId,
      details: { updatedFields: payload },
    });

    return child;
  }

  public static deleteChild(context: RequestUserContext, childId: string): void {
    verifyUserRole(context, [UserRole.PARENT]);
    const child = this.getChild(context, childId); // includes ownership check

    // Delete associated child devices
    DeviceService.deleteChildDevices(child.id);

    this.children.delete(childId);

    AuditService.logEvent('CHILD_DELETED', 'CHILD', {
      familyId: child.familyId,
      actorId: context.userId,
      entityId: childId,
      details: { childName: child.name },
    });
  }

  public static clearForTest(): void {
    this.children.clear();
  }
}
