import json
from typing import Dict, Any, List, Optional
import mido
from mido import MidiFile, MidiTrack, Message, MetaMessage
import io


class StyleProcessorService:
    FOLK_INSTRUMENTS = {
        "guzheng": 105,
        "erhu": 111,
        "pipa": 104,
        "dizi": 74,
        "suona": 114
    }
    
    MODERN_INSTRUMENTS = {
        "synth_lead": 80,
        "synth_pad": 88,
        "electric_piano": 4,
        "strings": 48,
        "drums": 118
    }
    
    def __init__(self):
        self.note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    def process_midi(
        self,
        midi_data: str,
        folk_ratio: float,
        modern_ratio: float
    ) -> str:
        midi_json = json.loads(midi_data)
        
        processed_tracks = []
        for track in midi_json.get("tracks", []):
            processed_track = self._process_track(
                track,
                folk_ratio,
                modern_ratio
            )
            processed_tracks.append(processed_track)
        
        if folk_ratio > 0.3:
            folk_track = self._create_folk_track(folk_ratio, midi_json)
            processed_tracks.append(folk_track)
        
        if modern_ratio > 0.3:
            modern_track = self._create_modern_track(modern_ratio, midi_json)
            processed_tracks.append(modern_track)
        
        midi_json["tracks"] = processed_tracks
        midi_json["folk_ratio"] = folk_ratio
        midi_json["modern_ratio"] = modern_ratio
        
        return json.dumps(midi_json)
    
    def _process_track(
        self,
        track: Dict[str, Any],
        folk_ratio: float,
        modern_ratio: float
    ) -> Dict[str, Any]:
        processed_track = track.copy()
        
        if folk_ratio > modern_ratio:
            processed_track["instrument"] = self._select_folk_instrument(folk_ratio)
            processed_track["notes"] = self._apply_folk_scale(track.get("notes", []))
        else:
            processed_track["instrument"] = self._select_modern_instrument(modern_ratio)
            processed_track["notes"] = self._apply_modern_articulation(track.get("notes", []))
        
        return processed_track
    
    def _select_folk_instrument(self, folk_ratio: float) -> str:
        if folk_ratio > 0.8:
            return "Guzheng"
        elif folk_ratio > 0.6:
            return "Erhu"
        else:
            return "Pipa"
    
    def _select_modern_instrument(self, modern_ratio: float) -> str:
        if modern_ratio > 0.8:
            return "Synth Lead"
        elif modern_ratio > 0.6:
            return "Electric Piano"
        else:
            return "Synth Pad"
    
    def _apply_folk_scale(self, notes: List[Dict]) -> List[Dict]:
        pentatonic_scale = [0, 2, 4, 7, 9]
        
        processed_notes = []
        for note in notes:
            pitch = note.get("pitch", 60)
            octave = pitch // 12
            pitch_class = pitch % 12
            
            closest_pitch_class = min(
                pentatonic_scale,
                key=lambda x: min(abs(pitch_class - x), 12 - abs(pitch_class - x))
            )
            
            new_pitch = octave * 12 + closest_pitch_class
            
            processed_note = note.copy()
            processed_note["pitch"] = new_pitch
            processed_note["velocity"] = min(127, note.get("velocity", 80) + 5)
            
            processed_notes.append(processed_note)
        
        return processed_notes
    
    def _apply_modern_articulation(self, notes: List[Dict]) -> List[Dict]:
        processed_notes = []
        for i, note in enumerate(notes):
            processed_note = note.copy()
            
            if i % 4 == 0:
                processed_note["velocity"] = min(127, note.get("velocity", 80) + 15)
            
            if i % 2 == 1:
                processed_note["duration"] = note.get("duration", 0.25) * 0.8
            
            processed_notes.append(processed_note)
        
        return processed_notes
    
    def _create_folk_track(self, folk_ratio: float, base_midi: Dict) -> Dict:
        base_notes = base_midi.get("tracks", [{}])[0].get("notes", [])
        
        if not base_notes:
            return {
                "name": "Folk Accompaniment",
                "instrument": "Guzheng",
                "notes": []
            }
        
        accompaniment_notes = []
        for i in range(0, len(base_notes), 2):
            base_note = base_notes[i]
            bass_pitch = base_note.get("pitch", 60) - 24
            
            accompaniment_notes.append({
                "pitch": bass_pitch,
                "start": base_note.get("start", 0),
                "duration": 0.5,
                "velocity": 60
            })
            
            accompaniment_notes.append({
                "pitch": bass_pitch + 7,
                "start": base_note.get("start", 0) + 0.25,
                "duration": 0.25,
                "velocity": 55
            })
        
        return {
            "name": "Folk Accompaniment",
            "instrument": self._select_folk_instrument(folk_ratio),
            "notes": accompaniment_notes
        }
    
    def _create_modern_track(self, modern_ratio: float, base_midi: Dict) -> Dict:
        total_duration = 8.0
        
        drum_notes = []
        for beat in range(int(total_duration * 4)):
            time = beat * 0.25
            
            if beat % 4 == 0:
                drum_notes.append({
                    "pitch": 36,
                    "start": time,
                    "duration": 0.2,
                    "velocity": 100
                })
            
            if beat % 4 == 2:
                drum_notes.append({
                    "pitch": 42,
                    "start": time,
                    "duration": 0.15,
                    "velocity": 80
                })
            
            drum_notes.append({
                "pitch": 42,
                "start": time,
                "duration": 0.1,
                "velocity": 60
            })
        
        return {
            "name": "Modern Rhythm",
            "instrument": "Drums",
            "notes": drum_notes
        }
    
    def json_to_midi(self, midi_json: str) -> bytes:
        data = json.loads(midi_json)
        
        mid = MidiFile()
        tempo = data.get("tempo", 120)
        ticks_per_beat = 480
        
        for track_data in data.get("tracks", []):
            track = MidiTrack()
            mid.tracks.append(track)
            
            track.append(MetaMessage('set_tempo', tempo=mido.bpm2tempo(tempo)))
            track.append(MetaMessage('track_name', name=track_data.get("name", "Track")))
            
            instrument_name = track_data.get("instrument", "Piano")
            program = self._get_program_number(instrument_name)
            track.append(Message('program_change', program=program, time=0))
            
            notes = track_data.get("notes", [])
            notes_sorted = sorted(notes, key=lambda x: x.get("start", 0))
            
            current_time = 0
            for note in notes_sorted:
                pitch = note.get("pitch", 60)
                start = note.get("start", 0)
                duration = note.get("duration", 0.25)
                velocity = note.get("velocity", 80)
                
                delta_ticks = int((start - current_time) * ticks_per_beat)
                if delta_ticks > 0:
                    track.append(Message('note_on', note=pitch, velocity=0, time=delta_ticks))
                else:
                    track.append(Message('note_on', note=pitch, velocity=0, time=0))
                
                track.append(Message('note_on', note=pitch, velocity=velocity, time=0))
                
                duration_ticks = int(duration * ticks_per_beat)
                track.append(Message('note_off', note=pitch, velocity=64, time=duration_ticks))
                
                current_time = start + duration
        
        output = io.BytesIO()
        mid.save(file=output)
        return output.getvalue()
    
    def _get_program_number(self, instrument_name: str) -> int:
        name_lower = instrument_name.lower()
        
        folk_map = {
            "guzheng": 105,
            "erhu": 111,
            "pipa": 104,
            "dizi": 74,
            "suona": 114,
            "folk": 105
        }
        
        modern_map = {
            "synth lead": 80,
            "synth pad": 88,
            "electric piano": 4,
            "drums": 0,
            "strings": 48,
            "piano": 0
        }
        
        for key, value in folk_map.items():
            if key in name_lower:
                return value
        
        for key, value in modern_map.items():
            if key in name_lower:
                return value
        
        return 0
    
    def get_style_analysis(self, midi_data: str) -> Dict[str, Any]:
        data = json.loads(midi_data)
        
        folk_ratio = data.get("folk_ratio", 0.5)
        modern_ratio = data.get("modern_ratio", 0.5)
        
        instruments = []
        pitches = []
        
        for track in data.get("tracks", []):
            instruments.append(track.get("instrument", "Unknown"))
            for note in track.get("notes", []):
                pitches.append(note.get("pitch", 60))
        
        folk_instruments_used = [
            inst for inst in instruments 
            if any(folk in inst.lower() for folk in ["guzheng", "erhu", "pipa", "dizi", "suona", "folk"])
        ]
        
        modern_instruments_used = [
            inst for inst in instruments
            if any(mod in inst.lower() for mod in ["synth", "electric", "drum", "modern"])
        ]
        
        return {
            "folk_ratio": folk_ratio,
            "modern_ratio": modern_ratio,
            "style_category": self._determine_style(folk_ratio, modern_ratio),
            "instruments": instruments,
            "folk_instruments": folk_instruments_used,
            "modern_instruments": modern_instruments_used,
            "total_notes": len(pitches),
            "pitch_range": {
                "min": min(pitches) if pitches else 0,
                "max": max(pitches) if pitches else 0
            }
        }
    
    def _determine_style(self, folk_ratio: float, modern_ratio: float) -> str:
        if folk_ratio > 0.7:
            return "传统民乐风"
        elif modern_ratio > 0.7:
            return "现代电子风"
        elif folk_ratio > 0.4 and modern_ratio > 0.4:
            return "国潮融合风"
        else:
            return "平衡风格"


style_processor = StyleProcessorService()
