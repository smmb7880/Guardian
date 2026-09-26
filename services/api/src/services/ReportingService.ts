import { ScreenTimeReport, UserRole } from '@guardian/shared-types';
import { RequestUserContext, verifyUserRole, verifyFamilyOwnership } from '../middleware/authMiddleware';
import { ChildService } from './childService';
import { PolicyService } from './policyService';
import { DeviceService } from './deviceService';

export class ReportingService {
  /**
   * Generate privacy-preserving screen time report for a child.
   */
  public static generateReport(
    context: RequestUserContext,
    childId: string,
    period: 'daily' | 'weekly' = 'daily',
  ): ScreenTimeReport {
    verifyUserRole(context, [UserRole.PARENT]);

    const child = ChildService.getChild(context, childId);
    verifyFamilyOwnership(context, child.familyId);

    const devices = DeviceService.getChildDevices(context, childId);
    const primaryDevice = devices.length > 0 ? devices[0] : null;

    // Simulated usage data based on period
    const totalMinutes = period === 'daily' ? 110 : 750;
    const previousPeriodMinutes = period === 'daily' ? 125 : 820;

    let trendPercentage = 0;
    if (previousPeriodMinutes > 0) {
      trendPercentage = parseFloat(
        (((totalMinutes - previousPeriodMinutes) / previousPeriodMinutes) * 100).toFixed(1),
      );
    }

    const categoryBreakdown: Record<string, number> = {
      EDUCATION: period === 'daily' ? 45 : 300,
      ENTERTAINMENT: period === 'daily' ? 30 : 200,
      GAMES: period === 'daily' ? 25 : 150,
      SOCIAL: period === 'daily' ? 10 : 100,
    };

    const dailyUsage = period === 'daily'
      ? [{ date: new Date().toISOString().split('T')[0], minutes: totalMinutes }]
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { date: d.toISOString().split('T')[0], minutes: 100 + (i * 5) };
        });

    return {
      childId,
      period,
      totalMinutes,
      previousPeriodMinutes,
      trendPercentage,
      categoryBreakdown,
      dailyUsage,
      policyViolations: [
        { type: 'DAILY_LIMIT_EXCEEDED', count: 1, lastTimestamp: new Date().toISOString() },
        { type: 'BLOCKED_APP_ATTEMPT', count: 2, lastTimestamp: new Date().toISOString() },
      ],
      deviceStatus: {
        isOnline: primaryDevice ? primaryDevice.isPaired : false,
        lastSyncAt: primaryDevice ? primaryDevice.lastSyncAt : null,
        platform: primaryDevice ? primaryDevice.platform : 'android',
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
