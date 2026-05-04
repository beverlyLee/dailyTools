from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SignalType(str, Enum):
    sine = "sine"
    square = "square"
    triangle = "triangle"
    noise = "noise"
    composite = "composite"

class FilterType(str, Enum):
    lowpass = "lowpass"
    highpass = "highpass"
    bandstop = "bandstop"
    none = "none"

class SignalParams(BaseModel):
    signal_type: SignalType = Field(default=SignalType.sine, description="信号类型")
    amplitude: float = Field(default=1.0, ge=0.1, le=10.0, description="振幅")
    frequency: float = Field(default=10.0, ge=0.1, le=1000.0, description="频率 (Hz)")
    phase: float = Field(default=0.0, description="相位 (弧度)")
    duration: float = Field(default=1.0, ge=0.1, le=10.0, description="持续时间 (秒)")
    sampling_rate: float = Field(default=1000.0, ge=100.0, le=10000.0, description="采样率 (Hz)")
    composite_components: Optional[List[Dict[str, Any]]] = Field(default=None, description="复合信号分量")
    noise_level: float = Field(default=0.0, ge=0.0, le=5.0, description="噪声水平")

class FilterParams(BaseModel):
    filter_type: FilterType = Field(default=FilterType.none, description="滤波器类型")
    cutoff_low: Optional[float] = Field(default=None, description="低截止频率 (Hz)")
    cutoff_high: Optional[float] = Field(default=None, description="高截止频率 (Hz)")
    order: int = Field(default=4, ge=1, le=10, description="滤波器阶数")

class SignalRequest(BaseModel):
    signal_params: SignalParams
    filter_params: Optional[FilterParams] = None
    perform_stft: bool = Field(default=False, description="是否执行 STFT")
    stft_window_size: int = Field(default=256, ge=64, le=2048, description="STFT 窗口大小")
    stft_overlap: float = Field(default=0.5, ge=0.0, lt=1.0, description="STFT 重叠比例")

class FrequencyDomainData(BaseModel):
    frequencies: List[float]
    magnitude: List[float]
    phase: Optional[List[float]] = None

class STFTData(BaseModel):
    frequencies: List[float]
    times: List[float]
    magnitude: List[List[float]]
    magnitude_db: List[List[float]]

class SignalResponse(BaseModel):
    time: List[float]
    original_signal: List[float]
    filtered_signal: Optional[List[float]] = None
    frequency_domain: FrequencyDomainData
    filtered_frequency_domain: Optional[FrequencyDomainData] = None
    stft_data: Optional[STFTData] = None
    signal_params: SignalParams
    filter_params: Optional[FilterParams] = None

class SnapshotCreate(BaseModel):
    name: str = Field(default="", description="快照名称")
    description: Optional[str] = Field(default=None, description="快照描述")
    signal_params: Dict[str, Any]
    filter_params: Optional[Dict[str, Any]] = None
    time_data: List[float]
    original_signal: List[float]
    filtered_signal: Optional[List[float]] = None
    frequency_domain: List[float]
    magnitude: List[float]
    stft_data: Optional[Dict[str, Any]] = None

class SnapshotResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    signal_params: Dict[str, Any]
    filter_params: Optional[Dict[str, Any]]
    time_data: List[float]
    original_signal: List[float]
    filtered_signal: Optional[List[float]]
    frequency: List[float]
    magnitude: List[float]
    stft_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class SnapshotListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    signal_type: str

    class Config:
        from_attributes = True
