import { useState, useEffect, useCallback, useRef } from "react";
import * as Tone from "tone";
import { Play, Pause, SkipBack, Music, Guitar } from "lucide-react";
import type { Note, Chord } from "../lib/api";

interface PlayerProps {
  notes: Note[];
  chords: Chord[];
  melodyEnabled?: boolean;
  chordsEnabled?: boolean;
}

export function Player({ notes, chords, melodyEnabled = true, chordsEnabled = true }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const pianoRef = useRef<Tone.PolySynth | null>(null);
  const schedulerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const initSynths = async () => {
      await Tone.start();

      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8,
        },
      }).toDestination();

      pianoRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.02,
          decay: 0.5,
          sustain: 0.3,
          release: 1.0,
        },
      }).toDestination();

      setIsReady(true);
    };

    initSynths();

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      if (pianoRef.current) {
        pianoRef.current.dispose();
      }
      if (schedulerIdRef.current !== null) {
        Tone.Transport.clear(schedulerIdRef.current);
      }
      Tone.Transport.stop();
    };
  }, []);

  const scheduleEvents = useCallback(() => {
    if (schedulerIdRef.current !== null) {
      Tone.Transport.clear(schedulerIdRef.current);
    }

    Tone.Transport.cancel();
    Tone.Transport.bpm.value = 120;

    if (melodyEnabled && synthRef.current) {
      notes.forEach((note) => {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const freq = midiToFreq(note.midi);
        const duration = Math.max(note.end - note.start, 0.1);

        Tone.Transport.schedule((time) => {
          synthRef.current!.triggerAttackRelease(freq, `${duration}`, time);
        }, note.start);
      });
    }

    if (chordsEnabled && pianoRef.current) {
      chords.forEach((chord) => {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const frequencies = chord.notes.map((m) => midiToFreq(m));
        const duration = Math.max(chord.end - chord.start, 0.5);

        Tone.Transport.schedule((time) => {
          pianoRef.current!.triggerAttackRelease(frequencies, `${duration}`, time);
        }, chord.start);
      });
    }
  }, [notes, chords, melodyEnabled, chordsEnabled]);

  const handlePlay = useCallback(async () => {
    if (!isReady) return;

    await Tone.start();
    scheduleEvents();

    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [isPlaying, isReady, scheduleEvents]);

  const handleRestart = useCallback(() => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setTimeout(() => {
      Tone.Transport.start(0);
      setIsPlaying(true);
    }, 50);
  }, []);

  const isEmpty = notes.length === 0 && chords.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Music className="w-6 h-6 text-purple-600" />
          即时播放
        </h3>
        {isEmpty && (
          <span className="text-sm text-gray-400">等待录制结果...</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handleRestart}
          disabled={isEmpty || !isReady}
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <SkipBack className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={handlePlay}
          disabled={isEmpty || !isReady}
          className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>

        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-50">
            <Music className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">
              旋律: {notes.length}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50">
            <Guitar className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              和弦: {chords.length}
            </span>
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">旋律音符</h4>
          <div className="flex flex-wrap gap-2">
            {notes.slice(0, 20).map((note, index) => (
              <div
                key={index}
                className="px-3 py-1.5 bg-purple-100 rounded-full text-sm font-medium text-purple-700"
              >
                {note.name}
              </div>
            ))}
            {notes.length > 20 && (
              <div className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-500">
                +{notes.length - 20} 更多
              </div>
            )}
          </div>
        </div>
      )}

      {chords.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">和弦进行</h4>
          <div className="flex flex-wrap gap-2">
            {chords.map((chord, index) => (
              <div
                key={index}
                className="px-3 py-1.5 bg-blue-100 rounded-full text-sm font-medium text-blue-700"
              >
                {chord.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
