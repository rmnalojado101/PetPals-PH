import { useAuth } from '@/contexts/AuthContext';
import { settingsStorage } from '@/lib/storage';
import { Activity } from 'lucide-react';

export function WelcomeBanner() {
  const { user } = useAuth();
  const settings = settingsStorage.get();
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 md:p-8 text-white">
      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome to {settings.name}
        </h1>
        <p className="text-white/80 text-lg">{today}</p>
        {user && (
          <p className="mt-4 text-white/90">
            {getGreeting()}, <span className="font-semibold">{user.name}</span>!
          </p>
        )}
      </div>
      
      {/* Decorative element */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
        <Activity className="h-32 w-32 md:h-40 md:w-40" strokeWidth={1} />
      </div>
    </div>
  );
}
