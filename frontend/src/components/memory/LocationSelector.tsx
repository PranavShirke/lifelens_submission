'use client';

import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';

const locationSuggestions = [
  { lat: 19.0948, lon: 72.8267, name: 'Juhu Beach, Mumbai' },
  { lat: 19.0544, lon: 72.8402, name: 'Bandra West, Mumbai' },
  { lat: 19.0760, lon: 72.8777, name: 'Home, Andheri West' },
  { lat: 18.9220, lon: 72.8347, name: 'Gateway of India, Mumbai' },
  { lat: 19.0176, lon: 72.8474, name: 'Dadar, Mumbai' },
  { lat: 18.9440, lon: 72.8237, name: 'Marine Drive, Mumbai' },
  { lat: 19.1136, lon: 72.8697, name: 'Kokilaben Hospital, Mumbai' },
  { lat: 19.0169, lon: 72.8310, name: 'Siddhivinayak Temple, Mumbai' },
];

interface LocationSelectorProps {
  value?: { lat: number; lon: number; name: string } | null;
  onChange: (loc: { lat: number; lon: number; name: string } | null) => void;
}

export default function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);

  const filtered = locationSuggestions.filter((l) =>
    l.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          className="input-base pl-9 py-2 text-sm"
        />
      </div>
      {open && query && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 card p-1 shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((loc) => (
            <button
              key={loc.name}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-background transition-colors"
              onClick={() => {
                onChange(loc);
                setQuery(loc.name);
                setOpen(false);
              }}
            >
              <MapPin className="w-3.5 h-3.5 inline mr-2 text-text-muted" />
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
