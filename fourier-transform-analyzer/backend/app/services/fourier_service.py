import numpy as np
from scipy.fft import fft, fftfreq, fftshift
from scipy.signal import stft as scipy_stft
from typing import Dict, Any, Optional, Tuple, List

from app.models.schemas import FrequencyDomainData, STFTData

def compute_fft(
    signal: np.ndarray,
    sampling_rate: float
) -> FrequencyDomainData:
    n = len(signal)
    yf = fft(signal)
    xf = fftfreq(n, 1 / sampling_rate)
    
    positive_freq_idx = xf >= 0
    freqs = xf[positive_freq_idx]
    magnitude = np.abs(yf[positive_freq_idx]) / n
    phase = np.angle(yf[positive_freq_idx])
    
    return FrequencyDomainData(
        frequencies=freqs.tolist(),
        magnitude=magnitude.tolist(),
        phase=phase.tolist()
    )

def compute_stft(
    signal: np.ndarray,
    sampling_rate: float,
    window_size: int = 256,
    overlap: float = 0.5
) -> STFTData:
    noverlap = int(window_size * overlap)
    
    f, t_stft, Zxx = scipy_stft(
        signal,
        fs=sampling_rate,
        window='hann',
        nperseg=window_size,
        noverlap=noverlap,
        scaling='spectrum'
    )
    
    magnitude = np.abs(Zxx)
    magnitude_db = 20 * np.log10(magnitude + 1e-10)
    
    return STFTData(
        frequencies=f.tolist(),
        times=t_stft.tolist(),
        magnitude=magnitude.tolist(),
        magnitude_db=magnitude_db.tolist()
    )

def extract_dominant_frequency(
    freq_data: FrequencyDomainData,
    threshold_ratio: float = 0.1
) -> List[Dict[str, float]]:
    magnitudes = np.array(freq_data.magnitude)
    frequencies = np.array(freq_data.frequencies)
    
    max_mag = np.max(magnitudes)
    threshold = max_mag * threshold_ratio
    
    peaks = []
    for i in range(1, len(magnitudes) - 1):
        if magnitudes[i] > threshold and magnitudes[i] > magnitudes[i-1] and magnitudes[i] > magnitudes[i+1]:
            peaks.append({
                "frequency": float(frequencies[i]),
                "magnitude": float(magnitudes[i])
            })
    
    peaks.sort(key=lambda x: x["magnitude"], reverse=True)
    return peaks
