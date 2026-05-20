import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Shield, Plus, Trash2, Pencil, AlertCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/lib/PermissionsContext';
import { Navigate } from 'react-router-dom';
import { api } from '@/lib/api';
import FilterPill from '@/components/common/FilterPill';
import { useMemo } from 'react';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'viewer', label: 'Capataz' },
];

const roleBadgeClass = {
  admin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  supervisor: 'bg-amber-100 text-amber-700 border-amber-200',
  viewer: 'bg-blue-100 text-blue-700 border-blue-200',
};

const emptyForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'viewer',
  allowed_projects: [],
};

function parseAllowedProjects(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

export default function Users() {
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const { data: masterItems = [] } = useQuery({
    queryKey: ['masterItems'],
    queryFn: () => api.get('/master-items'),
  });

  const uniqueActivities = useMemo(() => {
    return [...new Set(masterItems.map(item => item.activity).filter(Boolean))];
  }, [masterItems]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (selectedRole !== 'all' && u.role !== selectedRole) return false;

      const allowed = parseAllowedProjects(u.allowed_projects);

      // Project filter
      if (selectedProject !== 'all') {
        if (u.role !== 'admin' && !allowed.includes(selectedProject)) return false;
      }

      // Activity filter
      if (selectedActivity !== 'all') {
        const projectsWithActivity = new Set(
          masterItems.filter(item => item.activity === selectedActivity).map(item => item.project)
        );
        if (u.role === 'admin') {
          if (!projectsWithActivity.size) return false;
        } else {
          const hasProjectWithActivity = allowed.some(proj => projectsWithActivity.has(proj));
          if (!hasProjectWithActivity) return false;
        }
      }

      return true;
    });
  }, [users, selectedRole, selectedProject, selectedActivity, masterItems]);

  const createUser = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => setFormError(err.message || 'Error al crear usuario.'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditUser(null);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err) => setFormError(err.message || 'Error al actualizar usuario.'),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => alert(err.message || 'Error al eliminar usuario.'),
  });

  const handleOpenCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setFormError('');
    setShowPassword(false);
    setShowForm(true);
  };

  const handleOpenEdit = (u) => {
    setEditUser(u);
    setForm({
      email: u.email || '',
      password: '',
      full_name: u.full_name || '',
      role: u.role || 'viewer',
      allowed_projects: parseAllowedProjects(u.allowed_projects),
    });
    setFormError('');
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      email: form.email,
      full_name: form.full_name,
      role: form.role,
      allowed_projects: form.role === 'admin' ? [] : (Array.isArray(form.allowed_projects) ? form.allowed_projects : []),
      ...(form.password ? { password: form.password } : {}),
    };

    if (editUser) {
      updateUser.mutate({ id: editUser.id, data: payload });
    } else {
      createUser.mutate(payload);
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Gestión de Usuarios
        </h1>

        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleOpenCreate}>
          <Plus className="w-3 h-3" />
          Agregar Usuario
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilterPill
          label="Obra"
          value={selectedProject}
          options={projects.map((p) => p.name)}
          onChange={setSelectedProject}
        />

        <FilterPill
          label="Rol"
          value={selectedRole}
          options={ROLES}
          onChange={setSelectedRole}
        />

      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Usuarios del Sistema
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredUsers.length} de {users.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs">Correo</TableHead>
                  <TableHead className="text-xs">Rol</TableHead>
                  <TableHead className="text-xs">Obras Permitidas</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      Sin usuarios registrados que coincidan con el filtro.
                    </TableCell>
                  </TableRow>
                )}

                {filteredUsers.map((u) => {
                  const allowed = parseAllowedProjects(u.allowed_projects);
                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30 text-xs">
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${roleBadgeClass[u.role] || roleBadgeClass.viewer}`}>
                          {ROLES.find((r) => r.value === u.role)?.label || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {u.role === 'admin' ? (
                          <Badge variant="outline" className="text-xs">Todas las obras</Badge>
                        ) : allowed.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {allowed.slice(0, 3).map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                            {allowed.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{allowed.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin acceso</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${u.active ? 'text-green-600 border-green-200' : 'text-gray-400'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(u)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() =>
                              window.confirm(`¿Eliminar a ${u.full_name}?`) &&
                              deleteUser.mutate(u.id)
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal crear / editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuario' : 'Agregar Usuario'}</DialogTitle>
            <DialogDescription>
              {editUser
                ? 'Actualiza los datos, rol y permisos del usuario.'
                : 'Crea un usuario directamente en la base de datos local.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <Label className="text-xs">Correo electrónico *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@dgc.cl"
                disabled={!!editUser}
              />
            </div>

            <div>
              <Label className="text-xs">
                Contraseña {editUser ? '(dejar vacío para no cambiar)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editUser ? '••••••••' : 'Mínimo 6 caracteres'}
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Rol *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, allowed_projects: [] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {form.role === 'viewer' && 'Acceso limitado a obras asignadas'}
                {form.role === 'supervisor' && 'Acceso a múltiples obras asignadas'}
                {form.role === 'admin' && 'Acceso completo a todo el sistema'}
              </p>
            </div>

            {form.role !== 'admin' && (
              <div>
                <Label className="text-xs">Obras Permitidas *</Label>
                <MultiSelect
                  options={projects.map((p) => ({ label: p.name, value: p.name }))}
                  selected={Array.isArray(form.allowed_projects) ? form.allowed_projects : []}
                  onChange={(selected) => setForm({ ...form, allowed_projects: selected })}
                  placeholder="Seleccionar obras"
                />
                {(!Array.isArray(form.allowed_projects) || form.allowed_projects.length === 0) && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Debes seleccionar al menos una obra
                  </p>
                )}
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{formError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormError(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.full_name ||
                !form.email ||
                (!editUser && !form.password) ||
                (form.role !== 'admin' && (!Array.isArray(form.allowed_projects) || form.allowed_projects.length === 0)) ||
                isPending
              }
            >
              {isPending ? 'Guardando...' : editUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}