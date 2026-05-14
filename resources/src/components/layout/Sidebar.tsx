import { useState, useEffect } from 'react';
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
  PawPrint,
  CreditCard,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  isSubItem?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'vet_clinic', 'owner'],
  },
  {
    id: 'animals',
    label: 'Animals',
    path: '/pets',
    icon: <Heart className="h-5 w-5" />,
    roles: ['vet_clinic', 'owner'],
  },
  {
    id: 'owners',
    label: 'Owners',
    path: '/owners',
    icon: <Users className="h-5 w-5" />,
    roles: ['vet_clinic'],
  },
  {
    id: 'consultations',
    label: 'Consultations',
    path: '/medical-records',
    icon: <Stethoscope className="h-5 w-5" />,
    roles: ['owner', 'vet_clinic'],
  },
  {
    id: 'vaccination',
    label: 'Vaccination',
    path: '/vaccinations',
    icon: <Syringe className="h-5 w-5" />,
    roles: ['vet_clinic', 'owner'],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: <Calendar className="h-5 w-5" />,
    roles: ['vet_clinic', 'owner'],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: <FileText className="h-5 w-5" />,
    roles: ['vet_clinic'],
  },
  {
    id: 'reports-vaccination',
    label: 'Vaccination Reports',
    path: '/reports/vaccinations',
    icon: <Syringe className="h-4 w-4" />,
    roles: ['vet_clinic'],
    isSubItem: true,
  },
  {
    id: 'reports-billing',
    label: 'Billing Reports',
    path: '/reports/billing',
    icon: <CreditCard className="h-4 w-4" />,
    roles: ['vet_clinic'],
    isSubItem: true,
  },
  {
    id: 'reports-appointments',
    label: 'Appointment Reports',
    path: '/reports/appointments',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['vet_clinic'],
    isSubItem: true,
  },
  {
    id: 'reports-medical-records',
    label: 'Consultation Reports',
    path: '/reports/medical-records',
    icon: <Stethoscope className="h-4 w-4" />,
    roles: ['vet_clinic'],
    isSubItem: true,
  },
  {
    id: 'billing',
    label: 'Billing',
    path: '/billing',
    icon: <CreditCard className="h-5 w-5" />,
    roles: ['vet_clinic', 'owner'],
  },
  {
    id: 'users',
    label: 'User Management',
    path: '/users',
    icon: <UserCog className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: <Bell className="h-5 w-5" />,
    roles: ['admin', 'vet_clinic', 'owner'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['admin', 'vet_clinic'],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand reports if current path is a report page
  useEffect(() => {
    if (location.pathname.startsWith('/reports') && !expandedItems.includes('reports')) {
      setExpandedItems(prev => [...prev, 'reports']);
    }
  }, [location.pathname]);

  if (!user) return null;

  const filteredItems = navItems.filter(item => {
    if (!item.roles.includes(user.role)) return false;
    
    // Hide sub-items if parent is not expanded
    if (item.isSubItem) {
      const parentId = item.id.split('-')[0];
      return expandedItems.includes(parentId);
    }
    
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar" data-tour="sidebar-navigation">
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
              <li key={item.id}>
                <div className="relative group">
                  <NavLink
                    to={item.isSubItem ? item.path : (navItems.some(ni => ni.isSubItem && ni.id.startsWith(item.id)) ? '/reports' : item.path)}
                    end={item.id === 'reports'}
                    data-tour={`nav-${item.id}`}
                    onClick={(e) => {
                      const hasSubItems = navItems.some(ni => ni.isSubItem && ni.id.startsWith(item.id));
                      if (hasSubItems && !item.isSubItem && location.pathname.startsWith(item.path)) {
                        // If already on a sub-page, just toggle
                        toggleExpand(item.id);
                      }
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                        item.isSubItem && 'ml-6 py-2 text-xs opacity-80',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )
                    }
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {!item.isSubItem && navItems.some(ni => ni.isSubItem && ni.id.startsWith(item.id)) && (
                      expandedItems.includes(item.id) ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </NavLink>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-accent/30 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-sm font-semibold">
              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
                {user.role === 'owner'
                  ? 'Pet Owner'
                  : user.role === 'admin'
                    ? 'System Admin'
                    : 'Vet Clinic'}
              </p>
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
