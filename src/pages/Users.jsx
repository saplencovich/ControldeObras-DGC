import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Users as UsersIcon, Plus, Pencil, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function Users() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'viewer',
    allowed_projects: [],
    password: '',
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const saveUser = useMutation({
    mutationFn: async (data) => {
      const payload = {
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        allowed_projects: Array.isArray(data.allowed_projects)
          ? data.allowed_projects
          : [],
      };

      if (editingUser) {
        return api.put(`/users/${editingUser.id}`, payload);
      }

      return api.post('/users', {
        ...payload,
        password: data.password || '123456',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditingUser(null);
      setForm({
        email: '',
        full_name: '',
        role: 'viewer',
        allowed_projects: [],
        password: '',
      });
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
    },
    onError: (err) => {
      toast.error('Error: ' + err.message);
    },
  });

  const handleEdit = (user) => {
    const allowedProjects = Array.isArray(user.allowed_projects)
      ? user.allowed_projects
      : typeof user.allowed_projects === 'string' && user.allowed_projects.trim()
        ? [user.allowed_projects]
        : [];

    setEditingUser(user);
    setForm({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role || 'viewer',
      allowed_projects: allowedProjects,
      password: '',
    });
    setShowForm(true);
  };

  const roleLabels = {
    viewer: { label: 'Viewer', color: 'bg-blue-100 text-blue-700' },
    supervisor: { label: 'Supervisor', color: 'bg-amber-100 text-amber-700' },
    admin: { label: 'Admin', color: 'bg-emerald-100 text-emerald-700' },
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Solo los administradores pueden gestionar usuarios.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-accent" />
          Gestión de Usuarios
        </h1>

        <Button
          onClick={() => {
            setForm({
              email: '',
              full_name: '',
              role: 'viewer',
              allowed_projects: [],
              password: '',
            });
            setEditingUser(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Usuarios del Sistema
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({users.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Nombre</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Rol</TableHead>
                <TableHead className="text-xs">Obras Permitidas</TableHead>
                <TableHead className="text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {user.full_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        roleLabels[user.role]?.color || roleLabels.viewer.color
                      }
                    >
                      {roleLabels[user.role]?.label || 'Viewer'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-xs truncate">
                    {user.role === 'admin' ? (
                      <Badge variant="outline" className="text-xs">
                        Todas las obras
                      </Badge>
                    ) : (() => {
                      const allowed = Array.isArray(user.allowed_projects)
                        ? user.allowed_projects
                        : typeof user.allowed_projects === 'string' &&
                            user.allowed_projects.trim()
                          ? [user.allowed_projects]
                          : [];

                      return allowed.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {allowed.slice(0, 3).map((p) => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {p}
                            </Badge>
                          ))}
                          {allowed.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{allowed.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin acceso</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Actualiza los datos, rol y permisos del usuario.'
                : 'Crea un usuario directamente en la base de datos local.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="usuario@empresa.com"
                disabled={!!editingUser}
              />
            </div>

            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Nombre completo"
              />
            </div>

            {!editingUser && (
              <div>
                <Label className="text-xs">Contraseña *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Mínimo temporal"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Rol *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (1 obra)</SelectItem>
                  <SelectItem value="supervisor">
                    Supervisor (múltiples obras)
                  </SelectItem>
                  <SelectItem value="admin">Admin (acceso total)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {form.role === 'viewer' && 'Acceso limitado a una sola obra'}
                {form.role === 'supervisor' &&
                  'Acceso a múltiples obras asignadas'}
                {form.role === 'admin' &&
                  'Acceso completo a todo el sistema'}
              </p>
            </div>

            {form.role !== 'admin' && (
              <div>
                <Label className="text-xs">Obras Permitidas *</Label>
                <MultiSelect
                  options={projects.map((p) => ({
                    label: p.name,
                    value: p.name,
                  }))}
                  selected={
                    Array.isArray(form.allowed_projects)
                      ? form.allowed_projects
                      : []
                  }
                  onChange={(selected) =>
                    setForm({ ...form, allowed_projects: selected })
                  }
                  placeholder="Seleccionar obras"
                />
                {(!Array.isArray(form.allowed_projects) ||
                  form.allowed_projects.length === 0) && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Debes seleccionar al menos una obra
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveUser.mutate(form)}
              disabled={
                !form.email ||
                !form.full_name ||
                (!editingUser && !form.password) ||
                (form.role !== 'admin' &&
                  (!Array.isArray(form.allowed_projects) ||
                    form.allowed_projects.length === 0)) ||
                saveUser.isPending
              }
            >
              {saveUser.isPending
                ? 'Guardando...'
                : editingUser
                  ? 'Actualizar'
                  : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}