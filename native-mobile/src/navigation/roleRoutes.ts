import { UserRole } from '../types/domain';

export const roleHomeRouteName = {
  ADMIN: 'AdminToday',
  EDUCATOR: 'EducatorHome',
  PARENT: 'ParentHome',
} as const;

export function getRoleHomeRouteName(role: UserRole) {
  return roleHomeRouteName[role];
}
