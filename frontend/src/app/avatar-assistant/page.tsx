'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import AvatarStage from '@/components/avatar/AvatarStage';
import AvatarChatPanel, { type AvatarUiMessage } from '@/components/avatar/AvatarChatPanel';
import AvatarCameraModal from '@/components/avatar/AvatarCameraModal';
import AvatarEnrollmentForm from '@/components/avatar/AvatarEnrollmentForm';
import { useUIStore } from '@/lib/store/ui-store';
import {
  findObject,
  queryAvatar,
  recognizePerson,
  rememberObject,
  rememberPatient,
  rememberPerson,
} from '@/lib/api/avatar';
import type {
  AvatarEnrollmentDraft,
  AvatarEntityKind,
  AvatarPerson,
} from '@/lib/types/avatar';

type CameraAction = 'recognize-person' | 'find-object' | 'enroll-person' | 'enroll-object' | 'enroll-patient';

const defaultSuggestions = ['Who is this?', 'How does he talk?', 'Where is my medicine box?'];

export default function AvatarAssistantPage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell fullBleed>
        <AvatarAssistantScreen />
      </AppShell>
    </RoleGuard>
  );
}

function AvatarAssistantScreen() {
  const { addToast } = useUIStore();

  const [mode, setMode] = useState<'person' | 'object'>('person');
  const [messages, setMessages] = useState<AvatarUiMessage[]>([
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: 'Hello. I can recognize familiar faces, locate remembered objects, and answer memory questions.',
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarUtterance, setAvatarUtterance] = useState<string | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<CameraAction | null>(null);

  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrollmentType, setEnrollmentType] = useState<AvatarEntityKind>('person');
  const [pendingEnrollment, setPendingEnrollment] = useState<AvatarEnrollmentDraft | null>(null);

  const [runtimeReady, setRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const [currentPerson, setCurrentPerson] = useState<AvatarPerson | null>(null);

  const audioObjectUrlsRef = useRef<string[]>([]);

  const speakResponse = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarUtterance(text);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setAvatarUtterance(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAvatarUtterance(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const appendMessage = useCallback((message: AvatarUiMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const toAudioUrl = useCallback((audioBase64?: string | null) => {
    if (!audioBase64) {
      return undefined;
    }

    try {
      const bytes = Uint8Array.from(window.atob(audioBase64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      audioObjectUrlsRef.current.push(url);
      return url;
    } catch {
      return undefined;
    }
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt) {
        return;
      }

      appendMessage({ id: `user-${Date.now()}`, role: 'user', text: prompt });
      setIsProcessing(true);
      setProcessingStatus('Consulting memory graph...');

      try {
        const response = await queryAvatar(prompt);

        const answer = response.text || "I couldn't find that in memory.";
        const audioUrl = toAudioUrl(response.audio_base64);
        const image = response.image_base64 || undefined;
        const gallery = response.gallery || [];

        appendMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: answer,
          audioUrl,
          image,
          gallery,
        });

        if (response.person && typeof response.person.name === 'string') {
          const personName = response.person.name;
          setCurrentPerson({
            name: personName,
            relation: typeof response.person.relation === 'string' ? response.person.relation : undefined,
          });
          setSuggestions([
            `Who is ${personName}?`,
            `How does ${personName} talk?`,
            `Any notes on ${personName}?`,
          ]);
        }

        speakResponse(answer);
      } catch {
        const fallback = 'I had trouble reaching the assistant service. Please try again.';
        appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: fallback });
        addToast({ type: 'error', message: 'Avatar chat request failed.' });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [addToast, appendMessage, speakResponse, toAudioUrl]
  );

  const handleCameraCapture = useCallback(
    async (file: File) => {
      if (!cameraAction) {
        return;
      }

      setIsProcessing(true);
      setCameraOpen(false);

      try {
        if (cameraAction === 'recognize-person') {
          setMode('person');
          setProcessingStatus('Analyzing facial embeddings...');

          const result = await recognizePerson(file);
          if (result.status === 'identified' && result.person) {
            const relationText = result.person.relation ? ` (${result.person.relation})` : '';
            const responseText = `I can see ${result.person.name}${relationText}.`;

            appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: responseText });
            setCurrentPerson(result.person);
            setSuggestions([
              `Who is ${result.person.name}?`,
              `How does ${result.person.name} talk?`,
              `Any notes on ${result.person.name}?`,
            ]);
            speakResponse(responseText);
          } else if (result.status === 'no_face_detected') {
            appendMessage({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: 'I could not detect a face in that image. Please try a clearer frame.',
            });
          } else {
            appendMessage({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: "I don't recognize this person yet. You can enroll them first.",
            });
          }
        }

        if (cameraAction === 'find-object') {
          setMode('object');
          setProcessingStatus('Searching remembered objects...');

          const result = await findObject(file);
          if (result.status === 'identified' && result.object) {
            const location = result.object.location ? ` It is usually ${result.object.location}.` : '';
            const responseText = `I found ${result.object.name}.${location}`;
            appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: responseText, image: result.object.image || undefined });
            speakResponse(responseText);
          } else {
            appendMessage({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: "I don't recognize this object yet. You can enroll it to remember it.",
            });
          }
        }

        if (cameraAction === 'enroll-person' || cameraAction === 'enroll-object' || cameraAction === 'enroll-patient') {
          if (!pendingEnrollment) {
            addToast({ type: 'warning', message: 'Enrollment details are missing. Please retry.' });
            return;
          }

          setProcessingStatus('Saving enrollment into memory...');

          if (cameraAction === 'enroll-object') {
            const res = await rememberObject({
              name: pendingEnrollment.name,
              notes: pendingEnrollment.notes,
              file,
            });

            const reply = res.status === 'stored'
              ? `I have remembered ${pendingEnrollment.name}.`
              : `I could not save ${pendingEnrollment.name}.`;
            appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: reply });
            speakResponse(reply);
          } else if (cameraAction === 'enroll-patient') {
            const res = await rememberPatient({
              name: pendingEnrollment.name,
              relation: pendingEnrollment.relation,
              age: pendingEnrollment.age,
              notes: pendingEnrollment.notes,
              file,
              audioFile: pendingEnrollment.audioFile,
            });

            const reply = res.status === 'stored'
              ? `Patient profile saved for ${pendingEnrollment.name}.`
              : `I could not save ${pendingEnrollment.name}.`;

            appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: reply });
            setCurrentPerson({ name: pendingEnrollment.name, relation: pendingEnrollment.relation });
            setSuggestions([
              `Who is ${pendingEnrollment.name}?`,
              `How does ${pendingEnrollment.name} talk?`,
              `Any notes on ${pendingEnrollment.name}?`,
            ]);
            speakResponse(reply);
          } else {
            const res = await rememberPerson({
              name: pendingEnrollment.name,
              relation: pendingEnrollment.relation,
              age: pendingEnrollment.age,
              notes: pendingEnrollment.notes,
              file,
              audioFile: pendingEnrollment.audioFile,
            });

            const reply = res.status === 'stored'
              ? `I have remembered ${pendingEnrollment.name}.`
              : `I could not save ${pendingEnrollment.name}.`;

            appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: reply });
            setCurrentPerson({ name: pendingEnrollment.name, relation: pendingEnrollment.relation });
            setSuggestions([
              `Who is ${pendingEnrollment.name}?`,
              `How does ${pendingEnrollment.name} talk?`,
              `Any notes on ${pendingEnrollment.name}?`,
            ]);
            speakResponse(reply);
          }

          setPendingEnrollment(null);
        }
      } catch {
        appendMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'I could not complete that operation. Please retry.',
        });
        addToast({ type: 'error', message: 'Avatar operation failed.' });
      } finally {
        setCameraAction(null);
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [addToast, appendMessage, cameraAction, pendingEnrollment, speakResponse]
  );

  const beginEnrollment = useCallback(
    async (draft: AvatarEnrollmentDraft) => {
      setPendingEnrollment(draft);
      setShowEnrollment(false);

      if (draft.type === 'object') {
        setMode('object');
        setCameraAction('enroll-object');
      } else if (draft.type === 'patient') {
        setMode('person');
        setCameraAction('enroll-patient');
      } else {
        setMode('person');
        setCameraAction('enroll-person');
      }

      setCameraOpen(true);
      addToast({ type: 'info', message: 'Capture a clear photo to complete enrollment.' });
    },
    [addToast]
  );

  const cameraTitle = useMemo(() => {
    if (cameraAction === 'recognize-person') return 'Scan Person';
    if (cameraAction === 'find-object') return 'Scan Object';
    if (cameraAction === 'enroll-object') return 'Capture Object Photo';
    if (cameraAction === 'enroll-patient') return 'Capture Patient Photo';
    if (cameraAction === 'enroll-person') return 'Capture Person Photo';
    return 'Camera';
  }, [cameraAction]);

  useEffect(() => {
    let mounted = true;

    const probe = async (path: string) => {
      const head = await fetch(path, { method: 'HEAD', cache: 'no-store' });
      if (head.ok) {
        return true;
      }
      if (head.status === 405) {
        const get = await fetch(path, { method: 'GET', cache: 'no-store' });
        return get.ok;
      }
      return false;
    };

    const checkRuntime = async () => {
      try {
        const [modelOk, moduleOk] = await Promise.all([
          probe('/model.glb'),
          probe('/talkinghead_lib/modules/talkinghead.mjs'),
        ]);

        if (!mounted) {
          return;
        }

        if (modelOk && moduleOk) {
          setRuntimeReady(true);
          setRuntimeError(null);
        } else {
          setRuntimeReady(false);
          setRuntimeError('Some avatar runtime assets are missing. Check /public/model.glb and /public/talkinghead_lib/modules.');
        }
      } catch {
        if (mounted) {
          setRuntimeReady(false);
          setRuntimeError('Could not verify avatar runtime files.');
        }
      }
    };

    const loadRuntime = async () => {
      await checkRuntime();
    };

    loadRuntime();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      audioObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioObjectUrlsRef.current = [];
    };
  }, []);

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-cols-1 grid-rows-[minmax(280px,42vh)_1fr] lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] lg:grid-rows-1">
        <AvatarStage
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          statusText={processingStatus}
          utterance={avatarUtterance}
          runtimeReady={runtimeReady}
          runtimeError={runtimeError}
          mode={mode}
        />

        <div className="h-full overflow-hidden rounded-none bg-white md:rounded-l-[24px]">
          {showEnrollment ? (
            <AvatarEnrollmentForm
              type={enrollmentType}
              onCancel={() => setShowEnrollment(false)}
              onSubmit={beginEnrollment}
              isSubmitting={isProcessing}
            />
          ) : (
            <AvatarChatPanel
              messages={messages}
              suggestions={suggestions}
              isProcessing={isProcessing}
              statusText={processingStatus}
              onSendMessage={handleSendMessage}
              onSuggestionClick={handleSendMessage}
              onScanPerson={() => {
                setMode('person');
                setCameraAction('recognize-person');
                setCameraOpen(true);
              }}
              onScanObject={() => {
                setMode('object');
                setCameraAction('find-object');
                setCameraOpen(true);
              }}
              onEnrollPerson={() => {
                setEnrollmentType('person');
                setShowEnrollment(true);
              }}
              onEnrollObject={() => {
                setEnrollmentType('object');
                setShowEnrollment(true);
              }}
              onPlayAudio={(url) => {
                const audio = new Audio(url);
                audio.play().catch(() => {
                  addToast({ type: 'warning', message: 'Unable to play audio sample.' });
                });
              }}
            />
          )}
        </div>
      </div>

      <AvatarCameraModal
        open={cameraOpen}
        title={cameraTitle}
        onClose={() => {
          setCameraOpen(false);
          setCameraAction(null);
        }}
        onCapture={handleCameraCapture}
        isProcessing={isProcessing}
      />

      {currentPerson ? (
        <div className="pointer-events-none absolute bottom-4 right-4 hidden rounded-full border border-[#7A9E7A]/35 bg-[#EAF2E9] px-3 py-1 text-[11px] font-bold text-[#4B754B] md:block">
          Active context: {currentPerson.name}
        </div>
      ) : null}
    </div>
  );
}
