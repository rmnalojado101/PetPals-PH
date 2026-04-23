import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Activity } from 'lucide-react';

export function WelcomeBanner() {
  const { user } = useAuth();
  const [clinicName, setClinicName] = useState('Petpals PH');
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings.name) setClinicName(settings.name);
      } catch (error) {
        console.error('Error loading clinic name:', error);
      }
    };
    loadSettings();
  }, []);

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

  const displayClinicName = clinicName.replace(/\s*Veterinary Clinic\s*$/i, '').trim();

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 md:p-8 text-white">
      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome to {displayClinicName}
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
