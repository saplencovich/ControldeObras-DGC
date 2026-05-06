import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check } from 'lucide-react';

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
    }
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) {
      alert('Por favor dibuja tu firma.');
      return;
    }
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="w-full h-32 border border-border rounded-lg bg-white cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas} className="gap-1">
          <RotateCcw className="w-3 h-3" /> Limpiar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={isEmpty} className="gap-1">
          <Check className="w-3 h-3" /> Guardar firma
        </Button>
      </div>
    </div>
  );
}