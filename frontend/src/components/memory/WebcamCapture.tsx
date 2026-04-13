'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function WebcamCapture({ onCapture, onCancel }: { onCapture: (f: File) => void, onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Camera permission denied or device not found.');
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const takeSnap = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        }
      }, 'image/jpeg');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="relative w-full h-[280px] bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-inner">
      {error && <p className="text-red-400 text-xs font-bold px-6 text-center">{error}</p>}
      {!error && (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setLoading(false)}
        />
      )}
      {loading && !error && <div className="absolute"><Loader2 className="w-8 h-8 text-white/50 animate-spin" /></div>}
      
      {!loading && !error && (
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 z-10">
          <button onClick={onCancel} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white ring-1 ring-white/20 hover:bg-black/60 transition-colors flex items-center justify-center pointer-events-auto">
            <X className="w-5 h-5" />
          </button>
          <button onClick={takeSnap} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform group pointer-events-auto ring-2 ring-white">
            <div className="w-10 h-10 rounded-full bg-white group-hover:bg-slate-100 transition-colors flex items-center justify-center shadow-sm">
              <Camera className="w-4 h-4 text-indigo-600" />
            </div>
          </button>
        </div>
      )}
    </motion.div>
  );
}
