// Enhanced Role-based access control utility for CRM
export type UserRole =
  | 'admin'
  | 'marketing_manager'
  | 'marketer'
  | 'sales'
  | 'sales_manager'
  | 'finance'
  | 'finance manager'
  | 'finance_manager'
  | 'developer'
  | 'project_manager'
  | 'manager'
  | 'staff'
  | 'team_member'
  | 'client'
  | 'core'
  | 'main team member'
  | 'main_team_member';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  permissions?: string[];
  access?: {
    dataScope?: 'assigned' | 'team' | 'all';
    canView?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canSeePrices?: boolean;
    canSeeFinance?: boolean;
  };
}

function normalizeRole(input: any): UserRole {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return 'staff';
  if (raw === 'finance manager' || raw === 'finance_manager') return 'finance_manager';
  if (raw === 'main team member' || raw === 'main_team_member') return 'core';
  if (raw === 'marketing manager') return 'marketing_manager';
  if (raw === 'sales manager' || raw === 'sales_manager') return 'sales_manager';
  if (
    raw === 'project manager' ||
    raw === 'project_manager'
  ) {
    return 'project_manager';
  }
  return raw as UserRole;
}

export type ModuleKey =
  | 'crm'
  | 'hrm'
  | 'projects'
  | 'prospects'
  | 'sales'
  | 'reports'
  | 'accounting'
  | 'tickets'
  | 'events'
  | 'clients'
  | 'tasks'
  | 'messages'
  | 'announcements'
  | 'subscriptions'
  | 'calendar'
  | 'notes'
  | 'files'
  | 'profile'
  | 'settings'
  | 'user_management'
  | 'client_portal'
  | 'dashboard'
  | 'other';

export function getModuleFromPath(pathname: string): ModuleKey {
  if (pathname.startsWith('/crm')) return 'crm';
  if (pathname.startsWith('/hrm')) return 'hrm';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/prospects')) return 'prospects';
  if (pathname.startsWith('/sales') || pathname.startsWith('/invoices')) return 'sales';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/accounting')) return 'accounting';
  if (pathname.startsWith('/tickets')) return 'tickets';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/clients')) return 'clients';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/messages') || pathname.startsWith('/messaging') || pathname.startsWith('/email') || pathname.startsWith('/calls')) return 'messages';
  if (pathname.startsWith('/announcements')) return 'announcements';
  if (pathname.startsWith('/subscriptions')) return 'subscriptions';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/notes')) return 'notes';
  if (pathname.startsWith('/files')) return 'files';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/user-management')) return 'user_management';
  if (pathname.startsWith('/client')) return 'client_portal';
  if (pathname === '/') return 'dashboard';
  return 'other';
}

export function normalizePermissions(p?: any): Set<string> {
  const out = new Set<string>();
  if (Array.isArray(p)) {
    for (const x of p) {
      const s = String(x || '').trim();
      if (s) out.add(s);
    }
  }
  return out;
}

// Permission levels for different data types
export enum PermissionLevel {
  FULL_ACCESS = 'full',      // Can see everything including financial data
  LIMITED_ACCESS = 'limited', // Can see project details but no financial data
  NO_ACCESS = 'none'         // Cannot access
}

// Enhanced Role permissions mapping for CRM
export const ROLE_PERMISSIONS: Record<UserRole, PermissionLevel> = {
  admin: PermissionLevel.FULL_ACCESS,
  marketing_manager: PermissionLevel.LIMITED_ACCESS,
  finance: PermissionLevel.FULL_ACCESS,
  'finance manager': PermissionLevel.FULL_ACCESS,
  finance_manager: PermissionLevel.FULL_ACCESS,
  core: PermissionLevel.FULL_ACCESS,
  'main team member': PermissionLevel.FULL_ACCESS,
  main_team_member: PermissionLevel.FULL_ACCESS,
  marketer: PermissionLevel.LIMITED_ACCESS,
  sales: PermissionLevel.LIMITED_ACCESS,
  sales_manager: PermissionLevel.LIMITED_ACCESS,
  manager: PermissionLevel.LIMITED_ACCESS,
  developer: PermissionLevel.LIMITED_ACCESS,
  project_manager: PermissionLevel.LIMITED_ACCESS,
  staff: PermissionLevel.LIMITED_ACCESS,
  team_member: PermissionLevel.LIMITED_ACCESS,
  client: PermissionLevel.NO_ACCESS
};

// Permission constants for CRM
export const PERMISSIONS = {
  // Lead management
  LEADS_READ: 'leads.read',
  LEADS_CREATE: 'leads.create',
  LEADS_UPDATE: 'leads.update',
  LEADS_DELETE: 'leads.delete',
  LEADS_ASSIGN: 'leads.assign',
  
  // Pipeline management
  PIPELINE_MANAGE: 'pipeline.manage',
  PIPELINE_VIEW: 'pipeline.view',
  
  // Team management
  TEAM_MANAGE: 'team.manage',
  TEAM_VIEW: 'team.view',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_VIEW_LIMITED: 'reports.view_limited',
  
  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  
  // User management
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',

  // Tickets
  TICKETS_READ: 'tickets.read',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_UPDATE: 'tickets.update',
  TICKETS_DELETE: 'tickets.delete',
  
  // System
  SYSTEM_SETTINGS: 'system.settings'
} as const;

// Role-based permission mapping
export const ROLE_PERMISSION_MAP: Record<UserRole, string[]> = {
  admin: Object.values(PERMISSIONS),
  marketing_manager: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_UPDATE, PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.PIPELINE_MANAGE, PERMISSIONS.TEAM_MANAGE, PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.USERS_MANAGE
  ],
  marketer: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_UPDATE, PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.PIPELINE_MANAGE, PERMISSIONS.REPORTS_VIEW_LIMITED,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  sales: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_UPDATE, PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.PIPELINE_MANAGE, PERMISSIONS.REPORTS_VIEW_LIMITED,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  sales_manager: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_UPDATE, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.PIPELINE_MANAGE, PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  finance: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_CREATE, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE, PERMISSIONS.REPORTS_VIEW
  ],
  'finance manager': [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_CREATE, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE, PERMISSIONS.REPORTS_VIEW
  ],
  finance_manager: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_CREATE, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE, PERMISSIONS.REPORTS_VIEW
  ],
  core: Object.values(PERMISSIONS),
  'main team member': Object.values(PERMISSIONS),
  main_team_member: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.LEADS_UPDATE, PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.PIPELINE_MANAGE, PERMISSIONS.TEAM_VIEW, PERMISSIONS.REPORTS_VIEW
  ],
  developer: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.REPORTS_VIEW_LIMITED,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  project_manager: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.REPORTS_VIEW_LIMITED,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  staff: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.PIPELINE_VIEW,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  team_member: [
    PERMISSIONS.LEADS_READ, PERMISSIONS.PIPELINE_VIEW, PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TICKETS_READ, PERMISSIONS.TICKETS_CREATE, PERMISSIONS.TICKETS_UPDATE
  ],
  client: []
};

/**
 * Check if user has permission to view financial data (legacy compatibility)
 */
export function canViewFinancialDataLegacy(user: User): boolean {
  return ROLE_PERMISSIONS[user.role] === PermissionLevel.FULL_ACCESS;
}

/**
 * Check if user has permission to view project details
 */
export function canViewProjectDetails(user: User): boolean {
  return ROLE_PERMISSIONS[user.role] !== PermissionLevel.NO_ACCESS;
}

/**
 * Check if marketer can access specific project (related projects only)
 */
export function canMarketerAccessProject(user: User, projectId: string, userProjectIds: string[]): boolean {
  if (user.role !== 'marketer') return true; // Non-marketers can access all projects
  return userProjectIds.includes(projectId);
}

/**
 * Get masked financial data for users without permission
 */
export function maskFinancialData(amount: number): string {
  return '••••••'; // Masked display for unauthorized users
}

/**
 * Filter project data based on user permissions
 */
export function filterProjectData<T extends { price?: number; budget?: number; invoiceAmount?: number }>(
  data: T,
  user: User
): T {
  if (canViewFinancialData(user)) {
    return data;
  }

  // Create a copy and mask financial fields
  const filtered = { ...data };
  
  if ('price' in filtered) {
    filtered.price = undefined;
  }
  if ('budget' in filtered) {
    filtered.budget = undefined;
  }
  if ('invoiceAmount' in filtered) {
    filtered.invoiceAmount = undefined;
  }

  return filtered;
}

/**
 * Get user from localStorage/sessionStorage
 */
export function getCurrentUser(): User | null {
  try {
    const userStr = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const rawPerms = user?.permissions ?? user?.user?.permissions;
      const permissions = Array.isArray(rawPerms) ? rawPerms.map((x: any) => String(x || '').trim()).filter(Boolean) : undefined;
      return {
        id: user.id || user._id,
        email: user.email || user?.user?.email || '',
        role: normalizeRole(user.role || user?.user?.role),
        name: user.name,
        permissions,
      };
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  return null;
}

export function canAccessModule(module: ModuleKey, user?: User | null): boolean {
  const u = user ?? getCurrentUser();
  if (!u) return false;

  const role = normalizeRole(u.role);
  if (role === 'admin') return true;

  if (module === 'user_management') return false;

  if (role === 'client') {
    const allowed = new Set<ModuleKey>(['client_portal', 'messages', 'dashboard', 'profile', 'tickets']);
    return allowed.has(module);
  }

  const perms = normalizePermissions(u.permissions);
  if (perms.has(module)) return true;

  if (role === 'marketer' || role === 'sales') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'sales', 'prospects', 'reports', 'tickets', 'events', 'clients', 'hrm']);
    return allowed.has(module);
  }

  if (role === 'sales_manager') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'sales', 'prospects', 'reports', 'tickets', 'events', 'clients', 'hrm']);
    return allowed.has(module);
  }

  if (role === 'finance' || role === 'finance_manager') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'sales', 'reports', 'accounting', 'tickets', 'events', 'clients', 'hrm']);
    return allowed.has(module);
  }

  if (role === 'developer') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'tickets', 'events', 'clients', 'hrm']);
    return allowed.has(module);
  }

  if (role === 'project_manager') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'tickets', 'events', 'clients', 'hrm', 'accounting', 'sales', 'reports']);
    return allowed.has(module);
  }

  if (role === 'team_member') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'tickets', 'events', 'hrm']);
    return allowed.has(module);
  }

  if (role === 'marketing_manager') {
    const allowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'crm', 'sales', 'prospects', 'reports', 'tickets', 'events', 'clients', 'hrm']);
    return allowed.has(module);
  }

  const staffAllowed = new Set<ModuleKey>(['dashboard', 'messages', 'announcements', 'calendar', 'tasks', 'profile', 'files', 'notes', 'projects', 'tickets', 'events', 'clients', 'hrm']);
  return staffAllowed.has(module);
}

export function canAccessPath(pathname: string, user?: User | null): boolean {
  const u = user ?? getCurrentUser();
  if (!u) return false;

  const role = normalizeRole(u.role);
  if (role === 'admin') return true;

  if (pathname.startsWith('/appointments')) return false;

  if (pathname.startsWith('/accounting/recovery')) return role === 'finance_manager';

  // Clients: allow the shared messaging UI for project-scoped chats, but block all other non-client routes.
  if (role === 'client') {
    if (pathname.startsWith('/client')) return true;
    if (pathname.startsWith('/messages') || pathname.startsWith('/messaging')) return true;
    return false;
  }

  // Admin-only sections
  if (pathname.startsWith('/user-management')) return false;
  if (pathname === '/tasks/activity' || pathname.startsWith('/tasks/activity/')) return false;
  if (pathname === '/announcements/new' || pathname.startsWith('/announcements/new/')) return false;
  if (pathname.startsWith('/accounting/vendors')) return false;
  if (pathname.startsWith('/accounting/vendor-ledger')) return false;
  if (pathname.startsWith('/accounting/settings')) return false;
  if (pathname.startsWith('/accounting/periods')) return false;

  // Client portal is client-only
  if (pathname.startsWith('/client')) {
    return false;
  }

  // HRM: allow attendance for all authenticated users; salary ledger for staff only
  if (pathname.startsWith('/hrm')) {
    if (pathname === '/hrm/attendance' || pathname.startsWith('/hrm/attendance/')) return true;
    if (pathname === '/hrm/my-profile' || pathname.startsWith('/hrm/my-profile/')) return true;
    if (pathname === '/hrm/my-salary-ledger' || pathname.startsWith('/hrm/my-salary-ledger/')) return role === 'staff';
    return false;
  }

  if (pathname.startsWith('/crm/meta-ads')) {
    const r = normalizeRole(u.role);
    return r === 'admin' || r === 'marketing_manager';
  }

  return canAccessModule(getModuleFromPath(pathname), u);
}

/**
 * Check if current user has permission
 */
export function hasPermission(permission: PermissionLevel): boolean {
  const user = getCurrentUser();
  if (!user) return false;

  const userPermission = ROLE_PERMISSIONS[user.role];
  return userPermission === permission || 
         (permission === PermissionLevel.LIMITED_ACCESS && userPermission === PermissionLevel.FULL_ACCESS);
}

/**
 * Check if current user has specific CRM permission
 */
export function hasCrmPermission(permission: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check user permissions array
  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(permission) || user.permissions.includes('*')) {
      return true;
    }
  }
  
  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSION_MAP[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if current user can access leads based on data scope
 */
export function canAccessLeads(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  return ['admin', 'marketing_manager', 'marketer', 'sales', 'sales_manager', 'finance', 'finance_manager', 'finance manager', 'manager', 'developer', 'project_manager', 'team_member'].includes(user.role);
}

/**
 * Check if current user can see financial data
 */
export function canViewFinancialData(user?: User): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;

  const role = normalizeRole(currentUser.role);
  return ['admin', 'finance', 'finance_manager', 'finance_manager'].includes(role);
}

/**
 * Get user's data scope for filtering
 */
export function getUserDataScope(): 'assigned' | 'team' | 'all' {
  const user = getCurrentUser();
  if (!user) return 'assigned';
  
  if (user.role === 'admin') return 'all';
  if (user.role === 'marketing_manager') return 'team';
  if (user.role === 'sales_manager' || user.role === 'project_manager') return 'team';
  return 'assigned';
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(action: string, resource: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Admin can do everything
  if (user.role === 'admin') return true;
  
  // Check specific permissions
  const permission = `${resource}.${action}`;
  return hasCrmPermission(permission);
}

/**
 * Filter leads based on user permissions and data scope
 */
export function filterLeadsForUser<T extends { ownerId?: string; assignedTo?: string }>(leads: T[]): T[] {
  const user = getCurrentUser();
  if (!user) return [];
  
  const dataScope = getUserDataScope();
  
  if (dataScope === 'all') return leads;
  if (dataScope === 'team') return leads; // Team leads - would filter by team in real implementation
  
  // Assigned leads only
  // In real implementation, this would check against assigned leads
  return leads;
}
