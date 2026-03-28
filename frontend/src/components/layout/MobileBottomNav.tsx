import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  User,
  Menu,
  Briefcase,
  Users,
  Target,
  BarChart3,
  DollarSign,
  CreditCard,
  FolderKanban,
  ShoppingCart,
  Ticket,
  Building2,
} from "lucide-react";
import { getCurrentUser } from "@/utils/roleAccess";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const getStoredAuthUser = (): { role?: string } | null => {
  const raw = sessionStorage.getItem("auth_user") || localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Role-based navigation configuration
const getRoleBasedNav = (role: string): NavItem[] => {
  const normalizedRole = (role || "admin").toLowerCase().trim();

  // Admin - Full access
  if (normalizedRole === "admin") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "CRM", href: "/crm", icon: Target },
      { title: "Sales", href: "/sales/orders", icon: ShoppingCart },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "HRM", href: "/hrm", icon: Users },
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Marketer - Focus on leads and clients
  if (normalizedRole === "marketer" || normalizedRole === "marketing") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "CRM", href: "/crm/leads", icon: Target },
      { title: "Clients", href: "/clients", icon: Building2 },
      { title: "Portfolio", href: "/portfolio", icon: Briefcase },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Developer - Focus on projects and tasks
  if (normalizedRole === "developer") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "My Ledger", href: "/hrm/my-salary-ledger", icon: DollarSign },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Project Manager - Focus on projects and team
  if (normalizedRole === "project_manager") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Clients", href: "/clients", icon: Building2 },
      { title: "HRM", href: "/hrm", icon: Users },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Finance Manager - Focus on finance and accounting
  if (normalizedRole === "finance" || normalizedRole === "finance_manager") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Accounting", href: "/accounting", icon: DollarSign },
      { title: "Sales", href: "/sales/orders", icon: ShoppingCart },
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Client - Limited access
  if (normalizedRole === "client") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "My Ledger", href: "/client/ledger", icon: DollarSign },
      { title: "Tickets", href: "/client/tickets", icon: Ticket },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Team Member / Staff - Limited access
  if (normalizedRole === "team_member" || normalizedRole === "staff") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "My Profile", href: "/hrm/my-profile", icon: User },
      { title: "Attendance", href: "/hrm/attendance", icon: BarChart3 },
      { title: "My Ledger", href: "/hrm/my-salary-ledger", icon: DollarSign },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
    ];
  }

  // Sales - Focus on sales and clients
  if (normalizedRole === "sales" || normalizedRole === "sales_manager") {
    return [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "CRM", href: "/crm", icon: Target },
      { title: "Clients", href: "/clients", icon: Building2 },
      { title: "Orders", href: "/sales/orders", icon: ShoppingCart },
      { title: "Portfolio", href: "/portfolio", icon: Briefcase },
      { title: "Profile", href: "/profile", icon: User },
    ];
  }

  // Default fallback
  return [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Tasks", href: "/tasks", icon: CheckSquare },
    { title: "Profile", href: "/profile", icon: User },
  ];
};

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const location = useLocation();
  const me = getStoredAuthUser();
  const currentUser = getCurrentUser();
  const role = me?.role || "admin";

  const navItems = getRoleBasedNav(role);

  // Show max 5 items + menu button
  const visibleItems = navItems.slice(0, 5);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full gap-1 px-1",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>

        {/* Nav Items */}
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 px-1 relative",
                "transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative p-1.5 rounded-xl transition-all",
                  active && "bg-primary/10"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-[60px]">
                {item.title}
              </span>
            </NavLink>
          );
        })}
      </div>

      {/* Safe area padding for notched devices */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
