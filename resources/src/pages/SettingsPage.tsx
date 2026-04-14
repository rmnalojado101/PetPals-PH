import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, Clock, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState(settingsStorage.get());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    settingsStorage.update(settings);
    
    setTimeout(() => {
      toast({
        title: 'Settings Saved',
        description: 'Clinic settings have been updated.',
      });
      setIsSaving(false);
    }, 500);
  };

  const handleHoursChange = (index: number, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    const newHours = [...settings.openingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setSettings({ ...settings, openingHours: newHours });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage clinic settings and configuration</p>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clinic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Clinic Information</CardTitle>
            <CardDescription>
              Basic information about your clinic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Operating Hours
            </CardTitle>
            <CardDescription>
              Set your clinic's working hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.openingHours.map((hours, index) => (
                <div key={hours.day} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="text-sm font-medium">{hours.day}</span>
                  </div>
                  <Switch
                    checked={hours.isOpen}
                    onCheckedChange={(checked) => handleHoursChange(index, 'isOpen', checked)}
                  />
                  {hours.isOpen ? (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(index, 'open', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(index, 'close', e.target.value)}
                        className="w-28"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            About this system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">System Name</p>
              <p className="font-medium">PetPals PH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Technology Stack</p>
              <p className="font-medium">React + TypeScript + Tailwind CSS</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Storage</p>
              <p className="font-medium">Local Storage (Browser)</p>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <p className="text-sm">
              <strong>Note:</strong> This system uses browser local storage for data persistence. 
              For production use, it is recommended to connect to a proper database backend like 
              Supabase, PostgreSQL, or MySQL. Data is stored only in this browser and will be lost 
              if browser data is cleared.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
