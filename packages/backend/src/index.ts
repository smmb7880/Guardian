import { UserRole } from '@guardian/shared';

console.info('Guardian Backend Service Initialized.');
console.info(`Supported User Roles: ${Object.values(UserRole).join(', ')}`);
