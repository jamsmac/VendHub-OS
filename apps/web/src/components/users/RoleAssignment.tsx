'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
}

interface RoleAssignmentProps {
  userId: string;
}

export function RoleAssignment({ userId }: RoleAssignmentProps) {
  // Fetch all roles
  const { data: allRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/rbac/roles').then((res) => res.data.data || res.data),
  });

  // Fetch user's current roles
  const { data: userRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () =>
      api.get(`/rbac/users/${userId}/roles`).then((res) => res.data.data || res.data),
  });

  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (roleId: string) => api.post(`/rbac/users/${userId}/roles`, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Роль назначена');
    },
    onError: () => toast.error('Ошибка назначения роли'),
  });

  const removeMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/rbac/users/${userId}/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Роль удалена');
    },
    onError: () => toast.error('Ошибка удаления роли'),
  });

  const userRoleIds = (userRoles || []).map((r: Role) => r.id);
  const availableRoles = (allRoles || []).filter((r: Role) => !userRoleIds.includes(r.id));

  if (rolesLoading || userRolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          RBAC Роли
        </CardTitle>
        <CardDescription>Управление ролями пользователя</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Roles */}
        <div>
          <p className="text-sm font-medium mb-2">Назначенные роли</p>
          {(userRoles || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет назначенных ролей</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(userRoles || []).map((role: Role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>{role.name}</span>
                  <button
                    onClick={() => removeMutation.mutate(role.id)}
                    className="ml-1 hover:text-destructive"
                    disabled={removeMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Roles to Assign */}
        {availableRoles.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Доступные роли</p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role: Role) => (
                <Button
                  key={role.id}
                  variant="outline"
                  size="sm"
                  onClick={() => assignMutation.mutate(role.id)}
                  disabled={assignMutation.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {role.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
