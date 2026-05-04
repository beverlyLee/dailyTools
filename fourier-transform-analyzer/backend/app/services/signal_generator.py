import numpy as np
from typing import List, Dict, Any, Optional
from app.models.schemas import SignalType, SignalParams

def generate_signal(params: SignalParams) -> tuple[np.ndarray, np.ndarray]:
    t = np.linspace(0, params.duration, int(params.sampling_rate * params.duration), endpoint=False)
    
    if params.signal_type == SignalType.sine:
        signal = generate_sine_wave(t, params.frequency, params.amplitude, params.phase)
    elif params.signal_type == SignalType.square:
        signal = generate_square_wave(t, params.frequency, params.amplitude)
    elif params.signal_type == SignalType.triangle:
        signal = generate_triangle_wave(t, params.frequency, params.amplitude)
    elif params.signal_type == SignalType.noise:
        signal = generate_white_noise(t, params.amplitude)
    elif params.signal_type == SignalType.composite:
        signal = generate_composite_signal(t, params.composite_components, params.amplitude)
    else:
        signal = np.zeros_like(t)
    
    if params.noise_level > 0:
        noise = np.random.normal(0, params.noise_level, size=len(t))
        signal += noise
    
    return t, signal

def generate_sine_wave(t: np.ndarray, frequency: float, amplitude: float = 1.0, phase: float = 0.0) -> np.ndarray:
    return amplitude * np.sin(2 * np.pi * frequency * t + phase)

def generate_square_wave(t: np.ndarray, frequency: float, amplitude: float = 1.0) -> np.ndarray:
    period = 1.0 / frequency
    phase = t % period
    return amplitude * np.where(phase < period / 2, 1, -1)

def generate_triangle_wave(t: np.ndarray, frequency: float, amplitude: float = 1.0) -> np.ndarray:
    period = 1.0 / frequency
    phase = t % period
    normalized_phase = phase / period
    return amplitude * (4 * np.abs(normalized_phase - 0.5) - 1)

def generate_white_noise(t: np.ndarray, amplitude: float = 1.0) -> np.ndarray:
    return amplitude * np.random.randn(len(t))

def generate_composite_signal(
    t: np.ndarray, 
    components: Optional[List[Dict[str, Any]]],
    base_amplitude: float = 1.0
) -> np.ndarray:
    signal = np.zeros_like(t)
    
    if not components:
        return signal
    
    for comp in components:
        comp_type = comp.get("type", "sine")
        freq = comp.get("frequency", 10.0)
        amp = comp.get("amplitude", base_amplitude)
        phase = comp.get("phase", 0.0)
        
        if comp_type == "sine":
            signal += amp * np.sin(2 * np.pi * freq * t + phase)
        elif comp_type == "square":
            period = 1.0 / freq
            phase_arr = t % period
            signal += amp * np.where(phase_arr < period / 2, 1, -1)
        elif comp_type == "triangle":
            period = 1.0 / freq
            phase_arr = t % period
            normalized_phase = phase_arr / period
            signal += amp * (4 * np.abs(normalized_phase - 0.5) - 1)
    
    return signal
