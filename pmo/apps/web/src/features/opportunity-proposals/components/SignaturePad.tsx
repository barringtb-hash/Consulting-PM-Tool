/**
 * Signature Pad Component
 *
 * Canvas-based signature capture for contract signing.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check } from 'lucide-react';
import { Button } from '../../../ui/Button';

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSignature: (dataUrl: string) => void;
  onClear: () => void;
}

export function SignaturePad({
  width = 400,
  height = 150,
  onSignature,
  onClear,
}: SignaturePadProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPosition, setLastPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const getCoordinates = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const startDrawing = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      const coords = getCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      setLastPosition(coords);
    },
    [getCoordinates],
  );

  const draw = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (!isDrawing || !lastPosition) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoordinates(e);
      if (!coords) return;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(lastPosition.x, lastPosition.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      setLastPosition(coords);
      setHasSignature(true);
    },
    [isDrawing, lastPosition, getCoordinates],
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        onSignature(dataUrl);
      }
    }
    setIsDrawing(false);
    setLastPosition(null);
  }, [isDrawing, hasSignature, onSignature]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and fill with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    setHasSignature(false);
    onClear();
  }, [width, height, onClear]);

  // Prevent scrolling while drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [isDrawing]);

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-neutral-200 dark:border-neutral-600 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Signature line */}
        <div className="absolute bottom-8 left-4 right-4 border-b border-neutral-300 dark:border-neutral-500" />
        <div className="absolute bottom-2 left-4 text-xs text-neutral-400 dark:text-neutral-500">
          Sign above this line
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature}
        >
          <Eraser className="w-4 h-4 mr-1" />
          Clear
        </Button>

        {hasSignature && (
          <div className="flex items-center gap-1 text-sm text-success-600 dark:text-success-400">
            <Check className="w-4 h-4" />
            Signature captured
          </div>
        )}
      </div>
    </div>
  );
}

export default SignaturePad;
