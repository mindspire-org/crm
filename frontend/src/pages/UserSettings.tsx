import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { getCurrentUser } from '@/utils/roleAccess';
import { getAuthHeaders } from '@/lib/api/auth';
import { API_BASE } from '@/lib/api/base';
import PinManagement from '@/components/auth/PinManagement';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Lock, 
  Key, 
  Settings, 
  Eye, 
  EyeOff,
  Loader2,
  Camera
} from 'lucide-react';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UserSettings() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: '',
    avatar: ''
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData.user);
        setProfileData({
          name: userData.user.name || '',
          email: userData.user.email || '',
          username: userData.user.username || '',
          avatar: userData.user.avatar || ''
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setProfileLoading(true);
      
      if (!profileData.name.trim()) {
        toast.error('Name is required');
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
          username: profileData.username.trim()
        })
      });

      if (res.ok) {
        toast.success('Profile updated successfully');
        await loadUserProfile();
        // Notify HRM Employees page to refresh
        window.dispatchEvent(new Event('employeeUpdated'));
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        toast.error('Please fill all password fields');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (res.ok) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await res.json().catch(()=>({ error: 'Failed to change password' }));
        throw new Error(error?.error || 'Failed to change password');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change password');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'marketing_manager': return 'bg-blue-100 text-blue-800';
      case 'marketer': return 'bg-green-100 text-green-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      case 'finance': return 'bg-yellow-100 text-yellow-800';
      case 'staff': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load user profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Settings</h1>
          <p className="text-muted-foreground">Manage your account, security, and preferences</p>
        </div>
      </div>

      {/* User Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-lg">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge variant="outline">
                  {user.status}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{user.email}</p>
                <p>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                {user.lastLoginAt && (
                  <p>Last login: {new Date(user.lastLoginAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="pin" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            PIN Manager
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter your username"
                  />
                  <p className="text-xs text-muted-foreground">Used for login. Lowercase letters, numbers, and underscores only.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL (Optional)</Label>
                <Input
                  id="avatar"
                  value={profileData.avatar}
                  onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handlePasswordChange}>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PIN Management Tab */}
        <TabsContent value="pin" className="space-y-6">
          <PinManagement onPinUpdate={loadUserProfile} />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred interface theme
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Palette className="w-4 h-4 mr-2" />
                    Light
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred language
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Globe className="w-4 h-4 mr-2" />
                    English
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Download Account Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    Deactivate Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
