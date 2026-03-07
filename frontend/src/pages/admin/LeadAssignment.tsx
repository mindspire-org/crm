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
import { Users, UserPlus, Shield, Edit, Trash2, Eye, UserCheck } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  ownerId?: string;
  assignedTo?: string;
  createdAt: string;
  value?: number;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

export default function LeadAssignment() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'owner' | 'assigned'>('assigned');

  const canAssignLeads = hasCrmPermission(PERMISSIONS.LEADS_ASSIGN);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch leads
      const leadsRes = await fetch(`${API_BASE}/api/leads`, { headers });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      }

      // Fetch team members for assignment
      const employeesRes = await fetch(`${API_BASE}/api/employees`, { headers });
      if (employeesRes.ok) {
        const employees = await employeesRes.json();
        setTeamMembers(Array.isArray(employees) ? employees : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = async (leadId: string, memberId: string, type: 'owner' | 'assigned') => {
    try {
      const headers = getAuthHeaders();
      const updateData = type === 'owner' ? { ownerId: memberId } : { assignedTo: memberId };
      
      const response = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchData();
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error assigning lead:', error);
    }
  };

  const getTeamMemberName = (memberId: string) => {
    const member = teamMembers.find(m => m._id === memberId);
    return member ? member.name : 'Unknown';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!canAssignLeads) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to assign leads.
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
          <h1 className="text-3xl font-bold tracking-tight">Lead Assignment</h1>
          <p className="text-muted-foreground">Assign leads to team members and manage ownership</p>
        </div>
      </div>

      {/* Assignment Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => !l.ownerId && !l.assignedTo).length}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.ownerId || l.assignedTo).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Lead</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Owner</th>
                  <th className="text-left py-3 px-4">Assigned To</th>
                  <th className="text-left py-3 px-4">Value</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {lead.company} • {lead.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadgeColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {lead.ownerId ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getTeamMemberName(lead.ownerId).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {getTeamMemberName(lead.ownerId)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {lead.assignedTo ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getTeamMemberName(lead.assignedTo).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {getTeamMemberName(lead.assignedTo)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {lead.value ? `$${lead.value.toLocaleString()}` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Dialog open={dialogOpen && selectedLead?._id === lead._id} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedLead(lead);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Assign Lead</DialogTitle>
                            </DialogHeader>
                            {selectedLead && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Lead</label>
                                  <div className="mt-1 text-sm">
                                    {selectedLead.name} ({selectedLead.company})
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Assignment Type</label>
                                  <Select value={assignmentType} onValueChange={(value: 'owner' | 'assigned') => setAssignmentType(value)}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="owner">Owner</SelectItem>
                                      <SelectItem value="assigned">Assigned To</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Team Member</label>
                                  <Select onValueChange={(value) => {
                                    if (selectedLead) {
                                      handleAssignment(selectedLead._id, value, assignmentType);
                                    }
                                  }}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select team member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teamMembers.map((member) => (
                                        <SelectItem key={member._id} value={member._id}>
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-4 w-4">
                                              <AvatarFallback className="text-xs">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span>{member.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {member.role}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
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
