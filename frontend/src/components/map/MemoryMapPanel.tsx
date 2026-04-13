'use client';

import React, { useEffect, useState } from 'react';
import type { Memory } from '@/lib/types';

interface MemoryMapPanelProps {
  memories: Memory[];
  selectedType: string;
}

export default function MemoryMapPanel({ memories, selectedType }: MemoryMapPanelProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const filtered = selectedType === 'all' ? memories : memories.filter((m) => m.type === selectedType);
  const withLoc = filtered.filter((m) => m.location && typeof m.location.lat === 'number' && typeof m.location.lon === 'number');

  if (!isClient) {
    return <div className="w-full h-[500px] rounded-2xl skeleton" />;
  }

  return <MapInner memories={withLoc} />;
}

function MapInner({ memories }: { memories: Memory[] }) {
  const [Leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
      setLeaflet({ ...rl, L: L.default });
    });
  }, []);

  if (!Leaflet) return <div className="w-full h-[500px] rounded-2xl skeleton" />;

  const { MapContainer, TileLayer, Marker, Popup, Tooltip } = Leaflet;
  
  // Default center (Mumbai) if no valid coordinates found
  const center = (memories.length > 0 && memories[0].location)
    ? [memories[0].location.lat, memories[0].location.lon] as [number, number]
    : [19.076, 72.877] as [number, number];

  return (
    <MapContainer center={center} zoom={12} style={{ width: '100%', height: '500px', borderRadius: '16px' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {memories.map((m) => {
        if (!m.location || typeof m.location.lat !== 'number' || typeof m.location.lon !== 'number') return null;
        return (
          <Marker key={m.id} position={[m.location.lat, m.location.lon]}>
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="p-1 max-w-[200px]">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                  {m.type === 'image' ? '📷' : m.type === 'audio' ? '🎤' : '📝'} {m.type}
                </p>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {m.caption || m.transcript || m.content || 'Memory details...'}
                </p>
              </div>
            </Tooltip>
            <Popup>
              <div className="p-1 min-w-[180px]">
                <p className="text-xs font-medium mb-1">
                  {m.type === 'image' ? '📷' : m.type === 'audio' ? '🎤' : '📝'} {m.type} · {new Date(m.timestamp).toLocaleDateString()}
                </p>
                <div className="w-full h-24 bg-slate-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                   {m.type === 'image' && m.imageUrl ? (
                     <img src={m.imageUrl} className="w-full h-full object-cover" alt="Memory" />
                   ) : (
                     <div className="text-2xl opacity-20">{m.type === 'image' ? '📷' : m.type === 'audio' ? '🎤' : '📝'}</div>
                   )}
                </div>
                <p className="text-sm font-medium">{m.caption || m.transcript || m.content}</p>
                {m.location?.name && (
                   <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">📍 {m.location.name}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
