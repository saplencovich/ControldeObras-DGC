import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { exportReportCSV } from '@/utils/exportReport';
import { exportReportPDF } from '@/utils/exportPDF';
import { usePermissions } from '@/lib/PermissionsContext';

const TOWERS = ['Torre A', 'Torre B', 'Torre C'];
const FLOORS = ['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Piso 5'];
const ACTIVITIES = ['Artefactos', 'Luminarias', 'Canalización', 'Cableado', 'Tableros'];

const RELEASE_STATUSES = [
  { value: 'liberado', label: 'Liberado' },
  { value: 'no_liberado', label: 'No liberado' },
  { value: 'parcial', label: 'Parcial' },
];

export default function FilterBar({
  filters,
  setFilters,
  projects,
  masterItems = [],
  dailyLogs = [],
  sitePhotos = [],
  onNewProject,
  onNewItem,
  onRefresh,
}) {
  const { canCreateProjects } = usePermissions();

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? '' : value,
    }));
  };

  const updateSearch = (event) => {
    setFilters((prev) => ({
      ...prev,
      search: event.target.value,
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.project || 'all'}
          onValueChange={(value) => updateFilter('project', value)}
        >
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder="Obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las obras</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.name}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tower || 'all'}
          onValueChange={(value) => updateFilter('tower', value)}
        >
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Torre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {TOWERS.map((tower) => (
              <SelectItem key={tower} value={tower}>
                {tower}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.floor || 'all'}
          onValueChange={(value) => updateFilter('floor', value)}
        >
          <SelectTrigger className="h-9 w-[120px] text-xs">
            <SelectValue placeholder="Piso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {FLOORS.map((floor) => (
              <SelectItem key={floor} value={floor}>
                {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.activity || 'all'}
          onValueChange={(value) => updateFilter('activity', value)}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Actividad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {ACTIVITIES.map((activity) => (
              <SelectItem key={activity} value={activity}>
                {activity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.release || 'all'}
          onValueChange={(value) => updateFilter('release', value)}
        >
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Estado liberación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {RELEASE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sector, responsable, restricción..."
            className="h-9 pl-8 text-xs"
            value={filters.search || ''}
            onChange={updateSearch}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary text-xs"
          onClick={onNewProject}
          disabled={!canCreateProjects}
        >
          <Plus className="h-3 w-3" />
          Nueva Obra
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary text-xs"
          onClick={onNewItem}
        >
          <Plus className="h-3 w-3" />
          Nuevo Ítem
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => exportReportPDF(masterItems, dailyLogs, sitePhotos, [])}
        >
          <Download className="h-3 w-3" />
          Exportar PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => exportReportCSV(masterItems, dailyLogs)}
        >
          <FileSpreadsheet className="h-3 w-3" />
          Exportar CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled
        >
          <Upload className="h-3 w-3" />
          Importar CSV
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3 w-3" />
          Recargar
        </Button>
      </div>
    </div>
  );
}