import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type UserRole = {
  id: string;
  user_id: string;
  role: 'visitor' | 'dealer' | 'editor' | 'admin';
  email: string;
  full_name: string;
};

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRole | null>(null);

  useEffect(() => {
    if (currentRole === 'admin') {
      fetchUsers();
    }
  }, [currentRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles for each user
      const userIds = rolesData?.map(r => r.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const merged = rolesData?.map(role => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        return {
          ...role,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
        };
      }) || [];

      setUsers(merged);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: '載入失敗',
        description: '無法載入用戶資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, currentRoleValue: string, newRole: string) => {
    try {
      // Delete old role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', currentRoleValue as any);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any } as any);

      if (insertError) throw insertError;

      toast({
        title: '更新成功',
        description: '用戶角色已更新',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: '更新失敗',
        description: '無法更新用戶角色',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast({
        title: '刪除成功',
        description: '用戶角色已刪除',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: '刪除失敗',
        description: '無法刪除用戶角色',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      case 'dealer': return 'outline';
      default: return 'outline';
    }
  };

  if (currentRole !== 'admin') {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle>權限不足</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">您沒有權限訪問此頁面。</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>用戶角色管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋用戶..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="所有角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">所有角色</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>電子郵件</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell>{userRole.full_name || '未設定'}</TableCell>
                    <TableCell>{userRole.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(userRole.role)}>
                          {userRole.role}
                        </Badge>
                        {userRole.user_id !== currentUser?.id && (
                          <Select
                            value={userRole.role}
                            onValueChange={(newRole) => handleRoleChange(userRole.user_id, userRole.role, newRole)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="visitor">Visitor</SelectItem>
                              <SelectItem value="dealer">Dealer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {userRole.user_id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(userRole);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">沒有找到用戶</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此用戶角色嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將移除 {userToDelete?.email} 的 {userToDelete?.role} 角色。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
