'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Package, Send, UserPlus, Volume2, Clock, Heart, Sparkles, Info, Search, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarUiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  gallery?: string[];
  audioUrl?: string;
}

interface ParsedResponse {
  summary: string;
  details: string[];
  reflection: string;
  isStructured: boolean;
}

export function parseDementiaResponse(text: string): ParsedResponse {
  if (!text) return { summary: '', details: [], reflection: '', isStructured: false };
  
  const summaryMarker = '### 🌟 Summary';
  const detailsMarker = '### 🔍 Memory Details';
  const reflectionMarker = '### 💭 Reflection';
  
  const hasSummary = text.includes(summaryMarker);
  
  if (!hasSummary) {
    return {
      summary: text,
      details: [],
      reflection: '',
      isStructured: false
    };
  }
  
  let summary = '';
  let detailsText = '';
  let reflection = '';
  
  const summaryIndex = text.indexOf(summaryMarker);
  const detailsIndex = text.indexOf(detailsMarker);
  const reflectionIndex = text.indexOf(reflectionMarker);
  
  // Extract Summary
  if (detailsIndex !== -1) {
    summary = text.slice(summaryIndex + summaryMarker.length, detailsIndex).trim();
  } else if (reflectionIndex !== -1) {
    summary = text.slice(summaryIndex + summaryMarker.length, reflectionIndex).trim();
  } else {
    summary = text.slice(summaryIndex + summaryMarker.length).trim();
  }
  
  // Extract Details
  if (detailsIndex !== -1) {
    if (reflectionIndex !== -1) {
      detailsText = text.slice(detailsIndex + detailsMarker.length, reflectionIndex).trim();
    } else {
      detailsText = text.slice(detailsIndex + detailsMarker.length).trim();
    }
  }
  
  // Extract Reflection
  if (reflectionIndex !== -1) {
    reflection = text.slice(reflectionIndex + reflectionMarker.length).trim();
  }
  
  // Parse details bullet points
  const details: string[] = [];
  if (detailsText) {
    const lines = detailsText.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*[\*\-\•]\s*/, '').trim();
      if (cleanLine) {
        details.push(cleanLine);
      }
    }
  }
  
  return {
    summary,
    details,
    reflection,
    isStructured: true
  };
}

function DementiaResponse({
  content,
  msgId,
  onSpeakResponse,
  speakingId
}: {
  content: string;
  msgId: string;
  onSpeakResponse?: (text: string, msgId: string) => void;
  speakingId: string | null;
}) {
  const parsed = parseDementiaResponse(content);
  let textToSpeak = content;
  if (parsed.isStructured) {
    const detailsText = parsed.details.join('. ');
    textToSpeak = `${parsed.summary}. ${detailsText}. ${parsed.reflection}`;
  }
  const isSpeaking = speakingId === msgId;

  const handleListenClick = () => {
    if (onSpeakResponse) {
      onSpeakResponse(textToSpeak, msgId);
    }
  };

  if (!parsed.isStructured) {
    return (
      <div className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap leading-relaxed text-sm font-bold text-slate-800">{content}</p>
        {onSpeakResponse && (
          <button
            onClick={handleListenClick}
            className={cn(
              "mt-1 text-[10px] flex items-center gap-1.5 font-bold transition-all py-1 px-2.5 rounded-lg border w-fit shadow-sm cursor-pointer",
              isSpeaking
                ? "bg-red-50 text-red-500 border-red-100 hover:bg-red-100 animate-pulse"
                : "bg-slate-50 text-slate-500 border-slate-100 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            {isSpeaking ? <X className="w-3 h-3" /> : <Volume2 className="w-3.5 h-3.5" />}
            {isSpeaking ? 'Stop Listening' : 'Listen'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-1 text-slate-800">
      {/* 1. Summary Card (Main answer) */}
      <div className="bg-[#FFFDF9] border-2 border-[#FF8C42]/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-[#FF8C42]/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 mt-0.5">
            <Star className="w-5 h-5 text-[#FF8C42]" fill="currentColor" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-[10px] font-black text-[#FF8C42] uppercase tracking-wider">The Main Answer</h4>
            <p className="text-base lg:text-[17px] font-black text-slate-800 leading-relaxed">
              {parsed.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Details Grid (if details exist) */}
      {parsed.details.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 mt-1">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsed.details.map((detail, index) => {
              let icon = <Info className="w-4 h-4 text-indigo-400" />;
              let label = '';
              let value = detail;
              let bg = 'bg-slate-50 border-slate-100';

              const lowerDetail = detail.toLowerCase();
              if (lowerDetail.includes('when')) {
                icon = <Clock className="w-4 h-4 text-amber-500" />;
                label = 'When';
                const idx = lowerDetail.indexOf('when:');
                value = idx !== -1 ? detail.slice(idx + 5).trim() : detail;
                bg = 'bg-amber-50/40 border-amber-100/50';
              } else if (lowerDetail.includes('where')) {
                icon = <Search className="w-4 h-4 text-rose-500" />;
                label = 'Where';
                const idx = lowerDetail.indexOf('where:');
                value = idx !== -1 ? detail.slice(idx + 6).trim() : detail;
                bg = 'bg-rose-50/40 border-rose-100/50';
              } else if (lowerDetail.includes('who')) {
                icon = <Heart className="w-4 h-4 text-pink-500" />;
                label = 'Who';
                const idx = lowerDetail.indexOf('who:');
                value = idx !== -1 ? detail.slice(idx + 4).trim() : detail;
                bg = 'bg-pink-50/40 border-pink-100/50';
              } else if (lowerDetail.includes('what happened')) {
                icon = <Sparkles className="w-4 h-4 text-emerald-500" />;
                label = 'What happened';
                const idx = lowerDetail.indexOf('what happened:');
                value = idx !== -1 ? detail.slice(idx + 14).trim() : detail;
                bg = 'bg-emerald-50/40 border-emerald-100/50';
              }

              // Strip formatting leftover markers
              const cleanValue = value
                .replace(/\*\*+/g, '')
                .replace(/📅|📍|👥|💡/g, '')
                .replace(/^[:\s]+/, '')
                .trim();

              return (
                <div key={index} className={cn("p-3.5 rounded-xl border flex gap-3 items-start shadow-sm", bg)}>
                  <div className="shrink-0 mt-0.5">{icon}</div>
                  <div>
                    {label && <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>}
                    <p className="text-xs font-black text-slate-800 leading-snug">{cleanValue}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Reflection (Comfort note) */}
      {parsed.reflection && (
        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-xl p-3.5 flex gap-3 items-center shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-100/50 flex items-center justify-center shrink-0 border border-indigo-200">
            <Heart className="w-4 h-4 text-indigo-500" fill="currentColor" />
          </div>
          <p className="text-xs font-bold text-indigo-700/90 italic leading-relaxed">
            {parsed.reflection.replace(/\*\*+/g, '').trim()}
          </p>
        </div>
      )}

      {/* 4. Listen Trigger */}
      {onSpeakResponse && (
        <button
          onClick={handleListenClick}
          className={cn(
            "mt-1 text-[11px] flex items-center gap-1.5 font-black transition-all py-2 px-4 rounded-xl border w-fit shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer select-none",
            isSpeaking
              ? "bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
              : "bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:bg-slate-50"
          )}
        >
          {isSpeaking ? <X className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
          {isSpeaking ? 'Stop Listening' : 'Listen to Answer'}
        </button>
      )}
    </div>
  );
}

interface AvatarChatPanelProps {
  messages: AvatarUiMessage[];
  suggestions: string[];
  isProcessing: boolean;
  statusText: string;
  onSendMessage: (text: string) => Promise<void>;
  onSuggestionClick: (text: string) => Promise<void>;
  onScanPerson: () => void;
  onScanObject: () => void;
  onEnrollPerson: () => void;
  onEnrollObject: () => void;
  onPlayAudio: (url: string) => void;
  speakingId?: string | null;
  onSpeakResponse?: (text: string, msgId: string) => void;
}

export default function AvatarChatPanel({
  messages,
  suggestions,
  isProcessing,
  statusText,
  onSendMessage,
  onSuggestionClick,
  onScanPerson,
  onScanObject,
  onEnrollPerson,
  onEnrollObject,
  onPlayAudio,
  speakingId = null,
  onSpeakResponse,
}: AvatarChatPanelProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isProcessing]);

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    setInput('');
    await onSendMessage(trimmed);
  };

  return (
    <section className="flex h-full flex-col bg-white/70">
      <div className="border-b border-[#FF8C42]/12 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <QuickAction label="Scan Face" icon={<Camera className="h-3.5 w-3.5" />} onClick={onScanPerson} />
          <QuickAction label="Scan Object" icon={<Package className="h-3.5 w-3.5" />} onClick={onScanObject} />
          <QuickAction label="Enroll Person" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={onEnrollPerson} />
          <QuickAction label="Enroll Object" icon={<Package className="h-3.5 w-3.5" />} onClick={onEnrollObject} />
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">
        {messages.map((message) => (
          <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[90%] rounded-2xl px-4 py-3 shadow-sm',
                message.role === 'user'
                  ? 'rounded-tr-sm bg-[#1E1B2E] text-white'
                  : 'rounded-tl-sm border border-[#FF8C42]/18 bg-white text-[#1E1B2E]',
              ].join(' ')}
            >
              {message.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              ) : (
                <DementiaResponse
                  content={message.text}
                  msgId={message.id}
                  onSpeakResponse={onSpeakResponse}
                  speakingId={speakingId}
                />
              )}

              {message.image ? (
                <img
                  src={message.image.startsWith('data:') ? message.image : `data:image/jpeg;base64,${message.image}`}
                  alt="Memory visual"
                  className="mt-3 max-h-56 w-full rounded-xl border border-[#FF8C42]/15 object-contain"
                />
              ) : null}

              {message.gallery && message.gallery.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {message.gallery.map((image, index) => (
                    <img
                      key={`${message.id}-gallery-${index}`}
                      src={image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`}
                      alt={`Gallery memory ${index + 1}`}
                      className="h-16 w-16 rounded-lg border border-[#FF8C42]/20 object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {message.audioUrl ? (
                <button
                  type="button"
                  onClick={() => onPlayAudio(message.audioUrl!)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#7A9E7A]/30 bg-[#EAF2E9] px-3 py-1.5 text-xs font-bold text-[#4B754B]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Play Voice Sample
                </button>
              ) : null}
            </div>
          </article>
        ))}

        {isProcessing ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF8C42]/25 bg-[#FFF5E6] px-4 py-2 text-xs font-bold text-[#5A576E]">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF8C42]" />
              {statusText || 'Thinking...'}
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="border-t border-[#FF8C42]/12 px-4 py-4 md:px-6">
        {suggestions.length > 0 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick(suggestion)}
                className="whitespace-nowrap rounded-full border border-[#FF8C42]/20 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5A576E] transition-colors hover:bg-[#FFF5E6]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2 rounded-2xl border border-[#FF8C42]/15 bg-[#F6F5FA] p-2 focus-within:ring-2 focus-within:ring-[#FF8C42]/25">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about memories, people, or objects..."
            className="w-full bg-transparent px-3 py-2 text-sm text-[#1E1B2E] outline-none placeholder:text-[#9896B0]"
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await submit();
              }
            }}
            aria-label="Message avatar assistant"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || isProcessing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF8C42] text-white transition-colors hover:bg-[#E67329] disabled:cursor-not-allowed disabled:opacity-55"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[#FF8C42]/20 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5A576E] transition-colors hover:bg-[#FFF5E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42]"
    >
      {icon}
      {label}
    </button>
  );
}
