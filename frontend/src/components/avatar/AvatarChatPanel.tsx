'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Package, Send, UserPlus, Volume2 } from 'lucide-react';

export interface AvatarUiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  gallery?: string[];
  audioUrl?: string;
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>

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
