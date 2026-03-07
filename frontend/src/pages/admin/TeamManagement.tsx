import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthHeaders } from '@/lib/api/auth';
import { API_BASE } from '@/lib/api/base';
import { getCurrentUser, hasCrmPermission, PERMISSIONS } from '@/utils/roleAccess';
import { Users, UserPlus, Shield, Edit, Trash2, Eye } from 'lucide-react';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  department?: string;
  createdAt: string;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  access: {
    dataScope: 'assigned' | 'team' | 'all';
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSeePrices: boolean;
    canSeeFinance: boolean;
  };
}

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const canManageUsers = hasCrmPermission(PERMISSIONS.USERS_MANAGE);
  const canManageRoles = hasCrmPermission(PERMISSIONS.ROLES_MANAGE);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch employees (team members)
      const employeesRes = await fetch(`${API_BASE}/api/employees`, { headers });
      if (employeesRes.ok) {
        const employees = await employeesRes.json();
        setTeamMembers(Array.isArray(employees) ? employees : []);
      }

      // Fetch users with roles
      const usersRes = await fetch(`${API_BASE}/api/users`, { headers });
      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await fetchTeamData();
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'marketing_manager': return 'bg-blue-100 text-blue-800';
      case 'marketer': return 'bg-green-100 text-green-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      case 'sales_manager': return 'bg-purple-100 text-purple-800';
      case 'finance': return 'bg-yellow-100 text-yellow-800';
      case 'finance_manager': return 'bg-yellow-100 text-yellow-800';
      case 'staff': return 'bg-gray-100 text-gray-800';
      case 'developer': return 'bg-sky-100 text-sky-800';
            default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to manage team members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Team Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marketing Team</p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => 
                    m.department?.toLowerCase() === 'marketing'
                  ).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadgeColor(member.role || 'staff')}>
                        {member.role || 'Staff'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {member.department || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Users with Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Data Scope</th>
                  <th className="text-left py-3 px-4">Permissions</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm capitalize">
                        {user.access?.dataScope || 'assigned'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.slice(0, 3).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {user.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.permissions.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Dialog open={dialogOpen && selectedUser?._id === user._id} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditMode(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit User Role</DialogTitle>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">User</label>
                                <div className="mt-1 text-sm">{selectedUser.name} ({selectedUser.email})</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Role</label>
                                <Select 
                                  value={selectedUser.role} 
                                  onValueChange={(value) => {
                                    setSelectedUser(prev => prev ? { ...prev, role: value } : null);
                                  }}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                                    <SelectItem value="marketer">Marketer</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="finance">Finance</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    if (selectedUser) {
                                      handleRoleUpdate(selectedUser._id, selectedUser.role);
                                    }
                                  }}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
