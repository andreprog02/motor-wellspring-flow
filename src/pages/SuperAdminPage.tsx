import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Building2, Users, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TenantUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface TenantAccount {
  tenant_id: string;
  tenant_name: string;
  tenant_created_at: string;
  users: TenantUser[] | null;
}

export default function SuperAdminPage() {
  const { isSuperAdmin } = useAuth();
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['super-admin-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_get_all_accounts');
      if (error) throw error;
      return (data as unknown as TenantAccount[]) || [];
    },
  });

  const toggleTenant = (id: string) => {
    setExpandedTenants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalUsers = accounts?.reduce((sum, a) => sum + (a.users?.length || 0), 0) || 0;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Super Admin</h1>
        <p className="text-muted-foreground text-sm">Visão geral de todas as contas cadastradas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{accounts?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Organizações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {accounts?.map(account => {
            const isExpanded = expandedTenants.has(account.tenant_id);
            return (
              <Card key={account.tenant_id}>
                <CardHeader
                  className="cursor-pointer py-4"
                  onClick={() => toggleTenant(account.tenant_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <CardTitle className="text-base">{account.tenant_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Criado em {formatDate(account.tenant_created_at)} · {account.users?.length || 0} usuário(s)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Papel</TableHead>
                          <TableHead>Cadastro</TableHead>
                          <TableHead>Último Acesso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {account.users?.map(user => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Admin' : 'Membro'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(user.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className={cn("text-sm", user.last_sign_in_at ? "text-foreground" : "text-muted-foreground")}>
                                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca acessou'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum usuário</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
