import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  mine?: boolean;
}

export function AudioPlayer({ src, mine }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (!isNaN(audio.duration)) setDuration(audio.duration);
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-xl min-w-[240px]",
      mine ? "bg-white/10" : "bg-black/5 dark:bg-white/5"
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-10 w-10 rounded-full shrink-0",
          mine ? "hover:bg-white/20 text-white" : "hover:bg-black/5"
        )}
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
      </Button>
      <div className="flex-1 space-y-1.5">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className={cn("cursor-pointer", mine ? "bg-white/20" : "")}
        />
        <div className={cn(
          "flex justify-between text-[10px] font-bold tracking-widest uppercase",
          mine ? "text-white/60" : "opacity-50"
        )}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <Volume2 className={cn("h-3 w-3 shrink-0", mine ? "text-white/40" : "opacity-30")} />
    </div>
  );
}
