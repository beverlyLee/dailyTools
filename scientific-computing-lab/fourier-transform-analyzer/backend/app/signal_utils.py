import numpy as np
from scipy import signal
from scipy.fft import fft, fftfreq, fftshift
from scipy.signal import stft, butter, lfilter, chirp

def generate_time_vector(sample_rate, duration):
    return np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

def generate_sine_wave(t, frequency, amplitude, phase):
    return amplitude * np.sin(2 * np.pi * frequency * t + phase * np.pi)

def generate_square_wave(t, frequency, amplitude, phase, duty_cycle=0.5):
    return amplitude * signal.square(2 * np.pi * frequency * t + phase * np.pi, duty=duty_cycle)

def generate_triangle_wave(t, frequency, amplitude, phase):
    return amplitude * signal.sawtooth(2 * np.pi * frequency * t + phase * np.pi, width=0.5)

def generate_sawtooth_wave(t, frequency, amplitude, phase):
    return amplitude * signal.sawtooth(2 * np.pi * frequency * t + phase * np.pi, width=1.0)

def generate_white_noise(t, amplitude):
    return amplitude * np.random.randn(len(t))

def generate_chirp_signal(t, f0, f1, amplitude, phase):
    duration = t[-1]
    return amplitude * chirp(t, f0=f0, f1=f1, t1=duration, method='linear', phi=phase * 180 / np.pi)

def generate_signal(signal_type, frequencies, amplitudes, sample_rate, duration, 
                    noise_level=0, phase=0, duty_cycle=50):
    t = generate_time_vector(sample_rate, duration)
    signal_data = np.zeros(len(t))
    
    duty = duty_cycle / 100.0
    
    if signal_type == 'white_noise':
        signal_data = generate_white_noise(t, 1.0)
    elif signal_type == 'chirp':
        if len(frequencies) >= 2:
            f0, f1 = frequencies[0], frequencies[1]
            amp = amplitudes[0] if amplitudes else 1.0
            signal_data = generate_chirp_signal(t, f0, f1, amp, phase)
        else:
            signal_data = generate_chirp_signal(t, 10, 100, 1.0, phase)
    else:
        for freq, amp in zip(frequencies, amplitudes):
            if signal_type == 'sine':
                signal_data += generate_sine_wave(t, freq, amp, phase)
            elif signal_type == 'square':
                signal_data += generate_square_wave(t, freq, amp, phase, duty)
            elif signal_type == 'triangle':
                signal_data += generate_triangle_wave(t, freq, amp, phase)
            elif signal_type == 'sawtooth':
                signal_data += generate_sawtooth_wave(t, freq, amp, phase)
    
    if noise_level > 0:
        noise = noise_level * np.random.randn(len(t))
        signal_data += noise
    
    return {
        'time': t.tolist(),
        'signal': signal_data.tolist()
    }

def compute_fft(signal_data, sample_rate):
    n = len(signal_data)
    yf = fft(signal_data)
    xf = fftfreq(n, 1 / sample_rate)
    
    positive_freq_idx = xf >= 0
    positive_freqs = xf[positive_freq_idx]
    magnitude = np.abs(yf[positive_freq_idx]) / n
    magnitude = magnitude * 2
    magnitude[0] = magnitude[0] / 2
    
    return {
        'frequencies': positive_freqs.tolist(),
        'magnitude': magnitude.tolist(),
        'phase': np.angle(yf[positive_freq_idx]).tolist()
    }

def compute_stft(signal_data, sample_rate, nperseg=256, noverlap=128):
    f, t, Zxx = stft(signal_data, fs=sample_rate, nperseg=nperseg, noverlap=noverlap)
    
    return {
        'frequencies': f.tolist(),
        'time': t.tolist(),
        'magnitude': np.abs(Zxx).tolist(),
        'phase': np.angle(Zxx).tolist()
    }

def butter_filter(filter_type, cutoff, fs, order=5):
    nyq = 0.5 * fs
    
    if filter_type == 'lowpass':
        normal_cutoff = cutoff / nyq
        b, a = butter(order, normal_cutoff, btype='low', analog=False)
    elif filter_type == 'highpass':
        normal_cutoff = cutoff / nyq
        b, a = butter(order, normal_cutoff, btype='high', analog=False)
    elif filter_type == 'bandstop' or filter_type == 'bandpass':
        btype = 'bandstop' if filter_type == 'bandstop' else 'bandpass'
        low, high = cutoff
        low = low / nyq
        high = high / nyq
        b, a = butter(order, [low, high], btype=btype, analog=False)
    
    return b, a

def apply_filter_to_signal(signal_data, sample_rate, filter_type, low_cutoff=None, high_cutoff=None, order=5):
    if filter_type == 'none':
        return signal_data
    
    if filter_type in ['lowpass', 'highpass']:
        cutoff = low_cutoff if filter_type == 'lowpass' else high_cutoff
        b, a = butter_filter(filter_type, cutoff, sample_rate, order)
    elif filter_type in ['bandstop', 'bandpass']:
        b, a = butter_filter(filter_type, [low_cutoff, high_cutoff], sample_rate, order)
    else:
        return signal_data
    
    filtered_signal = lfilter(b, a, signal_data)
    
    return filtered_signal.tolist()
