use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

#[wasm_bindgen]
pub struct RingBuffer {
    buffer: Vec<f32>,
    read_index: usize,
    write_index: usize,
    size: usize,
    capacity: usize,
}

#[wasm_bindgen]
impl RingBuffer {
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: usize) -> Self {
        RingBuffer {
            buffer: vec![0.0; capacity],
            read_index: 0,
            write_index: 0,
            size: 0,
            capacity,
        }
    }

    #[wasm_bindgen]
    pub fn write(&mut self, samples: &[f32]) -> usize {
        let mut written = 0;
        for &sample in samples {
            if self.size >= self.capacity {
                break;
            }
            self.buffer[self.write_index] = sample;
            self.write_index = (self.write_index + 1) % self.capacity;
            self.size += 1;
            written += 1;
        }
        written
    }

    #[wasm_bindgen]
    pub fn read(&mut self, length: usize) -> Vec<f32> {
        let to_read = length.min(self.size);
        let mut result = Vec::with_capacity(to_read);
        for _ in 0..to_read {
            result.push(self.buffer[self.read_index]);
            self.read_index = (self.read_index + 1) % self.capacity;
            self.size -= 1;
        }
        result
    }

    #[wasm_bindgen]
    pub fn peek(&self, length: usize) -> Vec<f32> {
        let to_read = length.min(self.size);
        let mut result = Vec::with_capacity(to_read);
        for i in 0..to_read {
            let index = (self.read_index + i) % self.capacity;
            result.push(self.buffer[index]);
        }
        result
    }

    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.read_index = 0;
        self.write_index = 0;
        self.size = 0;
        self.buffer.fill(0.0);
    }

    #[wasm_bindgen]
    pub fn is_empty(&self) -> bool {
        self.size == 0
    }

    #[wasm_bindgen]
    pub fn is_full(&self) -> bool {
        self.size == self.capacity
    }

    #[wasm_bindgen]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    #[wasm_bindgen]
    pub fn size(&self) -> usize {
        self.size
    }
}

#[wasm_bindgen]
pub struct VAD {
    sample_rate: u32,
    aggressiveness: u32,
    frame_history: VecDeque<bool>,
    history_size: usize,
    speech_threshold: f32,
    silence_threshold: f32,
    consecutive_speech_frames: usize,
    consecutive_silence_frames: usize,
}

#[wasm_bindgen]
impl VAD {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: u32, aggressiveness: u32) -> Self {
        let history_size = match aggressiveness {
            0 => 3,
            1 => 5,
            2 => 8,
            _ => 12,
        };

        VAD {
            sample_rate,
            aggressiveness,
            frame_history: VecDeque::with_capacity(history_size),
            history_size,
            speech_threshold: 0.5 + (aggressiveness as f32) * 0.1,
            silence_threshold: 0.3,
            consecutive_speech_frames: 0,
            consecutive_silence_frames: 0,
        }
    }

    #[wasm_bindgen]
    pub fn process(&mut self, samples: &[f32]) -> bool {
        let energy = Self::compute_rms(samples);
        let zcr = Self::compute_zcr(samples);
        
        let is_speech_frame = self.classify_frame(energy, zcr, samples.len());
        
        self.frame_history.push_back(is_speech_frame);
        if self.frame_history.len() > self.history_size {
            self.frame_history.pop_front();
        }

        if is_speech_frame {
            self.consecutive_speech_frames += 1;
            self.consecutive_silence_frames = 0;
        } else {
            self.consecutive_silence_frames += 1;
            self.consecutive_speech_frames = 0;
        }

        let speech_count = self.frame_history.iter().filter(|&&x| x).count();
        let is_speech = speech_count as f32 >= self.frame_history.len() as f32 * self.speech_threshold;

        is_speech
    }

    fn classify_frame(&self, energy: f32, zcr: f32, frame_len: usize) -> bool {
        let frame_duration_ms = (frame_len as f32 / self.sample_rate as f32) * 1000.0;
        
        let min_energy_threshold = match self.aggressiveness {
            0 => 0.01,
            1 => 0.02,
            2 => 0.03,
            _ => 0.05,
        };

        if energy < min_energy_threshold {
            return false;
        }

        let zcr_threshold = 0.1;
        let high_energy = energy > 0.1;
        let low_zcr = zcr < zcr_threshold;

        if frame_duration_ms >= 10.0 && frame_duration_ms <= 30.0 {
            high_energy && low_zcr
        } else {
            high_energy
        }
    }

    fn compute_rms(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }

        let mut sum = 0.0;
        for &sample in samples {
            sum += sample * sample;
        }
        (sum / samples.len() as f32).sqrt()
    }

    fn compute_zcr(samples: &[f32]) -> f32 {
        if samples.len() < 2 {
            return 0.0;
        }

        let mut crossings = 0;
        for i in 1..samples.len() {
            if (samples[i] >= 0.0 && samples[i - 1] < 0.0) || 
               (samples[i] < 0.0 && samples[i - 1] >= 0.0) {
                crossings += 1;
            }
        }

        crossings as f32 / (samples.len() - 1) as f32
    }

    #[wasm_bindgen]
    pub fn set_aggressiveness(&mut self, level: u32) {
        self.aggressiveness = level.clamp(0, 3);
        self.history_size = match self.aggressiveness {
            0 => 3,
            1 => 5,
            2 => 8,
            _ => 12,
        };
        self.speech_threshold = 0.5 + (self.aggressiveness as f32) * 0.1;
        self.frame_history.clear();
    }

    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.frame_history.clear();
        self.consecutive_speech_frames = 0;
        self.consecutive_silence_frames = 0;
    }
}

#[wasm_bindgen]
pub struct VoiceWakeupDetector {
    sample_rate: u32,
    frame_size: usize,
    wake_word: String,
    threshold: f32,
    ring_buffer: RingBuffer,
    feature_buffer: VecDeque<Vec<f32>>,
    max_feature_frames: usize,
    wake_word_model: WakeWordModel,
}

struct WakeWordModel {
    mfcc_coefficients: usize,
    hidden_size: usize,
    weights: Vec<Vec<f32>>,
    biases: Vec<f32>,
}

impl WakeWordModel {
    fn new() -> Self {
        WakeWordModel {
            mfcc_coefficients: 13,
            hidden_size: 64,
            weights: Vec::new(),
            biases: Vec::new(),
        }
    }

    fn predict(&self, _features: &[f32]) -> f32 {
        0.0
    }
}

#[wasm_bindgen]
impl VoiceWakeupDetector {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: u32, frame_size: usize) -> Self {
        let buffer_capacity = sample_rate as usize * 3;
        
        VoiceWakeupDetector {
            sample_rate,
            frame_size,
            wake_word: "你好小明".to_string(),
            threshold: 0.8,
            ring_buffer: RingBuffer::new(buffer_capacity),
            feature_buffer: VecDeque::new(),
            max_feature_frames: 100,
            wake_word_model: WakeWordModel::new(),
        }
    }

    #[wasm_bindgen]
    pub fn set_wake_word(&mut self, word: String) {
        self.wake_word = word;
    }

    #[wasm_bindgen]
    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold.clamp(0.0, 1.0);
    }

    #[wasm_bindgen]
    pub fn process(&mut self, samples: &[f32]) -> JsValue {
        self.ring_buffer.write(samples);
        
        let confidence = self.detect_wake_word(samples);
        
        let detected = confidence >= self.threshold;
        
        let result = js_sys::Object::new();
        
        js_sys::Reflect::set(&result, &JsValue::from("detected"), &JsValue::from(detected)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from("confidence"), &JsValue::from(confidence)).unwrap();
        
        result.into()
    }

    fn detect_wake_word(&mut self, samples: &[f32]) -> f32 {
        let energy = Self::compute_energy(samples);
        let zcr = Self::compute_zcr(samples);
        
        if energy < 0.01 {
            return 0.0;
        }

        let is_speech_like = energy > 0.05 && zcr > 0.05 && zcr < 0.5;
        
        if !is_speech_like {
            return 0.1;
        }

        let features = self.extract_features(samples);
        
        self.feature_buffer.push_back(features);
        if self.feature_buffer.len() > self.max_feature_frames {
            self.feature_buffer.pop_front();
        }

        let confidence = self.evaluate_pattern();
        
        confidence
    }

    fn extract_features(&self, samples: &[f32]) -> Vec<f32> {
        let mut features = Vec::with_capacity(16);
        
        let energy = Self::compute_energy(samples);
        let zcr = Self::compute_zcr(samples);
        
        let (centroid, spread) = Self::compute_spectral_features(samples);
        
        features.push(energy);
        features.push(zcr);
        features.push(centroid);
        features.push(spread);
        
        for i in 0..12 {
            if i < samples.len() {
                features.push(samples[i].abs());
            } else {
                features.push(0.0);
            }
        }
        
        features
    }

    fn evaluate_pattern(&self) -> f32 {
        if self.feature_buffer.len() < 10 {
            return 0.2;
        }

        let mut total_energy = 0.0;
        let mut energy_variance = 0.0;
        let mut has_rise = false;
        let mut has_fall = false;
        let mut max_energy = 0.0;
        let mut max_index = 0;

        for (i, features) in self.feature_buffer.iter().enumerate() {
            let energy = features[0];
            total_energy += energy;
            
            if energy > max_energy {
                max_energy = energy;
                max_index = i;
            }
        }

        let mean_energy = total_energy / self.feature_buffer.len() as f32;

        for features in self.feature_buffer.iter() {
            let energy = features[0];
            energy_variance += (energy - mean_energy).powi(2);
        }
        energy_variance /= self.feature_buffer.len() as f32;

        if max_index > 2 && max_index < self.feature_buffer.len() - 2 {
            let before = self.feature_buffer[max_index.saturating_sub(3)..max_index]
                .iter()
                .map(|f| f[0])
                .sum::<f32>() / 3.0;
            
            let after = self.feature_buffer[max_index + 1..(max_index + 4).min(self.feature_buffer.len())]
                .iter()
                .map(|f| f[0])
                .sum::<f32>() / 3.0;

            has_rise = before < max_energy * 0.6;
            has_fall = after < max_energy * 0.6;
        }

        let zcr_variance = self.feature_buffer.iter()
            .map(|f| (f[1] - 0.2).powi(2))
            .sum::<f32>() / self.feature_buffer.len() as f32;

        let mut confidence = 0.3;

        if max_energy > 0.1 {
            confidence += 0.1;
        }

        if energy_variance > 0.001 {
            confidence += 0.15;
        }

        if has_rise && has_fall {
            confidence += 0.2;
        }

        if zcr_variance > 0.001 && zcr_variance < 0.1 {
            confidence += 0.1;
        }

        if self.feature_buffer.len() > 30 {
            confidence += 0.05;
        }

        confidence.min(0.95).max(0.0)
    }

    fn compute_energy(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }

        let mut sum = 0.0;
        for &sample in samples {
            sum += sample * sample;
        }
        (sum / samples.len() as f32).sqrt()
    }

    fn compute_zcr(samples: &[f32]) -> f32 {
        if samples.len() < 2 {
            return 0.0;
        }

        let mut crossings = 0;
        for i in 1..samples.len() {
            if (samples[i] >= 0.0 && samples[i - 1] < 0.0) || 
               (samples[i] < 0.0 && samples[i - 1] >= 0.0) {
                crossings += 1;
            }
        }

        crossings as f32 / (samples.len() - 1) as f32
    }

    fn compute_spectral_features(samples: &[f32]) -> (f32, f32) {
        if samples.is_empty() {
            return (0.0, 0.0);
        }

        let n = samples.len();
        let mut magnitude_sum = 0.0;
        let mut weighted_sum = 0.0;

        for k in 0..n / 2 {
            let magnitude = samples[k].abs();
            magnitude_sum += magnitude;
            weighted_sum += k as f32 * magnitude;
        }

        if magnitude_sum == 0.0 {
            return (0.0, 0.0);
        }

        let centroid = weighted_sum / magnitude_sum;
        
        let mut spread = 0.0;
        for k in 0..n / 2 {
            let magnitude = samples[k].abs();
            spread += (k as f32 - centroid).powi(2) * magnitude;
        }
        spread = (spread / magnitude_sum).sqrt();

        (centroid, spread)
    }

    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.ring_buffer.clear();
        self.feature_buffer.clear();
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[cfg(feature = "console_error_panic_hook")]
use console_error_panic_hook;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    init_panic_hook();
}
