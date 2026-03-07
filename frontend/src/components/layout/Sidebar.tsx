import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  MessageSquare,
  Calendar,
  
  Settings,
  ChevronDown,
  Building2,
  Target,
  UserCheck,
  Clock,
  CreditCard,
  Folder,
  // 3. CRM
  CheckSquare,
  StickyNote,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  ShoppingCart,
  Anchor,
  BarChart3,
  Ticket,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/base";
import { canAccessPath, getCurrentUser } from "@/utils/roleAccess";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  // 1. Dashboard
  { title: "Dashboard", href: "/", icon: LayoutDashboard },

  // Appointments (Admin-only)
  { title: "Appointments", href: "/appointments", icon: Calendar },

  // 2. Clients
  { title: "Clients", href: "/clients", icon: Building2 },

  // 3. Portfolio
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },

  // 3. CRM
  {
    title: "CRM",
    href: "/crm",
    icon: Target,
    children: [
      { title: "Dashboard", href: "/crm" },
      { title: "Leads", href: "/crm/leads" },
      { title: "Meta Ads", href: "/crm/meta-ads" },
      { title: "Lead Approvals", href: "/admin/lead-approvals" },
    ],
  },

  // 4. HRM
  {
    title: "HRM",
    href: "/hrm",
    icon: Users,
    children: [
      { title: "Dashboard", href: "/hrm" },
      { title: "Employees", href: "/hrm/employees" },
      { title: "Attendance", href: "/hrm/attendance" },
      { title: "Leave", href: "/hrm/leaves" },
      { title: "Payroll", href: "/hrm/payroll" },
      { title: "Departments", href: "/hrm/departments" },
      { title: "Recruitment", href: "/hrm/recruitment" },
      { title: "Commissions", href: "/hrm/commissions" },
      { title: "My Salary Ledger", href: "/hrm/my-salary-ledger" },
    ],
  },

  // 5. Projects (View-only for non-admin)
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    children: [
      { title: "Overview", href: "/projects" },
      { title: "Timeline", href: "/projects/timeline" },
      { title: "Tasks", href: "/tasks" },
    ],
  },

  // 6. Prospects
  {
    title: "Prospects",
    href: "/prospects",
    icon: Anchor,
    children: [
      { title: "Estimate List", href: "/prospects/estimates" },
      { title: "Estimate Requests", href: "/prospects/estimate-requests" },
      { title: "Estimate Forms", href: "/prospects/estimate-forms" },
      { title: "Proposals", href: "/prospects/proposals" },
    ],
  },

  // 7. Sales
  {
    title: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    children: [
      { title: "Invoices", href: "/invoices" },
      { title: "Orders list", href: "/sales/orders" },
      { title: "Store", href: "/sales/store" },
      { title: "Subscriptions", href: "/sales/subscriptions" },
      { title: "Payments", href: "/sales/payments" },
      { title: "Items", href: "/sales/items" },
      { title: "Contracts", href: "/sales/contracts" },
    ],
  },

  // 7+. Rest
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Tickets", href: "/tickets", icon: Ticket },
  { title: "Events", href: "/events", icon: Calendar },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Team Activity", href: "/tasks/activity", icon: Activity },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Announcements", href: "/announcements", icon: Megaphone },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Files", href: "/files", icon: Folder },

  // Accounting
  {
    title: "Accounting",
    href: "/accounting",
    icon: BarChart3,
    children: [
      { title: "Dashboard", href: "/accounting" },
      { title: "Expenses", href: "/accounting/expenses" },
      { title: "Vouchers", href: "/accounting/vouchers" },
      { title: "Recovery", href: "/accounting/recovery" },
      { title: "Journal", href: "/accounting/journal" },
      { title: "General Ledger", href: "/accounting/ledger" },
      { title: "Trial Balance", href: "/accounting/trial-balance" },
      { title: "Income Statement", href: "/accounting/income-statement" },
      { title: "Balance Sheet", href: "/accounting/balance-sheet" },
      { title: "Accounts", href: "/accounting/accounts" },
      { title: "Vendors", href: "/accounting/vendors" },
      { title: "Vendor Ledger", href: "/accounting/vendor-ledger" },
      { title: "Settings", href: "/accounting/settings" },
      { title: "Periods", href: "/accounting/periods" },
    ],
  },

  // Extra groups requested: App Settings, Access Permission, Client portal, Sales & Prospects, Setup, Settings
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/settings/general" },
      { title: "Localization", href: "/settings/localization" },
      { title: "Theme", href: "/settings/theme" },
      { title: "Email", href: "/settings/email" },
      { title: "Modules", href: "/settings/modules" },
      { title: "Menu", href: "/settings/left-menu" },
      { title: "Notifications", href: "/settings/notifications" },
      { title: "Integration", href: "/settings/integration" },
      { title: "System", href: "/settings/system" },
      { title: "Terms", href: "/settings/terms" },
      { title: "Updates", href: "/settings/updates" },
    ],
  },
  {
    title: "Client portal",
    href: "/client",
    icon: Building2,
    children: [
      { title: "Ledger", href: "/client/ledger" },
      { title: "Messages", href: "/client/messages" },
      { title: "Announcements", href: "/client/announcements" },
      { title: "Tickets", href: "/client/tickets" },
    ],
  },
  
  // User Management just above Settings
  {
    title: "User Management",
    href: "/user-management/users",
    icon: Users,
    children: [
      { title: "Manage Users", href: "/user-management/users" },
      { title: "Roles & Permissions", href: "/user-management/roles" },
      { title: "Delete Request", href: "/user-management/delete-request" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

const getStoredAuthUser = (): { id?: string; _id?: string; email?: string; role?: string; permissions?: string[] } | null => {
  const raw = sessionStorage.getItem("auth_user") || localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};


const normalizeAvatarSrc = (input: string) => {
  const s = String(input || "").trim();
  if (!s || s.startsWith("<")) return "/api/placeholder/64/64";
      const base = (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) ? "https://healthspire-crm.onrender.com" : API_BASE;
    try {
    const isAbs = /^https?:\/\//i.test(s);
    if (isAbs) {
      const u = new URL(s);
      if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname.includes("/uploads/")) {
        return `${base}${u.pathname}`;
      }
      if (u.pathname.includes("/uploads/")) return `${base}${u.pathname}`;
      return s;
    }
    const rel = s.startsWith("/") ? s : `/${s}`;
    return `${base}${rel}`;
  } catch {
    const rel = s.startsWith("/") ? s : `/${s}`;
    return `${base}${rel}`;
  }
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const me = getStoredAuthUser();
  const currentUser = getCurrentUser();
  const role = me?.role || "admin";
  const perms = new Set((Array.isArray((me as any)?.permissions) ? (me as any).permissions : []).map((x: any) => String(x || "").trim()).filter(Boolean));
  const meName = String((me as any)?.name || "").trim();
  const meEmail = String(me?.email || "").trim();
  const meAvatar = String((me as any)?.avatar || "").trim();
  const meInitials = String(meName || meEmail || "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAllowed = (item: NavItem) => {
    // Explicitly hide admin-only items for non-admin roles (except project_manager gets more access)
    const adminOnlyItems = ["Appointments", "Team Activity", "User Management", "Client portal"];
    if (adminOnlyItems.includes(item.title) && role !== "admin") {
      return false;
    }
    
    // Hide Prospects and Leads/CRM section for project_manager (not relevant)
    if ((item.title === "Prospects" || item.title === "CRM") && role === "project_manager") {
      return false;
    }
    
    // Hide Sales section for non-admin and non-finance roles
    if (item.title === "Sales" && !["admin", "finance", "finance_manager", "finance manager"].includes(role)) {
      return false;
    }
    
    // Hide Accounting section for non-finance roles
    if (item.title === "Accounting" && !["admin", "finance", "finance_manager", "finance manager"].includes(role)) {
      return false;
    }
    
    // Hide Settings for non-admin roles
    if (item.title === "Settings" && role !== "admin") {
      return false;
    }

    // Developer-specific restrictions
    if (role === "developer") {
      // Hide CRM, Prospects, Reports, Clients, Subscriptions, Events for developers
      const developerHiddenItems = ["CRM", "Prospects", "Reports", "Clients", "Subscriptions", "Events"];
      if (developerHiddenItems.includes(item.title)) {
        return false;
      }
      
      // For HRM, only allow Attendance and My Salary Ledger
      if (item.title === "HRM") {
        // Filter children to only show allowed items
        const allowedChildren = item.children?.filter(child => 
          child.href === "/hrm/attendance" || child.href === "/hrm/my-salary-ledger"
        );
        // Return true only if there are allowed children
        return (allowedChildren && allowedChildren.length > 0) ? true : false;
      }
    }
    
    // Team member restrictions - hide projects, sales, finance, crm, prospects, etc.
    if (role === "team_member") {
      const teamMemberHiddenItems = [
        "Projects", "Portfolio", "CRM", "Prospects", "Sales", "Accounting", 
        "Clients", "Reports", "Subscriptions", "Team Activity", "Prospects"
      ];
      if (teamMemberHiddenItems.includes(item.title)) {
        return false;
      }
      
      // For HRM, limit to Attendance, Leave, and My Salary Ledger only
      if (item.title === "HRM") {
        const allowedChildren = item.children?.filter(child => 
          child.href === "/hrm/attendance" || 
          child.href === "/hrm/leaves" || 
          child.href === "/hrm/my-salary-ledger"
        );
        return (allowedChildren && allowedChildren.length > 0) ? true : false;
      }
    }
    
    // Some groups are not actual routes (e.g. /sales), so we check children if present.
    if (item.children && item.children.length) {
      return item.children.some((c) => canAccessPath(c.href, currentUser));
    }
    return canAccessPath(item.href, currentUser);
  };

  const visibleNavigation = navigation
    .filter(isAllowed)
    .map((item) => {
      if (!item.children || !item.children.length) return item;
      let nextChildren = item.children.filter((c) => canAccessPath(c.href, currentUser));
      
      // For developers, only show specific HRM items
      if (role === "developer" && item.title === "HRM") {
        nextChildren = nextChildren.filter((c) => 
          c.href === "/hrm/attendance" || c.href === "/hrm/my-salary-ledger"
        );
      }
      
      // For team_members, limit HRM items
      if (role === "team_member" && item.title === "HRM") {
        nextChildren = nextChildren.filter((c) => 
          c.href === "/hrm/attendance" || c.href === "/hrm/leaves" || c.href === "/hrm/my-salary-ledger"
        );
      }
      
      return { ...item, children: nextChildren };
    })
    .filter((item) => {
      if (item.children && item.children.length === 0) {
        return canAccessPath(item.href, currentUser);
      }
      return true;
    });

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar flex flex-col",
          "transition-transform duration-300 lg:transition-all",
          // width behavior
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64 max-w-[80vw]",
          // mobile drawer translate
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {collapsed ? (
            <img
              src="/HealthSpire%20logo.png"
              alt="HealthSpire"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-contain flex-shrink-0 filter brightness-110 contrast-110 dark:brightness-125 dark:contrast-125"
            />
          ) : (
            <img
              src="/HealthSpire%20logo.png"
              alt="HealthSpire"
              className="h-12 sm:h-14 w-auto max-h-14 object-contain flex-shrink-0 filter brightness-110 contrast-110 dark:brightness-125 dark:contrast-125"
            />
          )}
        </div>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0 lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0 hidden lg:flex"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3 scrollbar-thin">
        <ul className="space-y-1">
          {visibleNavigation.map((item) => (
            <li key={item.title}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      "sidebar-nav-item w-full justify-between",
                      isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="whitespace-nowrap">{item.title}</span>}
                    </span>
                    {!collapsed && (
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          openMenus.includes(item.title) && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                  {!collapsed && openMenus.includes(item.title) && (
                    <ul className="mt-1 ml-6 space-y-1 border-l border-sidebar-border pl-4">
                      {item.children
                        .filter((child) => {
                          // Hide Project Requests from non-admins
                          if (child.href === "/project-requests") return role === "admin";
                          // Hide CRM section for project managers
                          if (child.href === "/crm/leads" && role === "project_manager") return false;
                          // Hide Lead Approvals for non-admins
                          if (child.href === "/admin/lead-approvals") return role === "admin";
                          return true;
                        })
                        .map((child) => (
                          <li key={child.href}>
                            <NavLink
                              to={child.href}
                              onClick={() => {
                                // Close sidebar on mobile when navigating
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                  onClose();
                                }
                              }}
                              className={({ isActive }) =>
                                cn(
                                  "block py-2 px-3 text-sm rounded-md transition-colors",
                                  isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                                )
                              }
                            >
                              {child.title}
                            </NavLink>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.href}
                  end={item.href === "/"}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    cn(
                      "sidebar-nav-item",
                      isActive && "active"
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

        {/* User Profile */}
        <div className="p-3 sm:p-4 border-t border-sidebar-border">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
                <div className="w-10 h-10 rounded-full bg-white border border-sidebar-border flex items-center justify-center font-semibold text-sidebar-foreground overflow-hidden">
                  {meAvatar ? (
                    <img
                      src={normalizeAvatarSrc(String(meAvatar || ""))}
                      alt="User"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/api/placeholder/64/64"; }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{meInitials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {meName || meEmail || "User"}
                  </p>
                  <p className="text-xs text-sidebar-muted truncate">
                    {role ? String(role).toUpperCase() : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      </aside>
    </>
  );
}



