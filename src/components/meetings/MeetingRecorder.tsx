import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Video, Mic, Monitor, Square } from 'lucide-react';
import { toast } from 'sonner';

const MAX_DURATION_SECONDS = 2700; // 45 min
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const WARNING_THRESHOLD = MAX_DURATION_SECONDS - 300; // 5 min before limit

type RecordMode = 'screen-audio' | 'audio-only' | 'screen-only';

interface Props {
  meetingId: string;
  onRecorded: () => void;
}

export function MeetingRecorder({ meetingId, onRecorded }: Props) {
  const { t } = useTranslation('meetings');
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const totalSizeRef = useRef(0);
  const streamsRef = useRef<MediaStream[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedByLimitRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (recording && elapsed >= MAX_DURATION_SECONDS) {
      stoppedByLimitRef.current = true;
      toast.warning(t('recorder.limitDuration'));
      stopRecording();
    }
  }, [recording, elapsed]);

  const stopAllStreams = () => {
    streamsRef.current.forEach(s => s.getTracks().forEach(tr => tr.stop()));
    streamsRef.current = [];
  };

  const startRecording = useCallback(async (mode: RecordMode) => {
    try {
      let combinedTracks: MediaStreamTrack[] = [];
      stoppedByLimitRef.current = false;
      totalSizeRef.current = 0;

      if (mode === 'screen-audio' || mode === 'screen-only') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: mode === 'screen-audio',
        });
        streamsRef.current.push(screenStream);
        combinedTracks.push(...screenStream.getTracks());

        screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          toast.info(t('recorder.screenEnded'));
          stopRecording();
        });
      }

      if (mode === 'screen-audio' || mode === 'audio-only') {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamsRef.current.push(audioStream);
          const existingAudioIds = new Set(combinedTracks.filter(tr => tr.kind === 'audio').map(tr => tr.id));
          audioStream.getAudioTracks().forEach(tr => {
            if (!existingAudioIds.has(tr.id)) combinedTracks.push(tr);
          });
        } catch {
          if (mode === 'audio-only') {
            toast.error(t('recorder.errorMic'));
            stopAllStreams();
            return;
          }
          toast.warning(t('recorder.warnMic'));
        }
      }

      const combined = new MediaStream(combinedTracks);
      const mimeType = mode === 'audio-only' ? 'audio/webm' : 'video/webm';
      const recorder = new MediaRecorder(combined, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          totalSizeRef.current += e.data.size;

          if (totalSizeRef.current >= MAX_SIZE_BYTES) {
            stoppedByLimitRef.current = true;
            toast.warning(t('recorder.limitSize'));
            stopRecording();
          }
        }
      };

      recorder.onstop = async () => {
        stopAllStreams();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        await uploadRecording(blob, mimeType);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } catch (err: any) {
      stopAllStreams();
      if (err.name === 'NotAllowedError') {
        toast.error(t('recorder.errorPermission'));
      } else {
        toast.error(t('recorder.errorStart'));
      }
    }
  }, [meetingId, t]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const uploadRecording = async (blob: Blob, mimeType: string) => {
    if (!user) return;
    const ext = 'webm';
    const fileName = `recording_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.${ext}`;
    const path = `${user.id}/${meetingId}/${crypto.randomUUID()}.${ext}`;

    toast.info(t('recorder.saving'));

    const { error: uploadError } = await supabase.storage
      .from('meeting-attachments')
      .upload(path, blob, { contentType: mimeType });

    if (uploadError) {
      toast.error(t('recorder.errorSave'));
      console.error(uploadError);
      return;
    }

    await supabase.from('meeting_attachments').insert({
      meeting_id: meetingId,
      file_name: fileName,
      file_path: path,
      file_type: mimeType,
      uploaded_by: user.id,
    });

    toast.success(t('recorder.saved'));
    onRecorded();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isWarning = elapsed >= WARNING_THRESHOLD && elapsed < MAX_DURATION_SECONDS;

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
        </span>
        <span className={`text-sm font-mono font-medium ${isWarning ? 'text-yellow-500' : 'text-destructive'}`}>
          {formatTime(elapsed)} / {formatTime(MAX_DURATION_SECONDS)}
        </span>
        {isWarning && (
          <span className="text-xs text-yellow-500">{t('recorder.endingSoon')}</span>
        )}
        <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1">
          <Square className="h-3 w-3" /> {t('recorder.stop')}
        </Button>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Video className="h-4 w-4" /> {t('recorder.trigger')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startRecording('screen-audio')}>
              <Monitor className="mr-2 h-4 w-4" /> {t('recorder.screenAudio')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startRecording('audio-only')}>
              <Mic className="mr-2 h-4 w-4" /> {t('recorder.audioOnly')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startRecording('screen-only')}>
              <Monitor className="mr-2 h-4 w-4" /> {t('recorder.screenOnly')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>{t('recorder.limit')}</TooltipContent>
    </Tooltip>
  );
}
