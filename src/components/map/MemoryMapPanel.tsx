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
  const withLoc = filtered.filter((m) => m.location);

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

  const { MapContainer, TileLayer, Marker, Popup } = Leaflet;
  const center = memories.length > 0
    ? [memories[0].location!.lat, memories[0].location!.lon]
    : [19.076, 72.877];

  return (
    <MapContainer center={center} zoom={12} style={{ width: '100%', height: '500px', borderRadius: '16px' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {memories.map((m) => (
        <Marker key={m.id} position={[m.location!.lat, m.location!.lon]}>
          <Popup>
            <div className="p-1 min-w-[180px]">
              <p className="text-xs font-medium mb-1">
                {m.type === 'image' ? '📷' : m.type === 'audio' ? '🎤' : '📝'} {m.type} · {new Date(m.timestamp).toLocaleDateString()}
              </p>
              <p className="text-sm line-clamp-2">{m.caption || m.transcript || m.content}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
