use wasm_bindgen::prelude::*;
use web_sys::ImageData;
use js_sys::Float32Array;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32) -> Self {
        Point { x, y }
    }
}

#[wasm_bindgen]
pub struct BoundingBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub confidence: f32,
}

#[wasm_bindgen]
impl BoundingBox {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32, width: f32, height: f32, confidence: f32) -> Self {
        BoundingBox {
            x,
            y,
            width,
            height,
            confidence,
        }
    }

    #[wasm_bindgen]
    pub fn area(&self) -> f32 {
        self.width * self.height
    }

    #[wasm_bindgen]
    pub fn center_x(&self) -> f32 {
        self.x + self.width / 2.0
    }

    #[wasm_bindgen]
    pub fn center_y(&self) -> f32 {
        self.y + self.height / 2.0
    }
}

#[wasm_bindgen]
pub struct FaceDetectionResult {
    bbox: BoundingBox,
    landmarks_5: Option<Vec<Point>>,
    landmarks_68: Option<Vec<Point>>,
}

#[wasm_bindgen]
impl FaceDetectionResult {
    #[wasm_bindgen(constructor)]
    pub fn new(bbox: BoundingBox) -> Self {
        FaceDetectionResult {
            bbox,
            landmarks_5: None,
            landmarks_68: None,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn bbox(&self) -> BoundingBox {
        self.bbox
    }

    #[wasm_bindgen(getter)]
    pub fn landmarks_5(&self) -> Option<js_sys::Array> {
        self.landmarks_5.as_ref().map(|points| {
            points.iter().map(|&p| JsValue::from(p)).collect()
        })
    }

    #[wasm_bindgen(getter)]
    pub fn landmarks_68(&self) -> Option<js_sys::Array> {
        self.landmarks_68.as_ref().map(|points| {
            points.iter().map(|&p| JsValue::from(p)).collect()
        })
    }

    #[wasm_bindgen]
    pub fn set_landmarks_5(&mut self, points: Vec<Point>) {
        self.landmarks_5 = Some(points);
    }

    #[wasm_bindgen]
    pub fn set_landmarks_68(&mut self, points: Vec<Point>) {
        self.landmarks_68 = Some(points);
    }
}

pub struct ImageBuffer {
    pub width: usize,
    pub height: usize,
    pub data: Vec<u8>,
}

impl ImageBuffer {
    pub fn new(width: usize, height: usize, data: Vec<u8>) -> Self {
        ImageBuffer {
            width,
            height,
            data,
        }
    }

    pub fn get_pixel(&self, x: usize, y: usize) -> (u8, u8, u8, u8) {
        let idx = (y * self.width + x) * 4;
        (
            self.data[idx],
            self.data[idx + 1],
            self.data[idx + 2],
            self.data[idx + 3],
        )
    }

    pub fn to_grayscale(&self) -> Vec<f32> {
        let mut gray = Vec::with_capacity(self.width * self.height);
        for y in 0..self.height {
            for x in 0..self.width {
                let (r, g, b, _) = self.get_pixel(x, y);
                let luminance = 0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32;
                gray.push(luminance / 255.0);
            }
        }
        gray
    }

    pub fn resize(&self, target_width: usize, target_height: usize) -> ImageBuffer {
        let mut resized = Vec::with_capacity(target_width * target_height * 4);
        let x_ratio = self.width as f32 / target_width as f32;
        let y_ratio = self.height as f32 / target_height as f32;

        for y in 0..target_height {
            for x in 0..target_width {
                let src_x = (x as f32 * x_ratio) as usize;
                let src_y = (y as f32 * y_ratio) as usize;
                let clamped_x = src_x.min(self.width - 1);
                let clamped_y = src_y.min(self.height - 1);
                let (r, g, b, a) = self.get_pixel(clamped_x, clamped_y);
                resized.extend_from_slice(&[r, g, b, a]);
            }
        }

        ImageBuffer::new(target_width, target_height, resized)
    }
}

#[wasm_bindgen]
pub struct FaceDetector {
    min_face_size: f32,
    scale_factor: f32,
    score_threshold: f32,
    enable_landmarks_5: bool,
    enable_landmarks_68: bool,
}

#[wasm_bindgen]
impl FaceDetector {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        FaceDetector {
            min_face_size: 20.0,
            scale_factor: 1.1,
            score_threshold: 0.7,
            enable_landmarks_5: false,
            enable_landmarks_68: false,
        }
    }

    #[wasm_bindgen]
    pub fn set_min_face_size(&mut self, size: f32) {
        self.min_face_size = size;
    }

    #[wasm_bindgen]
    pub fn set_scale_factor(&mut self, factor: f32) {
        self.scale_factor = factor;
    }

    #[wasm_bindgen]
    pub fn set_score_threshold(&mut self, threshold: f32) {
        self.score_threshold = threshold;
    }

    #[wasm_bindgen]
    pub fn enable_landmarks(&mut self, count: u32) {
        match count {
            5 => {
                self.enable_landmarks_5 = true;
                self.enable_landmarks_68 = false;
            }
            68 => {
                self.enable_landmarks_5 = false;
                self.enable_landmarks_68 = true;
            }
            _ => {
                self.enable_landmarks_5 = false;
                self.enable_landmarks_68 = false;
            }
        }
    }

    #[wasm_bindgen]
    pub fn detect(&self, image_data: &ImageData) -> js_sys::Array {
        let width = image_data.width() as usize;
        let height = image_data.height() as usize;
        let data: Vec<u8> = image_data.data().iter().map(|&x| x).collect();
        
        let image = ImageBuffer::new(width, height, data);
        let results = self.detect_internal(&image);
        
        let js_results = js_sys::Array::new();
        for result in results {
            js_results.push(&JsValue::from(result));
        }
        
        js_results
    }

    fn detect_internal(&self, image: &ImageBuffer) -> Vec<FaceDetectionResult> {
        let mut results = Vec::new();
        
        let scales = self.generate_image_pyramid(image.width as f32, image.height as f32);
        
        for &scale in &scales {
            let scaled_width = (image.width as f32 / scale) as usize;
            let scaled_height = (image.height as f32 / scale) as usize;
            
            if scaled_width < 10 || scaled_height < 10 {
                continue;
            }
            
            let scaled_image = image.resize(scaled_width, scaled_height);
            let detections = self.detect_at_scale(&scaled_image, scale);
            
            for mut detection in detections {
                detection.bbox.x *= scale;
                detection.bbox.y *= scale;
                detection.bbox.width *= scale;
                detection.bbox.height *= scale;
                
                if let Some(ref mut landmarks) = detection.landmarks_5 {
                    for point in landmarks {
                        point.x *= scale;
                        point.y *= scale;
                    }
                }
                
                if let Some(ref mut landmarks) = detection.landmarks_68 {
                    for point in landmarks {
                        point.x *= scale;
                        point.y *= scale;
                    }
                }
                
                results.push(detection);
            }
        }
        
        let results = self.non_max_suppression(results, 0.5);
        
        results
    }

    fn generate_image_pyramid(&self, width: f32, height: f32) -> Vec<f32> {
        let mut scales = Vec::new();
        let mut current_scale = 1.0;
        
        let min_dim = width.min(height);
        
        while min_dim / current_scale >= self.min_face_size {
            scales.push(current_scale);
            current_scale *= self.scale_factor;
        }
        
        scales
    }

    fn detect_at_scale(&self, image: &ImageBuffer, _scale: f32) -> Vec<FaceDetectionResult> {
        let mut results = Vec::new();
        
        let step = 12;
        let window_size = 24;
        
        for y in (0..image.height.saturating_sub(window_size)).step_by(step) {
            for x in (0..image.width.saturating_sub(window_size)).step_by(step) {
                let confidence = self.classify_window(image, x, y, window_size);
                
                if confidence >= self.score_threshold {
                    let mut result = FaceDetectionResult::new(BoundingBox::new(
                        x as f32,
                        y as f32,
                        window_size as f32,
                        window_size as f32,
                        confidence,
                    ));
                    
                    if self.enable_landmarks_5 {
                        result.set_landmarks_5(self.generate_landmarks_5(x as f32, y as f32, window_size as f32));
                    }
                    
                    if self.enable_landmarks_68 {
                        result.set_landmarks_68(self.generate_landmarks_68(x as f32, y as f32, window_size as f32));
                    }
                    
                    results.push(result);
                }
            }
        }
        
        results
    }

    fn classify_window(&self, image: &ImageBuffer, x: usize, y: usize, size: usize) -> f32 {
        let mut total_variance = 0.0;
        let mut mean_r = 0.0;
        let mut mean_g = 0.0;
        let mut mean_b = 0.0;
        
        let mut pixels = Vec::new();
        
        for dy in 0..size {
            for dx in 0..size {
                let (r, g, b, _) = image.get_pixel(x + dx, y + dy);
                let gray = (r as f32 + g as f32 + b as f32) / 3.0;
                pixels.push(gray);
                
                mean_r += r as f32;
                mean_g += g as f32;
                mean_b += b as f32;
            }
        }
        
        let pixel_count = (size * size) as f32;
        mean_r /= pixel_count;
        mean_g /= pixel_count;
        mean_b /= pixel_count;
        
        let mean_gray = (mean_r + mean_g + mean_b) / 3.0;
        
        for &pixel in &pixels {
            total_variance += (pixel - mean_gray).powi(2);
        }
        
        total_variance /= pixel_count;
        
        let std_dev = total_variance.sqrt();
        
        let score = if std_dev > 15.0 {
            0.5 + (std_dev - 15.0) / 100.0
        } else {
            0.3
        };
        
        score.min(1.0).max(0.0)
    }

    fn generate_landmarks_5(&self, x: f32, y: f32, size: f32) -> Vec<Point> {
        vec![
            Point::new(x + size * 0.35, y + size * 0.40),
            Point::new(x + size * 0.65, y + size * 0.40),
            Point::new(x + size * 0.50, y + size * 0.55),
            Point::new(x + size * 0.40, y + size * 0.70),
            Point::new(x + size * 0.60, y + size * 0.70),
        ]
    }

    fn generate_landmarks_68(&self, x: f32, y: f32, size: f32) -> Vec<Point> {
        let mut points = Vec::with_capacity(68);
        
        for i in 0..17 {
            points.push(Point::new(
                x + size * (0.1 + (i as f32 / 16.0) * 0.8),
                y + size * 0.35
            ));
        }
        
        for i in 0..5 {
            points.push(Point::new(
                x + size * (0.35 + (i as f32 / 4.0) * 0.1),
                y + size * (0.50 + (i as f32 / 4.0) * 0.1)
            ));
        }
        
        for i in 0..5 {
            points.push(Point::new(
                x + size * (0.55 + (i as f32 / 4.0) * 0.1),
                y + size * (0.50 + (1.0 - i as f32 / 4.0) * 0.1)
            ));
        }
        
        for i in 0..6 {
            points.push(Point::new(
                x + size * (0.25 + (i as f32 / 5.0) * 0.15),
                y + size * 0.40
            ));
        }
        
        for i in 0..6 {
            points.push(Point::new(
                x + size * (0.60 + (i as f32 / 5.0) * 0.15),
                y + size * 0.40
            ));
        }
        
        for i in 0..20 {
            let t = i as f32 / 19.0;
            points.push(Point::new(
                x + size * (0.3 + t * 0.4),
                y + size * 0.75
            ));
        }
        
        while points.len() < 68 {
            points.push(Point::new(x + size * 0.5, y + size * 0.6));
        }
        
        points.truncate(68);
        points
    }

    fn non_max_suppression(&self, mut detections: Vec<FaceDetectionResult>, iou_threshold: f32) -> Vec<FaceDetectionResult> {
        if detections.is_empty() {
            return Vec::new();
        }
        
        detections.sort_by(|a, b| b.bbox.confidence.partial_cmp(&a.bbox.confidence).unwrap_or(std::cmp::Ordering::Equal));
        
        let mut keep = Vec::new();
        let mut suppressed = vec![false; detections.len()];
        
        for i in 0..detections.len() {
            if suppressed[i] {
                continue;
            }
            
            keep.push(detections[i].clone());
            
            for j in (i + 1)..detections.len() {
                if suppressed[j] {
                    continue;
                }
                
                let iou = self.compute_iou(&detections[i].bbox, &detections[j].bbox);
                
                if iou > iou_threshold {
                    suppressed[j] = true;
                }
            }
        }
        
        keep
    }

    fn compute_iou(&self, box1: &BoundingBox, box2: &BoundingBox) -> f32 {
        let x1 = box1.x.max(box2.x);
        let y1 = box1.y.max(box2.y);
        let x2 = (box1.x + box1.width).min(box2.x + box2.width);
        let y2 = (box1.y + box1.height).min(box2.y + box2.height);
        
        let width = x2 - x1;
        let height = y2 - y1;
        
        if width <= 0.0 || height <= 0.0 {
            return 0.0;
        }
        
        let intersection = width * height;
        let union = box1.area() + box2.area() - intersection;
        
        intersection / union
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
