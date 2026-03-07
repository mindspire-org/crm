import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, hasCrmPermission, canAccessLeads } from '@/utils/roleAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  fallback?: string;
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  resource, 
  action, 
  fallback = '/login',
  requireAuth = true 
}: ProtectedRouteProps) {
  const location = useLocation();
  const user = getCurrentUser();

  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  // Check specific permission
  if (permission && !hasCrmPermission(permission)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to access this resource.
          </p>
        </div>
      </div>
    );
  }

  // Check resource-action permission
  if (resource && action && !hasCrmPermission(`${resource}.${action}`)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to {action} {resource}.
          </p>
        </div>
      </div>
    );
  }

  // Check leads access specifically
  if (resource === 'leads' && !canAccessLeads()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to access leads.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
