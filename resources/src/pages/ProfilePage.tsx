import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Save, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    const success = await updateProfile({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });
    
    if (success) {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved to the MySQL database.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    }
    
    setIsSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setChangePasswordLoading(true);
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    
    if (result.success) {
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated in the database.',
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } else {
       toast({
        title: 'Update Failed',
        description: result.error || 'Failed to update password.',
        variant: 'destructive',
      });
    }
    setChangePasswordLoading(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary text-white text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={formData.email}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+63 917 123 4567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="City, Province"
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password for security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>

          <Button 
            onClick={handleChangePassword} 
            variant="outline" 
            className="w-full"
            disabled={!passwordData.currentPassword || !passwordData.newPassword || changePasswordLoading}
          >
            {changePasswordLoading ? 'Updating...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
