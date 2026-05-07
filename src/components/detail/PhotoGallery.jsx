import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const labelMap = {
  reporte_diario: 'Reporte Diario',
  item_maestro: 'Ítem Maestro',
  restriccion: 'Restricción',
  otro: 'Otro',
};

export default function PhotoGallery({
  photos = [],
  masterItemId,
  onPhotoAdded,
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if(!masterItemId)  {
      alert('No hay item asociado para guardar la foto.')
      event.target.value ='';
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        throw new Error(text || `HTTP ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      const fileUrl =
        uploadData?.file_url ||
        uploadData?.url ||
        uploadData?.data?.file_url ||
        uploadData?.data?.url;

      if (!fileUrl) {
        throw new Error('El servidor no devolvió la URL de archivo.')
      }

      await api.post('/site-photos', {
        master_item_id: masterItemId,
        file_url: fileUrl,
        date: new Date().toISOString().split('T')[0],
        label: 'item_maestro',
      });

      onPhotoAdded?.();
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('No se pudo subir la foto.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Camera className="h-4 w-4 text-accent" />
            Registro Fotográfico
          </CardTitle>

          <div>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-3 w-3" />
              {uploading ? 'Subiendo...' : 'Agregar Foto'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {photos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin fotografías registradas
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="group relative overflow-hidden rounded-lg border text-left"
                onClick={() => setPreview(photo)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.description || 'Foto de obra'}
                  className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <Badge className="border-0 bg-white/20 text-[9px] text-white">
                    {labelMap[photo.label] || photo.label || 'Otro'}
                  </Badge>

                  <p className="mt-0.5 text-[10px] text-white/80">
                    {photo.date || 'Sin fecha'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {preview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreview(null)}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-white hover:bg-white/20"
              onClick={(event) => {
                event.stopPropagation();
                setPreview(null);
              }}
            >
              <X className="h-5 w-5" />
            </Button>

            <img
              src={preview.file_url}
              alt={preview.description || 'Vista previa'}
              className="max-h-[85vh] max-w-full rounded-lg"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}