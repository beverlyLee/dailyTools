from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
import numpy as np
from collections import Counter
from app.config import settings

app = FastAPI(title="Humming to MIDI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

MAJOR_SCALE_DEGREES = [0, 2, 4, 5, 7, 9, 11]

CHORD_TYPES = {
    "major": [0, 4, 7],
    "minor": [0, 3, 7],
    "diminished": [0, 3, 6],
    "augmented": [0, 4, 8],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
}

DIATONIC_CHORDS = {
    "major": [
        {"name": "I", "type": "major", "degree": 0},
        {"name": "ii", "type": "minor", "degree": 2},
        {"name": "iii", "type": "minor", "degree": 4},
        {"name": "IV", "type": "major", "degree": 5},
        {"name": "V", "type": "major", "degree": 7},
        {"name": "vi", "type": "minor", "degree": 9},
        {"name": "viidim", "type": "diminished", "degree": 11},
    ]
}

KEY_ROOTS = {
    "C": 0, "G": 7, "D": 2, "A": 9, "E": 4, "F": 5,
    "Am": 9, "Em": 4, "Bm": 11, "Dm": 2, "Gm": 7, "Cm": 0,
}

COMMON_PROGRESSIONS = [
    ["I", "V", "vi", "IV"],
    ["I", "IV", "V", "I"],
    ["I", "vi", "IV", "V"],
    ["IV", "V", "vi", "I"],
    ["ii", "V", "I", "IV"],
    ["I", "V", "IV", "V"],
    ["I", "IV", "V", "V"],
    ["vi", "IV", "I", "V"],
]


class PitchFrame(BaseModel):
    frequency: Optional[float]
    midi: Optional[int]
    noteName: Optional[str]
    time: float
    confidence: Optional[float] = 0.5
    isMajorScale: Optional[bool] = False


class Note(BaseModel):
    midi: int
    name: str
    start: float
    end: float
    confidence: Optional[float] = 0.5


class Chord(BaseModel):
    name: str
    start: float
    end: float
    notes: List[int]
    roman_numeral: str


class TranscribeRequest(BaseModel):
    audio_data: List[float]
    sample_rate: int


class TranscribeResponse(BaseModel):
    notes: List[Note]
    melody: str
    key: str


class ChordRequest(BaseModel):
    notes: List[Note]


class ChordResponse(BaseModel):
    chords: List[Chord]
    progression: List[str]
    key: str


class ChordCandidate:
    def __init__(self, name: str, roman_numeral: str, midi_root: int, chord_type: str, score: float):
        self.name = name
        self.roman_numeral = roman_numeral
        self.midi_root = midi_root
        self.chord_type = chord_type
        self.score = score


def midi_to_note_name(midi: int) -> str:
    octave = midi // 12 - 1
    note_index = midi % 12
    return f"{NOTE_NAMES[note_index]}{octave}"


def frequency_to_midi(frequency: float) -> Optional[int]:
    if frequency <= 0:
        return None
    if frequency < 80 or frequency > 1200:
        return None
    midi = 69 + 12 * np.log2(frequency / 440)
    return int(round(midi))


def is_in_major_scale(midi: int) -> bool:
    note_class = midi % 12
    return note_class in MAJOR_SCALE_DEGREES


def snap_to_major_scale(midi: int) -> int:
    octave = (midi // 12) * 12
    note_class = midi % 12

    closest = MAJOR_SCALE_DEGREES[0]
    min_dist = 12

    for degree in MAJOR_SCALE_DEGREES:
        dist = min(abs(note_class - degree), 12 - abs(note_class - degree))
        if dist < min_dist:
            min_dist = dist
            closest = degree

    return octave + closest


def autocorrelation_pitch(audio_data: np.ndarray, sample_rate: int) -> Optional[float]:
    rms = np.sqrt(np.mean(audio_data ** 2))
    if rms < 0.02:
        return None

    size = len(audio_data)
    max_samples = size // 2
    correlations = np.zeros(max_samples)

    for lag in range(max_samples):
        correlations[lag] = np.sum(audio_data[:max_samples] * audio_data[lag:lag + max_samples])

    min_lag = int(sample_rate / 1200)
    max_lag = int(sample_rate / 80)

    best_lag = 0
    best_correlation = 0

    for lag in range(min_lag, max_lag - 1):
        if (
            correlations[lag] > correlations[lag - 1]
            and correlations[lag] > correlations[lag + 1]
            and correlations[lag] > best_correlation
        ):
            best_correlation = correlations[lag]
            best_lag = lag

    if best_lag > 0 and best_correlation > correlations[0] * 0.15:
        return sample_rate / best_lag

    return None


def apply_moving_average_filter(frames: List[PitchFrame], window_size: int = 3) -> List[PitchFrame]:
    if len(frames) < window_size:
        return frames

    filtered = []
    for i in range(len(frames)):
        start = max(0, i - window_size // 2)
        end = min(len(frames), i + window_size // 2 + 1)
        window = frames[start:end]

        midi_values = [f.midi for f in window if f.midi is not None]

        if midi_values:
            counter = Counter(midi_values)
            most_common = counter.most_common(1)
            if most_common and most_common[0][1] >= window_size // 2 + 1:
                filtered.append(frames[i])
            else:
                filtered.append(PitchFrame(
                    frequency=None,
                    midi=None,
                    noteName=None,
                    time=frames[i].time,
                    confidence=0,
                    isMajorScale=False
                ))
        else:
            filtered.append(PitchFrame(
                frequency=None,
                midi=None,
                noteName=None,
                time=frames[i].time,
                confidence=0,
                isMajorScale=False
            ))

    return filtered


def segment_notes(
    frames: List[PitchFrame],
    min_duration: float = 0.15,
    max_gap: float = 0.2
) -> List[Note]:
    notes: List[Note] = []
    if not frames:
        return notes

    current_midi: Optional[int] = None
    current_start: float = 0.0
    last_note_end: float = 0.0

    for frame in frames:
        if frame.midi is None:
            if current_midi is not None:
                duration = frame.time - current_start
                if duration >= min_duration:
                    notes.append(Note(
                        midi=current_midi,
                        name=midi_to_note_name(current_midi),
                        start=current_start,
                        end=frame.time,
                        confidence=frame.confidence or 0.5
                    ))
                    last_note_end = frame.time
                current_midi = None
        else:
            if current_midi is None:
                if frame.time - last_note_end < max_gap and notes:
                    current_midi = frame.midi
                    current_start = last_note_end
                else:
                    current_midi = frame.midi
                    current_start = frame.time
            elif frame.midi != current_midi:
                duration = frame.time - current_start
                if duration >= min_duration:
                    notes.append(Note(
                        midi=current_midi,
                        name=midi_to_note_name(current_midi),
                        start=current_start,
                        end=frame.time,
                        confidence=frame.confidence or 0.5
                    ))
                    last_note_end = frame.time
                current_midi = frame.midi
                current_start = frame.time

    if current_midi is not None and frames:
        duration = frames[-1].time - current_start
        if duration >= min_duration:
            notes.append(Note(
                midi=current_midi,
                name=midi_to_note_name(current_midi),
                start=current_start,
                end=frames[-1].time,
                confidence=0.5
            ))

    return notes


def remove_duplicate_notes(notes: List[Note], min_interval: float = 0.1) -> List[Note]:
    if len(notes) <= 1:
        return notes

    cleaned = [notes[0]]
    for note in notes[1:]:
        last_note = cleaned[-1]
        if note.midi == last_note.midi and note.start - last_note.end < min_interval:
            cleaned[-1] = Note(
                midi=last_note.midi,
                name=last_note.name,
                start=last_note.start,
                end=note.end,
                confidence=max(last_note.confidence or 0, note.confidence or 0)
            )
        else:
            cleaned.append(note)

    return cleaned


def filter_outliers(notes: List[Note]) -> List[Note]:
    if not notes:
        return notes

    midis = [n.midi for n in notes]
    median_midi = int(np.median(midis))
    threshold = 12

    return [n for n in notes if abs(n.midi - median_midi) <= threshold]


def detect_key(notes: List[Note]) -> Tuple[str, int]:
    if not notes:
        return "C", 0

    key_scores: Dict[str, int] = {}

    for key_name, root_pitch in KEY_ROOTS.items():
        scale_notes = set()
        for degree in MAJOR_SCALE_DEGREES:
            scale_notes.add((root_pitch + degree) % 12)

        score = 0
        for note in notes:
            if note.midi % 12 in scale_notes:
                score += 1
            scale_degree = (note.midi - root_pitch) % 12
            if scale_degree in [0, 4, 7]:
                score += 1

        key_scores[key_name] = score

    best_key = max(key_scores.items(), key=lambda x: x[1])[0]
    return best_key, KEY_ROOTS[best_key]


def get_diatonic_chords(key_root: int) -> List[ChordCandidate]:
    chords = []
    for chord_info in DIATONIC_CHORDS["major"]:
        degree = chord_info["degree"]
        midi_root = key_root + degree + 48
        chords.append(ChordCandidate(
            name=f"{NOTE_NAMES[midi_root % 12]}{'m' if chord_info['type'] == 'minor' else ''}{'dim' if chord_info['type'] == 'diminished' else ''}",
            roman_numeral=chord_info["name"],
            midi_root=midi_root,
            chord_type=chord_info["type"],
            score=0
        ))
    return chords


def generate_chord_notes(root_midi: int, chord_type: str) -> List[int]:
    intervals = CHORD_TYPES.get(chord_type, [0, 4, 7])
    return [root_midi + interval for interval in intervals]


def score_chord_for_notes(
    chord: ChordCandidate,
    notes_in_range: List[Note],
    harmonic_weight: float = 0.6,
    melodic_weight: float = 0.4
) -> float:
    if not notes_in_range:
        return 0.5

    chord_pitch_classes = set([(chord.midi_root + i) % 12 for i in CHORD_TYPES[chord.chord_type]])

    harmonic_score = 0
    melodic_score = 0
    total_duration = sum(n.end - n.start for n in notes_in_range)

    for note in notes_in_range:
        note_pc = note.midi % 12
        note_weight = (note.end - note.start) / total_duration if total_duration > 0 else 1

        if note_pc in chord_pitch_classes:
            harmonic_score += note_weight
        else:
            min_dist = 12
            for chord_pc in chord_pitch_classes:
                dist = min(abs(note_pc - chord_pc), 12 - abs(note_pc - chord_pc))
                if dist < min_dist:
                    min_dist = dist
            harmonic_score += note_weight * (1 - min_dist / 6)

        if note_pc == chord.midi_root % 12:
            melodic_score += note_weight * 0.5
        elif note_pc == (chord.midi_root + 7) % 12:
            melodic_score += note_weight * 0.3
        elif note_pc in chord_pitch_classes:
            melodic_score += note_weight * 0.2

    return harmonic_score * harmonic_weight + melodic_score * melodic_weight


def select_best_chord(
    candidates: List[ChordCandidate],
    notes_in_range: List[Note],
    previous_chord: Optional[ChordCandidate] = None,
    progression_bias: Dict[str, float] = None
) -> ChordCandidate:
    scored = []

    for candidate in candidates:
        base_score = score_chord_for_notes(candidate, notes_in_range)
        final_score = base_score

        if previous_chord:
            root_diff = abs(candidate.midi_root - previous_chord.midi_root) % 12
            if root_diff in [0, 5, 7]:
                final_score += 0.1
            elif root_diff in [2, 9]:
                final_score += 0.05

        if progression_bias and candidate.roman_numeral in progression_bias:
            final_score += progression_bias[candidate.roman_numeral]

        candidate.score = final_score
        scored.append(candidate)

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[0]


def detect_phrases(notes: List[Note], silence_threshold: float = 0.5) -> List[Tuple[float, float]]:
    if not notes:
        return []

    phrases = []
    phrase_start = notes[0].start

    for i in range(1, len(notes)):
        gap = notes[i].start - notes[i-1].end
        if gap > silence_threshold:
            phrases.append((phrase_start, notes[i-1].end))
            phrase_start = notes[i].start

    phrases.append((phrase_start, notes[-1].end))
    return phrases


def split_measure_intervals(
    start: float,
    end: float,
    bpm: float = 120,
    beats_per_measure: int = 4
) -> List[Tuple[float, float]]:
    beat_duration = 60.0 / bpm
    measure_duration = beat_duration * beats_per_measure
    chord_duration = measure_duration / 2

    intervals = []
    current = start

    while current < end:
        interval_end = min(current + chord_duration, end)
        intervals.append((current, interval_end))
        current = interval_end

    return intervals


def select_progression_pattern(
    candidates: List[ChordCandidate],
    notes: List[Note],
    num_chords: int
) -> List[str]:
    if num_chords <= 0:
        return []

    best_prog = COMMON_PROGRESSIONS[0]
    best_score = -1

    for progression in COMMON_PROGRESSIONS:
        score = 0
        candidate_map = {c.roman_numeral: c for c in candidates}

        for i in range(min(num_chords, len(progression))):
            degree = progression[i]
            if degree in candidate_map:
                chord = candidate_map[degree]
                score += score_chord_for_notes(chord, notes)

        if score > best_score:
            best_score = score
            best_prog = progression

    result = []
    for i in range(num_chords):
        result.append(best_prog[i % len(best_prog)])

    return result


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Humming to MIDI API v2.0 is running"}


@app.post("/api/transcribe-melody", response_model=TranscribeResponse)
async def transcribe_melody(request: TranscribeRequest):
    audio_array = np.array(request.audio_data, dtype=np.float32)
    sample_rate = request.sample_rate

    frame_size = 4096
    hop_size = 2048
    frames: List[PitchFrame] = []

    for i in range(0, len(audio_array) - frame_size, hop_size):
        frame_data = audio_array[i:i + frame_size]
        time = i / sample_rate

        pitch = autocorrelation_pitch(frame_data, sample_rate)

        if pitch is not None:
            midi = frequency_to_midi(pitch)
            if midi is not None:
                is_major = is_in_major_scale(midi)
                frames.append(PitchFrame(
                    frequency=pitch,
                    midi=midi,
                    noteName=midi_to_note_name(midi),
                    time=time,
                    confidence=0.7 if is_major else 0.4,
                    isMajorScale=is_major
                ))
            else:
                frames.append(PitchFrame(
                    frequency=None,
                    midi=None,
                    noteName=None,
                    time=time,
                    confidence=0,
                    isMajorScale=False
                ))
        else:
            frames.append(PitchFrame(
                frequency=None,
                midi=None,
                noteName=None,
                time=time,
                confidence=0,
                isMajorScale=False
            ))

    filtered_frames = apply_moving_average_filter(frames, window_size=3)

    notes = segment_notes(filtered_frames, min_duration=0.15, max_gap=0.2)
    notes = remove_duplicate_notes(notes)
    notes = filter_outliers(notes)

    key, _ = detect_key(notes)
    melody = " ".join([n.name for n in notes])

    return TranscribeResponse(
        notes=notes,
        melody=melody,
        key=key
    )


@app.post("/api/generate-chords", response_model=ChordResponse)
async def generate_chords(request: ChordRequest):
    notes = request.notes

    if not notes:
        return ChordResponse(chords=[], progression=[], key="C")

    key, key_root = detect_key(notes)

    total_duration = notes[-1].end if notes else 0

    phrases = detect_phrases(notes, silence_threshold=0.5)

    diatonic_chords = get_diatonic_chords(key_root)

    all_intervals = []
    for phrase_start, phrase_end in phrases:
        phrase_notes = [
            n for n in notes
            if not (n.end < phrase_start or n.start > phrase_end)
        ]

        if not phrase_notes:
            continue

        phrase_duration = phrase_end - phrase_start
        num_chords = max(2, min(8, int(phrase_duration / 2.0)))

        beat_duration = phrase_duration / num_chords
        for i in range(num_chords):
            interval_start = phrase_start + i * beat_duration
            interval_end = phrase_start + (i + 1) * beat_duration
            all_intervals.append((interval_start, interval_end))

    if not all_intervals:
        return ChordResponse(chords=[], progression=[], key=key)

    chords: List[Chord] = []
    progression: List[str] = []
    previous_chord: Optional[ChordCandidate] = None

    num_intervals = len(all_intervals)
    pattern = select_progression_pattern(diatonic_chords, notes, num_intervals)

    progression_bias_list: List[Dict[str, float]] = []
    for degree in pattern:
        bias = {d: 0.0 for d in ["I", "ii", "iii", "IV", "V", "vi", "viidim"]}
        bias[degree] = 0.3
        progression_bias_list.append(bias)

    for idx, (start, end) in enumerate(all_intervals):
        notes_in_range = [
            n for n in notes
            if not (n.end < start or n.start > end)
        ]

        bias = progression_bias_list[idx] if idx < len(progression_bias_list) else None
        best_chord = select_best_chord(
            diatonic_chords,
            notes_in_range,
            previous_chord,
            bias
        )

        chords.append(Chord(
            name=f"{key}: {best_chord.name}",
            start=start,
            end=end,
            notes=generate_chord_notes(best_chord.midi_root, best_chord.chord_type),
            roman_numeral=best_chord.roman_numeral
        ))
        progression.append(best_chord.roman_numeral)
        previous_chord = best_chord

    return ChordResponse(
        chords=chords,
        progression=progression,
        key=key
    )
