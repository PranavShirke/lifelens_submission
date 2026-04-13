'use client';

import React, { useEffect, useState } from 'react';
import { Clock3, PackagePlus, UserRoundPlus, RefreshCcw, AlertCircle } from 'lucide-react';
import { useSessionStore } from '@/lib/store/session-store';
import { getEnrollmentRecords, type EnrollmentRecord } from '@/lib/api/enrollment';

interface EnrollmentHistoryPanelProps {
  refreshKey?: number;
}

export default function EnrollmentHistoryPanel({ refreshKey = 0 }: EnrollmentHistoryPanelProps) {
  const { activePatientId } = useSessionStore();
  const [records, setRecords] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePatientId) return;
    setLoading(true);
    getEnrollmentRecords(activePatientId)
      .then((items) => setRecords(items))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [activePatientId, refreshKey]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Enrollment History</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GET /api/enrollment/{'{'}patient_id{'}'}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          <Clock3 className="h-3.5 w-3.5" /> {records.length} records
        </div>
      </div>

      {!activePatientId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          Select a patient to view enrollment history.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          <RefreshCcw className="h-4 w-4 animate-spin" /> Loading enrollment records...
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          <AlertCircle className="h-4 w-4" /> No enrollment records found for this patient yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {record.enrollment_type === 'object' ? (
                      <PackagePlus className="h-4 w-4 text-amber-600" />
                    ) : (
                      <UserRoundPlus className="h-4 w-4 text-teal-600" />
                    )}
                    <h3 className="truncate text-sm font-black text-slate-900">{record.name}</h3>
                  </div>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{record.enrollment_type}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {record.timestamp}
                </span>
              </div>

              {record.image_base64 && (
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    src={`data:image/jpeg;base64,${record.image_base64}`}
                    alt={`${record.name} enrollment`}
                    className="h-36 w-full object-cover"
                  />
                </div>
              )}

              {record.relation && (
                <p className="text-xs font-medium text-slate-600"><span className="font-bold">Relation:</span> {record.relation}</p>
              )}
              {record.notes && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{record.notes}</p>
              )}

              {(record.image_caption || record.voice_transcript || record.detected_objects?.length || record.relationship_tags?.length) && (
                <div className="mt-3 space-y-2 rounded-xl bg-white p-3 text-xs text-slate-600">
                  {record.image_caption && (
                    <p><span className="font-bold text-slate-800">Image:</span> {record.image_caption}</p>
                  )}
                  {record.voice_transcript && (
                    <p><span className="font-bold text-slate-800">Voice:</span> {record.voice_transcript}</p>
                  )}
                  {record.relationship_tags?.length ? (
                    <p><span className="font-bold text-slate-800">Tags:</span> {record.relationship_tags.join(', ')}</p>
                  ) : null}
                  {record.detected_objects?.length ? (
                    <p><span className="font-bold text-slate-800">Detected:</span> {record.detected_objects.join(', ')}</p>
                  ) : null}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {record.image_base64 && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">Image stored</span>}
                {record.audio_base64 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Audio stored</span>}
                {record.image_quality_score !== undefined && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Score {record.image_quality_score}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
