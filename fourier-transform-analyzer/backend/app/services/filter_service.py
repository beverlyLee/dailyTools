import numpy as np
from scipy.signal import butter, filtfilt, lfilter
from typing import Optional

from app.models.schemas import FilterType, FilterParams

def design_filter(
    filter_type: FilterType,
    cutoff_low: Optional[float],
    cutoff_high: Optional[float],
    sampling_rate: float,
    order: int = 4
) -> tuple[np.ndarray, np.ndarray]:
    nyquist = 0.5 * sampling_rate
    
    if filter_type == FilterType.lowpass:
        if cutoff_low is None:
            raise ValueError("低通滤波器需要指定 cutoff_low 参数")
        normal_cutoff = cutoff_low / nyquist
        b, a = butter(order, normal_cutoff, btype='low', analog=False)
        
    elif filter_type == FilterType.highpass:
        if cutoff_high is None:
            raise ValueError("高通滤波器需要指定 cutoff_high 参数")
        normal_cutoff = cutoff_high / nyquist
        b, a = butter(order, normal_cutoff, btype='high', analog=False)
        
    elif filter_type == FilterType.bandstop:
        if cutoff_low is None or cutoff_high is None:
            raise ValueError("带阻滤波器需要同时指定 cutoff_low 和 cutoff_high 参数")
        normal_cutoff_low = cutoff_low / nyquist
        normal_cutoff_high = cutoff_high / nyquist
        b, a = butter(order, [normal_cutoff_low, normal_cutoff_high], btype='bandstop', analog=False)
        
    else:
        raise ValueError(f"不支持的滤波器类型: {filter_type}")
    
    return b, a

def apply_filter(
    signal: np.ndarray,
    filter_params: FilterParams,
    sampling_rate: float
) -> np.ndarray:
    if filter_params.filter_type == FilterType.none:
        return signal.copy()
    
    b, a = design_filter(
        filter_type=filter_params.filter_type,
        cutoff_low=filter_params.cutoff_low,
        cutoff_high=filter_params.cutoff_high,
        sampling_rate=sampling_rate,
        order=filter_params.order
    )
    
    filtered_signal = filtfilt(b, a, signal)
    
    return filtered_signal
