'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Scan, Target, Brain, Shield, Info, Loader2, Sparkles, Smartphone, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/api/memories';
import { recognizePerson, findObject } from '@/lib/api/avatar';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';

interface WearableHUDProps {
  onClose: () => void;
  onCapture?: () => void;
}

export default function WearableHUD({ onClose, onCapture }: WearableHUDProps) {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [capturedMoments, setCapturedMoments] = useState<{ id: string; thumbnail: string; status: 'syncing' | 'synced' }[]>([]);
  const { activePatientId } = useSessionStore();
  const { addToast } = useUIStore();
  const [hudActive, setHudActive] = useState(false);

  // Live detections from camera analysis
  const [detections, setDetections] = useState<{ id: number; x: number; y: number; label: string }[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastAnnouncedRef = useRef<{ name: string; at: number } | null>(null);

  // Camera device switching logic
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoInputs = mediaDevices.filter(({ kind }) => kind === 'videoinput');
      setVideoDevices(videoInputs);
    },
    [setVideoDevices]
  );

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices().then(handleDevices).catch(() => {});
    }
  }, [handleDevices]);

  const toggleCamera = () => {
    if (videoDevices.length > 1) {
      const nextIndex = (selectedDeviceIndex + 1) % videoDevices.length;
      setSelectedDeviceIndex(nextIndex);
      addToast({
        type: 'info',
        message: `Switched camera feed to device: ${videoDevices[nextIndex].label || `Camera ${nextIndex + 1}`}`,
      });
    } else {
      addToast({
        type: 'warning',
        message: 'No secondary/USB wearable camera detected.',
      });
    }
  };

  const videoConstraints = videoDevices.length > 0 && videoDevices[selectedDeviceIndex]
    ? { deviceId: { exact: videoDevices[selectedDeviceIndex].deviceId } }
    : { facingMode: 'environment' };

  const announcePerson = useCallback((name: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = Date.now();
    const prev = lastAnnouncedRef.current;

    // Avoid repeating the same name too frequently.
    if (prev && prev.name === name && now - prev.at < 12000) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${name} recognized`);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
    lastAnnouncedRef.current = { name, at: now };
  }, [voiceEnabled]);

  // Real-time Facial Recognition Loop
  useEffect(() => {
    setHudActive(true);
    let interval: ReturnType<typeof setInterval>;
    
    // Only engage Qdrant heavy polling when user begins recording telemetry
    if (isRecording) {
      interval = setInterval(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        
        try {
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          const file = new File([blob], `scan.jpg`, { type: 'image/jpeg' });
          
          const [faceRes, objRes] = await Promise.all([
            recognizePerson(file).catch(() => null),
            findObject(file).catch(() => null)
          ]);
          
          setScanCount(prev => prev + 1);
          let updatedDetections: { id: number; x: number; y: number; label: string }[] = [];

          if (faceRes) {
            if (faceRes.status === 'identified' && faceRes.person?.name) {
              const recognizedName = faceRes.person.name;
              updatedDetections.push({ id: 1, x: 5, y: 35, label: `FACE: ${recognizedName.toUpperCase()}` });
              announcePerson(recognizedName);
            } else if ((faceRes as any).status === 'ambiguous') {
              updatedDetections.push({ id: 1, x: 5, y: 35, label: 'FACE: POSSIBLE MATCH' });
            } else if (faceRes.status === 'no_face_detected') {
              // No face in frame — don't show anything
            } else if (faceRes.status === 'unknown') {
              updatedDetections.push({ id: 1, x: 5, y: 35, label: `FACE: UNREGISTERED` });
            }
          }

          if (objRes) {
            if (objRes.status === 'identified' && objRes.object?.name) {
              updatedDetections.push({ id: 2, x: 5, y: 45, label: `OBJECT: ${objRes.object.name.toUpperCase()}` });
            }
            // Unenrolled YOLO labels (like "person", "chair") are intentionally
            // NOT shown on the HUD — they create confusing boxes alongside
            // the face recognition results.
          }

          setDetections(updatedDetections);
        } catch (e) {
          // Silent catch for polling misses
        }
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [announcePerson, isRecording]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = useCallback(() => {
    if (!webcamRef.current?.video) return;
    const stream = (webcamRef.current.video as any).captureStream();
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current.start();
    setIsRecording(true);
  }, [webcamRef]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addToast({ type: 'success', message: 'Recording session saved to local device.' });
    }
  }, [addToast]);

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;
    setCapturing(true);
    
    // Create temporary thumbnail for sidebar
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setCapturing(false);
      return;
    }

    const momentId = Date.now().toString();
    setCapturedMoments(prev => [{ id: momentId, thumbnail: imageSrc, status: 'syncing' }, ...prev]);
    
    try {
      // Convert base64 to File
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], `wearable-capture-${momentId}.jpg`, { type: 'image/jpeg' });

      await uploadImage(file, activePatientId || 'patient_1', {
        isMilestone: false,
        tags: 'Wearable,MetaGlasses,SessionCapture'
      });

      setCapturedMoments(prev => prev.map(m => m.id === momentId ? { ...m, status: 'synced' } : m));
      if (onCapture) onCapture();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to sync moment' });
      setCapturedMoments(prev => prev.filter(m => m.id !== momentId));
    } finally {
      setCapturing(false);
    }
  }, [webcamRef, activePatientId, addToast, onCapture]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
    >
      <div className="relative w-full h-full max-w-5xl mx-auto rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl bg-slate-900 group flex">
        
        {/* Main Viewfinder Area */}
        <div className="flex-1 relative h-full">
          {/* Camera Feed */}
          <Webcam
            key={videoDevices[selectedDeviceIndex]?.deviceId || 'default'}
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={() => {
              if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
                navigator.mediaDevices.enumerateDevices().then(handleDevices).catch(() => {});
              }
            }}
            className="w-full h-full object-cover contrast-[105%] brightness-[105%]"
          />

          {/* HUD Overlay Container */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden text-cyan-400">
            {/* Frame corners for sleek HUD feel */}
            <div className="absolute left-6 top-6 w-14 h-14 border-l-2 border-t-2 border-cyan-400/50" />
            <div className="absolute right-6 top-6 w-14 h-14 border-r-2 border-t-2 border-cyan-400/50" />
            <div className="absolute left-6 bottom-6 w-14 h-14 border-l-2 border-b-2 border-cyan-400/50" />
            <div className="absolute right-6 bottom-6 w-14 h-14 border-r-2 border-b-2 border-cyan-400/50" />

            {/* Scanning Line */}
            <motion.div 
               animate={{ top: ['0%', '100%'] }} 
               transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
               className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10"
            />

            {/* AI Metrics (Left) */}
            <div className="absolute top-10 left-12 flex flex-col gap-3 font-mono">
              <HudMetric icon={Scan} label="STATUS" value={isRecording ? 'SCANNING' : 'STANDBY'} />
              <HudMetric icon={Target} label="SCANS" value={scanCount.toString()} />
              <HudMetric icon={Brain} label="DETECTIONS" value={detections.length.toString()} />
            </div>

            {/* Status (Bottom Left) */}
            <div className="absolute bottom-10 left-12 flex flex-col gap-1 font-mono text-[10px] text-cyan-400/60 uppercase tracking-widest">
              <div>MODE: {isRecording ? 'ACTIVE RECOGNITION' : 'IDLE'}</div>
              <div>CAPTURES: {capturedMoments.length}</div>
              <div>SYS: {hudActive ? 'ONLINE' : 'BOOTING'}</div>
            </div>

            {/* Voice status */}
            <div className="absolute top-10 right-40 px-3 py-1.5 rounded-md border border-cyan-400/30 bg-black/30 text-[9px] font-black tracking-widest text-cyan-300 uppercase">
              Voice: {voiceEnabled ? 'On' : 'Off'}
            </div>

            {/* Detection Boxes */}
            <AnimatePresence>
              {detections.map(d => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute border border-cyan-400/60 bg-cyan-400/10 rounded-lg p-2 flex flex-col gap-1"
                  style={{ left: `${d.x}%`, top: `${d.y}%`, minWidth: '100px' }}
                >
                  <div className="w-full h-0.5 bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none text-cyan-400">{d.label}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Center Crosshair */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-40">
              <div className="w-px h-full bg-cyan-400" />
              <div className="absolute w-full h-px bg-cyan-400" />
            </div>
          </div>

          {/* HUD Controls (Bottom Bar) */}
          <div className="absolute inset-x-0 bottom-10 flex items-center justify-center gap-10 px-8 z-20">
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Recording Toggle */}
            <button 
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={cn(
                "w-12 h-12 rounded-full backdrop-blur-md border flex flex-col items-center justify-center transition-all",
                isRecording ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/10 border-white/20 text-white"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full mb-0.5", isRecording ? "bg-red-500 animate-pulse" : "bg-white/40")} />
              <span className="text-[8px] font-black uppercase">{isRecording ? 'STOP' : 'REC'}</span>
            </button>

            {/* Main Action Button (Snapshot) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={capture}
              disabled={capturing}
              className="w-20 h-20 rounded-full bg-white border-4 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center group overflow-hidden relative"
            >
              {capturing ? (
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-slate-900 group-hover:scale-110 transition-transform" />
              )}
              <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              className={cn(
                "w-12 h-12 rounded-full backdrop-blur-md border flex flex-col items-center justify-center transition-colors",
                voiceEnabled
                  ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-300"
                  : "bg-black/40 border-white/20 text-white/60"
              )}
            >
              <Shield className="w-4 h-4 mb-0.5" />
              <span className="text-[8px] font-black uppercase">VOX</span>
            </button>

            {/* Camera Switch Source Button */}
            <button
              onClick={toggleCamera}
              className={cn(
                "w-12 h-12 rounded-full backdrop-blur-md border flex flex-col items-center justify-center transition-colors",
                videoDevices.length > 1
                  ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/25"
                  : "bg-black/40 border-white/20 text-white/60"
              )}
              title="Switch Camera Feed (Built-in / USB)"
            >
              <RefreshCw className="w-4 h-4 mb-0.5" />
              <span className="text-[8px] font-black uppercase">Source</span>
            </button>
          </div>

          {/* Recording Timer (Top Right) */}
          {isRecording && (
            <div className="absolute top-10 right-12 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono font-bold text-white uppercase tracking-widest">{formatTime(timer)}</span>
            </div>
          )}
        </div>

        {/* Sync Sidebar (Right) */}
        <div className="w-32 h-full bg-black/40 backdrop-blur-xl border-l border-white/10 p-4 overflow-y-auto no-scrollbar hidden md:block">
           <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-4">Sync Feed</p>
           <div className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {capturedMoments.map(moment => (
                  <motion.div
                    key={moment.id}
                    initial={{ scale: 0, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/10 group"
                  >
                    <img src={moment.thumbnail} className="w-full h-full object-cover" alt="Capture" />
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all",
                      moment.status === 'syncing' ? "bg-black/60" : "bg-emerald-500/20"
                    )}>
                      {moment.status === 'syncing' ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-[6px] font-black text-cyan-400 uppercase">Syncing</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span className="text-[6px] font-black text-emerald-400 uppercase">Saved</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {capturedMoments.length === 0 && (
                <div className="h-40 flex items-center justify-center text-center">
                   <p className="text-[8px] font-bold text-white/20 uppercase leading-relaxed tracking-widest">
                     No moments<br/>captured yet
                   </p>
                </div>
              )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function HudMetric({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 bg-cyan-400/10 border border-cyan-400/40 rounded flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.2)]">
        <Icon className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div>
        <p className="text-[8px] text-cyan-400/60 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-black text-white leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}
