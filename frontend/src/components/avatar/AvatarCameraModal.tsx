'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

interface AvatarCameraModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => Promise<void> | void;
  isProcessing: boolean;
}

export default function AvatarCameraModal({
  open,
  title,
  onClose,
  onCapture,
  isProcessing,
}: AvatarCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncCameraState = async () => {
      if (!open) {
        stopCamera();
        if (!cancelled) {
          setReady(false);
          setError(null);
        }
        return;
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
      } catch {
        if (!cancelled) {
          setError('Camera access is blocked. Allow camera permissions and try again.');
        }
      }
    };

    void syncCameraState();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera is not ready yet. Wait a moment and retry.');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('Unable to capture image from camera.');
          return;
        }

        const file = new File([blob], `avatar-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await onCapture(file);
      },
      'image/jpeg',
      0.92
    );
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1E1B2E]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/30 bg-[#1E1B2E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#FFC299]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42]"
            aria-label="Close camera"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-[50vh] min-h-[260px] w-full object-cover"
            onLoadedData={() => setReady(true)}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!ready && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <Loader2 className="h-8 w-8 animate-spin text-white/90" />
            </div>
          ) : null}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-6 text-center text-sm font-semibold text-[#FFE6D5]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-[#1E1B2E] px-4 py-3">
          <button
            onClick={onClose}
            className="btn-outline px-4 py-2 text-xs"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={capture}
            disabled={!!error || !ready || isProcessing}
            className="btn-gradient inline-flex items-center gap-2 px-5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
