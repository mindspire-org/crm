import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { getPinStatus, setPin, changePin, removePin, adminSetPin, adminRemovePin, PinStatus } from '@/services/authService';
import { Shield, Key, Eye, EyeOff, Loader2, Settings, User } from 'lucide-react';

interface PinManagementProps {
  userId?: string; // For admin management of other users
  isAdmin?: boolean; // Whether current user is admin
  onPinUpdate?: () => void; // Callback when PIN is updated
}

export default function PinManagement({ userId, isAdmin = false, onPinUpdate }: PinManagementProps) {
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'set' | 'change' | 'remove'>('set');
  const [formData, setFormData] = useState({
    currentPassword: '',
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [showPins, setShowPins] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    loadPinStatus();
  }, [userId]);

  const loadPinStatus = async () => {
    try {
      setLoading(true);
      const status = await getPinStatus();
      setPinStatus(status);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load PIN status');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      setActionLoading(true);
      
      if (actionType === 'set') {
        if (!formData.currentPassword || !formData.newPin) {
          toast.error('Please fill all required fields');
          return;
        }
        if (formData.newPin.length < 4) {
          toast.error('PIN must be at least 4 digits');
          return;
        }
        if (formData.newPin !== formData.confirmPin) {
          toast.error('PINs do not match');
          return;
        }
        await setPin(formData.currentPassword, formData.newPin);
        toast.success('PIN set successfully');
      } else if (actionType === 'change') {
        if (!formData.currentPin || !formData.newPin) {
          toast.error('Please fill all required fields');
          return;
        }
        if (formData.newPin.length < 4) {
          toast.error('PIN must be at least 4 digits');
          return;
        }
        if (formData.newPin !== formData.confirmPin) {
          toast.error('PINs do not match');
          return;
        }
        await changePin(formData.currentPin, formData.newPin);
        toast.success('PIN changed successfully');
      } else if (actionType === 'remove') {
        if (!formData.currentPassword) {
          toast.error('Password required to remove PIN');
          return;
        }
        await removePin(formData.currentPassword);
        toast.success('PIN removed successfully');
      }

      setDialogOpen(false);
      setFormData({
        currentPassword: '',
        currentPin: '',
        newPin: '',
        confirmPin: ''
      });
      await loadPinStatus();
      onPinUpdate?.();
    } catch (error: any) {
      toast.error(error?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openDialog = (type: 'set' | 'change' | 'remove') => {
    setActionType(type);
    setFormData({
      currentPassword: '',
      currentPin: '',
      newPin: '',
      confirmPin: ''
    });
    setDialogOpen(true);
  };

  const renderForm = () => {
    switch (actionType) {
      case 'set':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password *</Label>
              <Input
                type={showPins.current ? 'text' : 'password'}
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>New PIN *</Label>
              <Input
                type={showPins.new ? 'text' : 'password'}
                placeholder="Enter new PIN (min 4 digits)"
                value={formData.newPin}
                onChange={(e) => setFormData(prev => ({ ...prev, newPin: e.target.value }))}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm PIN *</Label>
              <Input
                type={showPins.confirm ? 'text' : 'password'}
                placeholder="Confirm new PIN"
                value={formData.confirmPin}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPin: e.target.value }))}
                maxLength={10}
              />
            </div>
          </div>
        );

      case 'change':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current PIN *</Label>
              <Input
                type={showPins.current ? 'text' : 'password'}
                placeholder="Enter current PIN"
                value={formData.currentPin}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPin: e.target.value }))}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>New PIN *</Label>
              <Input
                type={showPins.new ? 'text' : 'password'}
                placeholder="Enter new PIN (min 4 digits)"
                value={formData.newPin}
                onChange={(e) => setFormData(prev => ({ ...prev, newPin: e.target.value }))}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm PIN *</Label>
              <Input
                type={showPins.confirm ? 'text' : 'password'}
                placeholder="Confirm new PIN"
                value={formData.confirmPin}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPin: e.target.value }))}
                maxLength={10}
              />
            </div>
          </div>
        );

      case 'remove':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password *</Label>
              <Input
                type={showPins.current ? 'text' : 'password'}
                placeholder="Enter current password to confirm"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This will remove PIN authentication for your account. You'll need to use password login only.
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading PIN status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pinStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Unable to load PIN status
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          PIN Management
          {isAdmin && userId && <Badge variant="outline">Admin View</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PIN Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">PIN Status</span>
            </div>
            <Badge variant={pinStatus.hasPin ? 'default' : 'secondary'}>
              {pinStatus.hasPin ? 'Active' : 'Not Set'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Password</span>
            </div>
            <Badge variant={pinStatus.hasPassword ? 'default' : 'secondary'}>
              {pinStatus.hasPassword ? 'Available' : 'Not Set'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Can Set PIN</span>
            </div>
            <Badge variant={pinStatus.canSetPin ? 'default' : 'secondary'}>
              {pinStatus.canSetPin ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {/* PIN Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">PIN Actions</h3>
          
          <div className="flex flex-wrap gap-3">
            {!pinStatus.hasPin && pinStatus.canSetPin && (
              <Button onClick={() => openDialog('set')} variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Set PIN
              </Button>
            )}
            
            {pinStatus.hasPin && (
              <Button onClick={() => openDialog('change')} variant="outline">
                <Key className="w-4 h-4 mr-2" />
                Change PIN
              </Button>
            )}
            
            {pinStatus.hasPin && (
              <Button onClick={() => openDialog('remove')} variant="outline" className="text-destructive">
                <Shield className="w-4 h-4 mr-2" />
                Remove PIN
              </Button>
            )}
          </div>
        </div>

        {/* PIN Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Information</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• PIN authentication allows quick access using a 4+ digit PIN instead of password</p>
            <p>• PINs are encrypted and stored securely in the database</p>
            <p>• You can always switch between PIN and password login</p>
            {isAdmin && <p>• Admin can manage PINs for other team members</p>}
          </div>
        </div>

        {/* PIN Management Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'set' && 'Set PIN'}
                {actionType === 'change' && 'Change PIN'}
                {actionType === 'remove' && 'Remove PIN'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {renderForm()}
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPins(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPins.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Toggle Current
                </Button>
                {(actionType === 'set' || actionType === 'change') && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPins(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPins.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Toggle New
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPins(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPins.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Toggle Confirm
                    </Button>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAction} 
                  disabled={actionLoading}
                  className={actionType === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  {actionLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {actionType === 'set' && 'Setting PIN...'}
                      {actionType === 'change' && 'Changing PIN...'}
                      {actionType === 'remove' && 'Removing PIN...'}
                    </span>
                  ) : (
                    <>
                      {actionType === 'set' && 'Set PIN'}
                      {actionType === 'change' && 'Change PIN'}
                      {actionType === 'remove' && 'Remove PIN'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
