import { ReactNode } from 'react';
import { getCurrentUser, hasCrmPermission, canAccessLeads } from '@/utils/roleAccess';

interface RoleGuardProps {
  children: ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function RoleGuard({ 
  children, 
  permission, 
  resource, 
  action, 
  fallback = null,
  requireAuth = true 
}: RoleGuardProps) {
  const user = getCurrentUser();

  // Check authentication
  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  // Check specific permission
  if (permission && !hasCrmPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check resource-action permission
  if (resource && action && !hasCrmPermission(`${resource}.${action}`)) {
    return <>{fallback}</>;
  }

  // Check leads access specifically
  if (resource === 'leads' && !canAccessLeads()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
