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
import { Bell, Search, Menu, Moon, Sun, User, Settings, LogOut, Compass, PawPrint } from 'lucide-react';
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
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{pets: any[], owners: any[]}>({ pets: [], owners: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

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

  // Global Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ pets: [], owners: [] });
      setShowResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowResults(true);
      try {
        const [petsRes, ownersRes] = await Promise.all([
          api.getPets({ search: searchQuery, per_page: 5 }),
          api.getUsers({ search: searchQuery, role: 'owner', per_page: 5 })
        ]);

        setSearchResults({
          pets: Array.isArray(petsRes) ? petsRes : petsRes.data || [],
          owners: Array.isArray(ownersRes) ? ownersRes : ownersRes.data || []
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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
            placeholder="Search pets, owners..."
            className="w-64 pl-9 rounded-xl bg-muted border-0 focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          
          {showResults && (
            <div className="absolute top-full mt-2 w-80 bg-card border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : (
                  <>
                    {/* Pets Category */}
                    {searchResults.pets.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Patients (Pets)</div>
                        {searchResults.pets.map(pet => (
                          <div 
                            key={pet.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                              navigate(`/pets?id=${pet.id}`);
                              setSearchQuery('');
                            }}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <PawPrint className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{pet.name}</p>
                              <p className="text-xs text-muted-foreground truncate capitalize">{pet.species} • {pet.breed}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Owners Category */}
                    {searchResults.owners.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Owners</div>
                        {searchResults.owners.map(owner => (
                          <div 
                            key={owner.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                              navigate(`/owners?id=${owner.id}`);
                              setSearchQuery('');
                            }}
                          >
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{owner.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.pets.length === 0 && searchResults.owners.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">No matches found for "{searchQuery}"</div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
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
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
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
