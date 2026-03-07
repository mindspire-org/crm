import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Role from '../models/Role.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const isProd = String(process.env.NODE_ENV || 'development') === 'production';
if (isProd && (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === '' || JWT_SECRET === 'dev_secret_change_me')) {
  console.error('Missing or insecure JWT_SECRET in production');
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1]?.trim();

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (token.split('.').length !== 3) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (isProd && JWT_SECRET === 'dev_secret_change_me') {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const userId = decoded?.uid || decoded?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(userId).select('-passwordHash -pinHash');
    
    if (!user) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

// RBAC Permission Middleware
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = req.user;
      
      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Check user permissions array
      if (user.permissions && Array.isArray(user.permissions)) {
        if (user.permissions.includes(permission) || user.permissions.includes('*')) {
          return next();
        }
        
        // Handle granular matches (e.g., if permission is 'leads:view', match '*' or 'leads:*' or 'leads:view')
        const parts = permission.split(':');
        if (parts.length > 1) {
          const moduleOnly = `${parts[0]}:*`;
          const subModuleOnly = parts.length === 3 ? `${parts[0]}:${parts[1]}:*` : null;
          
          if (user.permissions.includes(moduleOnly) || (subModuleOnly && user.permissions.includes(subModuleOnly))) {
            return next();
          }
        }
      }

      // Role-based permission mapping
      const rolePermissions = {
        'marketing_manager': [
          'leads.read', 'leads.create', 'leads.update', 'leads.delete', 'leads.assign',
          'pipeline.manage', 'team.manage', 'reports.view'
        ],
        'marketing manager': [
          'leads.read', 'leads.create', 'leads.update', 'leads.delete', 'leads.assign',
          'pipeline.manage', 'team.manage', 'reports.view'
        ],
        'marketer': [
          'leads.read', 'leads.update', 'leads.create', 'leads.delete',
          'pipeline.view', 'reports.view_limited'
        ],
        'sales': [
          'leads.read', 'leads.update', 'leads.create',
          'pipeline.manage', 'reports.view_limited',
          'invoices.read', 'invoices.create', 'invoices.update',
          'payments.read', 'payments.create', 'payments.update'
        ],
        'sales_manager': [
          'leads.read', 'leads.update', 'leads.create', 'leads.assign',
          'pipeline.manage', 'reports.view',
          'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
          'payments.read', 'payments.create', 'payments.update', 'payments.delete'
        ],
        'manager': [
          'leads.read', 'leads.update', 'leads.assign',
          'pipeline.manage', 'team.view', 'reports.view'
        ],
        'finance': [
          'leads.read', 'leads.create', 'pipeline.view', 'reports.view',
          'finance.view', 'finance.manage',
          'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
          'payments.read', 'payments.create', 'payments.update', 'payments.delete'
        ],
        'finance_manager': [
          'leads.read', 'leads.create', 'pipeline.view', 'reports.view',
          'finance.view', 'finance.manage',
          'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
          'payments.read', 'payments.create', 'payments.update', 'payments.delete'
        ],
        'developer': [
          'leads.read', 'pipeline.view', 'reports.view_limited',
          'projects.read', 'projects.update'
        ],
        'project_manager': [
          'leads.read', 'pipeline.view', 'reports.view_limited',
          'projects.read', 'projects.update', 'projects.create', 'projects.delete'
        ],
        'staff': [
          'leads.read', 'pipeline.view'
        ]
      };

      const userRolePermissions = rolePermissions[user.role] || [];
      
      if (userRolePermissions.includes(permission) || userRolePermissions.includes('*')) {
        return next();
      }

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: user.role
      });
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Data scope middleware for filtering results based on user role
export const applyDataScope = (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const user = req.user;
    
    // Admin sees all data
    if (user.role === 'admin') {
      req.dataScope = 'all';
      return next();
    }

    // Marketing Manager sees team data
    if (user.role === 'marketing_manager') {
      req.dataScope = 'team';
      return next();
    }

    // Sales/Project managers: treat as team scope
    if (user.role === 'sales_manager' || user.role === 'project_manager') {
      req.dataScope = 'team';
      return next();
    }

    // Non-admin roles generally see assigned data only
    if (
      user.role === 'marketer' ||
      user.role === 'sales' ||
      user.role === 'staff' ||
      user.role === 'developer' ||
      user.role === 'finance' ||
      user.role === 'finance_manager' ||
      user.role === 'manager'
    ) {
      req.dataScope = 'assigned';
      return next();
    }

    // Default scope for other roles
    req.dataScope = 'assigned';
    next();
  } catch (error) {
    console.error('Data scope middleware error:', error);
    req.dataScope = 'assigned';
    next();
  }
};

// Lead ownership middleware
export const requireLeadOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user;
    const leadId = req.params.id || req.body.leadId;

    // Admin can access any lead
    if (user.role === 'admin') {
      return next();
    }

    // Marketing Manager can access team leads
    if (user.role === 'marketing_manager') {
      return next();
    }

    // For marketers and staff, check if lead is assigned to them
    // This would typically check against a database
    // For now, we'll allow access but log the attempt
    console.log(`Lead access attempt: User ${user._id} (${user.role}) accessing lead ${leadId}`);
    
    next();
  } catch (error) {
    console.error('Lead ownership middleware error:', error);
    res.status(500).json({ error: 'Lead access check failed' });
  }
};
