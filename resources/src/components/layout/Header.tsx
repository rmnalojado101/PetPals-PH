import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Menu, Moon, Sun, User, Settings, LogOut, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useTour } from '@/contexts/TourContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { restartTour } = useTour();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('Petpals PH');
  const [isDark, setIsDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadHeaderData = async () => {
       try {
         const settings = await api.getSettings();
         if (settings.name) setClinicName(settings.name);
         
         const countRes = await api.getUnreadNotificationsCount();
         setUnreadCount(countRes.count);
       } catch (error) {
         console.error('Error loading header data:', error);
       }
    };
    
    if (user) {
      loadHeaderData();
      // Refresh notifications every minute
      const interval = setInterval(loadHeaderData, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const displayClinicName = clinicName.replace(/\s*Veterinary Clinic\s*$/i, '').trim();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Left side - Clinic name & date */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-xl" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="hidden sm:block">
          <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium">
            {displayClinicName}
          </span>
        </div>
        <div className="hidden md:block">
          <span className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
            {today}
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Search & Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden lg:block" data-tour="header-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 rounded-xl bg-muted border-0"
          />
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/notifications')}
          data-tour="header-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2" data-tour="header-account">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {(user?.role === 'admin' || user?.role === 'vet_clinic') && (
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                restartTour();
              }}
            >
              <Compass className="mr-2 h-4 w-4" />
              Restart Tour
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
