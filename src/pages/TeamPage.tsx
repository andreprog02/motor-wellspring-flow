import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Loader2, Mail, Users, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export default function TeamPage() {
  const { profile, tenant, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');

  const isAdmin = profile?.role === 'admin';

  const members = useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; email: string; role: string; created_at: string }>;
    },
  });

  const invites = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('invites').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; email: string; status: string; created_at: string }>;
    },
  });

  const sendInvite = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await (supabase as any).from('invites').insert({
        tenant_id: profile!.tenant_id,
        email,
        invited_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Convite enviado', description: `Convite registrado para ${inviteEmail}` });
      setInviteEmail('');
      setInviteOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('invites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      setDeleteId(null);
    },
  });

  const updateTenantName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any).from('tenants').update({ name }).eq('id', profile!.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Nome atualizado' });
      setEditTenantOpen(false);
      // Force reload to update tenant in context
      window.location.reload();
    },
  });

  const pendingInvites = (invites.data ?? []).filter(i => i.status === 'pending');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie membros e convites da organização</p>
        </div>

        {/* Organization info */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{tenant?.name}</p>
                <p className="text-xs text-muted-foreground">{(members.data ?? []).length} membro(s)</p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => { setTenantName(tenant?.name ?? ''); setEditTenantOpen(true); }}>
                Editar nome
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Membros
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Convidar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members.data ?? []).map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name || '—'}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>
                        {m.role === 'admin' ? 'Admin' : 'Membro'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {isAdmin && pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Convites Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>{new Date(inv.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            <p className="text-xs text-muted-foreground">
              O usuário receberá acesso ao cadastrar-se com este email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={() => sendInvite.mutate(inviteEmail)} disabled={!inviteEmail || sendInvite.isPending}>
              {sendInvite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Name Dialog */}
      <Dialog open={editTenantOpen} onOpenChange={setEditTenantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nome da Organização</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nome</Label>
            <Input value={tenantName} onChange={e => setTenantName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenantOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateTenantName.mutate(tenantName)} disabled={!tenantName}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invite Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>O convite será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteInvite.mutate(deleteId)}>Sim, cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
