import { Family, UserRole } from '@guardian/shared-types';
import { FamilyMemberEntity } from '../db/schema';
import { HashService } from '../auth/hashService';
import { AppError } from '../middleware/errorHandler';
import { verifyUserRole, verifyFamilyOwnership, RequestUserContext } from '../middleware/authMiddleware';
import { AuditService } from './auditService';

export interface FamilyDetailResponse {
  family: Family;
  members: FamilyMemberEntity[];
}

export class FamilyService {
  private static families: Map<string, Family> = new Map();
  private static members: Map<string, FamilyMemberEntity[]> = new Map();

  public static createFamily(context: RequestUserContext, name: string): FamilyDetailResponse {
    verifyUserRole(context, [UserRole.PARENT]);

    const familyId = `family-${HashService.generateRandomToken(8)}`;
    const now = new Date().toISOString();

    const family: Family = {
      id: familyId,
      name,
      creatorId: context.userId,
      createdAt: now,
      updatedAt: now,
    };

    const creatorMember: FamilyMemberEntity = {
      id: `member-${HashService.generateRandomToken(8)}`,
      familyId,
      userId: context.userId,
      role: UserRole.PARENT,
      joinedAt: new Date(),
    };

    this.families.set(familyId, family);
    this.members.set(familyId, [creatorMember]);

    // Update context
    context.familyId = familyId;

    AuditService.logEvent('FAMILY_CREATED', 'FAMILY', {
      familyId,
      actorId: context.userId,
      entityId: familyId,
      details: { familyName: name },
    });

    return {
      family,
      members: [creatorMember],
    };
  }

  public static getFamily(context: RequestUserContext, familyId: string): FamilyDetailResponse {
    verifyFamilyOwnership(context, familyId);
    const family = this.families.get(familyId);
    if (!family) {
      throw new AppError(404, 'FAMILY_NOT_FOUND', 'Requested family does not exist.');
    }
    const memberList = this.members.get(familyId) || [];
    return { family, members: memberList };
  }

  public static updateFamily(context: RequestUserContext, familyId: string, name: string): Family {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    const family = this.families.get(familyId);
    if (!family) {
      throw new AppError(404, 'FAMILY_NOT_FOUND', 'Requested family does not exist.');
    }

    family.name = name;
    family.updatedAt = new Date().toISOString();

    AuditService.logEvent('FAMILY_UPDATED', 'FAMILY', {
      familyId,
      actorId: context.userId,
      entityId: familyId,
      details: { newName: name },
    });

    return family;
  }

  public static inviteParent(
    context: RequestUserContext,
    familyId: string,
    parentEmail: string,
    parentUserId: string,
  ): FamilyMemberEntity {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    const memberList = this.members.get(familyId) || [];
    const exists = memberList.some((m) => m.userId === parentUserId);
    if (exists) {
      throw new AppError(409, 'MEMBER_ALREADY_EXISTS', 'User is already a member of this family.');
    }

    const newMember: FamilyMemberEntity = {
      id: `member-${HashService.generateRandomToken(8)}`,
      familyId,
      userId: parentUserId,
      role: UserRole.PARENT,
      joinedAt: new Date(),
    };

    memberList.push(newMember);
    this.members.set(familyId, memberList);

    AuditService.logEvent('PARENT_INVITED', 'FAMILY_MEMBER', {
      familyId,
      actorId: context.userId,
      entityId: newMember.id,
      details: { invitedEmail: parentEmail, invitedUserId: parentUserId },
    });

    return newMember;
  }

  public static clearForTest(): void {
    this.families.clear();
    this.members.clear();
  }
}
