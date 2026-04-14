import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Heart, 
  Users, 
  Stethoscope, 
  Syringe, 
  Calendar,
  Settings,
  LogOut,
  UserCog,
  FileText,
  Bell,
  PawPrint
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist', 'owner'],
  },
  {
    label: 'Animals',
    path: '/pets',
    icon: <Heart className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist', 'owner'],
  },
  {
    label: 'Owners',
    path: '/owners',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist'],
  },
  {
    label: 'Consultations',
    path: '/medical-records',
    icon: <Stethoscope className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'owner'],
  },
  {
    label: 'Vaccinations',
    path: '/vaccinations',
    icon: <Syringe className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist', 'owner'],
  },
  {
    label: 'Appointments',
    path: '/appointments',
    icon: <Calendar className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist', 'owner'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin', 'veterinarian'],
  },
  {
    label: 'User Management',
    path: '/users',
    icon: <UserCog className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: <Bell className="h-5 w-5" />,
    roles: ['admin', 'veterinarian', 'receptionist', 'owner'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const filteredItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-accent/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary">
            <PawPrint className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">PetPals PH</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <ul className="space-y-1">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-accent/30 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
