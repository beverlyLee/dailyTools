from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.schemas import (
    SignalRequest,
    SignalResponse,
    FrequencyDomainData,
    STFTData
)
from app.services.signal_generator import generate_signal
from app.services.fourier_service import compute_fft, compute_stft
from app.services.filter_service import apply_filter

router = APIRouter()

@router.post("/generate", response_model=SignalResponse)
async def generate_and_analyze_signal(request: SignalRequest):
    try:
        t, original_signal = generate_signal(request.signal_params)
        
        freq_domain = compute_fft(original_signal, request.signal_params.sampling_rate)
        
        filtered_signal = None
        filtered_freq_domain = None
        
        if request.filter_params and request.filter_params.filter_type != "none":
            filtered_signal = apply_filter(
                original_signal,
                request.filter_params,
                request.signal_params.sampling_rate
            )
            filtered_freq_domain = compute_fft(filtered_signal, request.signal_params.sampling_rate)
        
        stft_data = None
        if request.perform_stft:
            signal_to_stft = filtered_signal if filtered_signal is not None else original_signal
            stft_data = compute_stft(
                signal_to_stft,
                request.signal_params.sampling_rate,
                request.stft_window_size,
                request.stft_overlap
            )
        
        return SignalResponse(
            time=t.tolist(),
            original_signal=original_signal.tolist(),
            filtered_signal=filtered_signal.tolist() if filtered_signal is not None else None,
            frequency_domain=freq_domain,
            filtered_frequency_domain=filtered_freq_domain,
            stft_data=stft_data,
            signal_params=request.signal_params,
            filter_params=request.filter_params
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"信号处理错误: {str(e)}")

@router.post("/filter-only", response_model=SignalResponse)
async def filter_signal_only(request: SignalRequest):
    try:
        if not request.filter_params or request.filter_params.filter_type == "none":
            raise HTTPException(status_code=400, detail="需要指定滤波器参数")
        
        t, original_signal = generate_signal(request.signal_params)
        
        filtered_signal = apply_filter(
            original_signal,
            request.filter_params,
            request.signal_params.sampling_rate
        )
        
        freq_domain = compute_fft(original_signal, request.signal_params.sampling_rate)
        filtered_freq_domain = compute_fft(filtered_signal, request.signal_params.sampling_rate)
        
        return SignalResponse(
            time=t.tolist(),
            original_signal=original_signal.tolist(),
            filtered_signal=filtered_signal.tolist(),
            frequency_domain=freq_domain,
            filtered_frequency_domain=filtered_freq_domain,
            signal_params=request.signal_params,
            filter_params=request.filter_params
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"滤波错误: {str(e)}")
