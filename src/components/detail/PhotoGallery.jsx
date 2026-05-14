import React, { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Camera, Plus, X, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

const SERVER_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001/api"
).replace(/\/api\/?$/, "");

const CONFIRM_WORD = "BORRAR";

const labelMap = {
  reporte_diario: "Reporte Diario",
  item_maestro: "Ítem Maestro",
  restriccion: "Restricción",
  otro: "Otro",
};

function getPhotoSrc(photo) {
  if (!photo) return "";
  if (photo.file_url?.startsWith("http")) return photo.file_url;
  if (photo.file_url?.startsWith("/uploads")) return `${SERVER_URL}${photo.file_url}`;
  if (photo.url?.startsWith("http")) return photo.url;
  if (photo.url?.startsWith("/uploads")) return `${SERVER_URL}${photo.url}`;
  return photo.file_url || photo.url || "";
}

// Modal de confirmación con dos pasos
function DeleteConfirmModal({ photo, onConfirm, onCancel, deleting }) {
  const [step, setStep] = useState(1); // 1: confirmar, 2: escribir palabra
  const [inputWord, setInputWord] = useState("");

  const handleFirstConfirm = () => setStep(2);

  const handleDelete = () => {
    if (inputWord.trim().toUpperCase() === CONFIRM_WORD) {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        {step === 1 ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold">¿Eliminar esta foto?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleFirstConfirm}
                disabled={deleting}
              >
                Borrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Confirmación final</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Escribe{" "}
              <span className="font-mono font-bold text-red-600">{CONFIRM_WORD}</span>{" "}
              para eliminar permanentemente esta foto.
            </p>
            <Input
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              placeholder={CONFIRM_WORD}
              className="mb-4 font-mono"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                onClick={handleDelete}
                disabled={
                  inputWord.trim().toUpperCase() !== CONFIRM_WORD || deleting
                }
              >
                {deleting ? "Borrando..." : "Eliminar definitivamente"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PhotoGallery({
  photos = [],
  masterItemId,
  onPhotoAdded,
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!masterItemId) {
      alert("No hay ítem asociado para guardar la foto.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const uploadData = await api.uploadPhoto(file);
      const fileUrl = uploadData?.file_url;

      if (!fileUrl) throw new Error("El servidor no devolvió la URL de archivo.");

      await api.post("/site-photos", {
        master_item_id: masterItemId,
        file_url: fileUrl,
        description: "",
        date: new Date().toISOString().split("T")[0],
        label: "item_maestro",
      });

      onPhotoAdded?.();
    } catch (error) {
      console.error("Error al subir foto:", error);
      alert(error.message || "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/site-photos/${photoToDelete.id}`);
      onPhotoAdded?.(); // refresca la galería
      setPhotoToDelete(null);
    } catch (error) {
      console.error("Error al eliminar foto:", error);
      alert(error.message || "No se pudo eliminar la foto.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
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
                {uploading ? "Subiendo..." : "Agregar Foto"}
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
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-lg border"
                >
                  {/* Imagen clickeable para preview */}
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setPreview(photo)}
                  >
                    <img
                      src={getPhotoSrc(photo)}
                      alt={photo.description || "Foto de obra"}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>

                  {/* Info en la parte inferior */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <Badge className="border-0 bg-white/20 text-[9px] text-white">
                      {labelMap[photo.label] || photo.label || "Otro"}
                    </Badge>
                    <p className="mt-0.5 text-[10px] text-white/80">
                      {photo.date || "Sin fecha"}
                    </p>
                  </div>

                  {/* Botón borrar — esquina inferior derecha */}
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoToDelete(photo);
                    }}
                    title="Eliminar foto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview modal */}
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
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={getPhotoSrc(preview)}
            alt={preview.description || "Vista previa"}
            className="max-h-[85vh] max-w-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {photoToDelete && (
        <DeleteConfirmModal
          photo={photoToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPhotoToDelete(null)}
          deleting={deleting}
        />
      )}
    </>
  );
}