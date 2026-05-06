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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/lib/PermissionsContext';
import { api } from '@/lib/api';

export default function Workers() {
  const queryClient = useQueryClient();
  const { hasAccessToProject, userRole } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');
  const [form, setForm] = useState({
    project: '',
    name: '',
    role: '',
    rut: '',
  });

  const { data: projectWorkers = [], isLoading } = useQuery({
    queryKey: ['projectWorkers'],
    queryFn: () => api.get('/project-workers'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => api.get('/daily-logs'),
  });

  const filteredProjects =
    userRole === 'admin'
      ? projects
      : projects.filter((p) => hasAccessToProject(p.name));

  const createWorker = useMutation({
    mutationFn: (data) => api.post('/project-workers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWorkers'] });
      setShowForm(false);
      setForm({ project: '', name: '', role: '', rut: '' });
    },
  });

  const deleteWorker = useMutation({
    mutationFn: (id) => api.delete(`/project-workers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWorkers'] });
    },
  });

  const handleFileImport = async () => {
    alert(
      'La importación Excel/CSV quedó desactivada temporalmente mientras se elimina Base44. Después la conectamos a tu backend local.'
    );
  };

  const workerProductivity = {};
  dailyLogs.forEach((log) => {
    log.crew_workers?.forEach((w) => {
      if (!w.name) return;
      if (!workerProductivity[w.name]) {
        workerProductivity[w.name] = { hours: 0, executed: 0, days: 0 };
      }
      workerProductivity[w.name].hours += w.hours || 0;
      workerProductivity[w.name].executed += w.executed || 0;
      workerProductivity[w.name].days += 1;
    });
  });

  const filteredWorkers =
    selectedProject === 'all'
      ? projectWorkers.filter((w) => hasAccessToProject(w.project))
      : projectWorkers.filter(
          (w) =>
            w.project === selectedProject && hasAccessToProject(w.project)
        );

  const projectNames = [
    ...new Set(projectWorkers.map((w) => w.project).filter(Boolean)),
  ];
  const allProjects = [
    ...new Set([...filteredProjects.map((p) => p.name), ...projectNames]),
  ];

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
          <Users className="w-5 h-5 text-accent" />
          Personal y Productividad
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las obras</SelectItem>
              {allProjects.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleFileImport}
          >
            <FileSpreadsheet className="w-3 h-3" />
            Importar Excel/CSV
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              setForm({
                project: selectedProject !== 'all' ? selectedProject : '',
                name: '',
                role: '',
                rut: '',
              });
              setShowForm(true);
            }}
          >
            <Plus className="w-3 h-3" />
            Agregar Persona
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 -mt-2">
        <FileSpreadsheet className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          La importación masiva quedó temporalmente desactivada mientras se elimina Base44.
          Por ahora puedes registrar personal manualmente. Luego conectamos esta opción a tu backend local.
        </p>
      </div>

      <Tabs defaultValue="roster">
        <TabsList className="h-8">
          <TabsTrigger value="roster" className="text-xs">
            Padrón de Personal
          </TabsTrigger>
          <TabsTrigger value="productivity" className="text-xs">
            Productividad Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Personal registrado{' '}
                {selectedProject !== 'all' ? `— ${selectedProject}` : ''}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredWorkers.length})
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nombre completo</TableHead>
                      <TableHead className="text-xs">Cargo</TableHead>
                      <TableHead className="text-xs">RUT</TableHead>
                      <TableHead className="text-xs">Obra</TableHead>
                      <TableHead className="text-xs text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredWorkers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-sm text-muted-foreground py-12"
                        >
                          Sin personal registrado. Agrega personal manualmente.
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredWorkers.map((w) => (
                      <TableRow key={w.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>{w.role || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {w.rut || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {w.project}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() =>
                              window.confirm(`¿Eliminar a ${w.name}?`) &&
                              deleteWorker.mutate(w.id)
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Productividad Individual (desde reportes diarios)
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs text-right">Jornadas</TableHead>
                      <TableHead className="text-xs text-right">Horas Total</TableHead>
                      <TableHead className="text-xs text-right">Ejecutado Total</TableHead>
                      <TableHead className="text-xs text-right">
                        Rendimiento (ejec/h)
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {Object.keys(workerProductivity).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-sm text-muted-foreground py-12"
                        >
                          Sin datos. Registra personal en los reportes diarios para ver productividad.
                        </TableCell>
                      </TableRow>
                    )}

                    {Object.entries(workerProductivity)
                      .sort((a, b) => b[1].hours - a[1].hours)
                      .map(([name, p]) => {
                        const rend =
                          p.hours > 0 ? (p.executed / p.hours).toFixed(2) : '—';

                        return (
                          <TableRow key={name} className="hover:bg-muted/30 text-xs">
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell className="text-right">{p.days}</TableCell>
                            <TableCell className="text-right">{p.hours}h</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {p.executed}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {rend}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Persona al Padrón</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Obra *</Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm({ ...form, project: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Nombre completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juan Pérez González"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Ej: Electricista"
                />
              </div>

              <div>
                <Label className="text-xs">RUT (opcional)</Label>
                <Input
                  value={form.rut}
                  onChange={(e) => setForm({ ...form, rut: e.target.value })}
                  placeholder="12.345.678-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createWorker.mutate({ ...form, active: true })}
              disabled={!form.project || !form.name || createWorker.isPending}
            >
              {createWorker.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}