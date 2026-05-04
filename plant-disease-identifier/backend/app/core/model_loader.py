import os
import torch
import torch.nn as nn
import torchvision.models as models
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List
import torchvision.transforms as transforms

from app.core.config import settings


class DiseaseClassifier(nn.Module):
    def __init__(self, num_classes: int = 14):
        super(DiseaseClassifier, self).__init__()
        self.backbone = models.resnet50(weights=None)
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Linear(num_ftrs, num_classes)
    
    def forward(self, x):
        return self.backbone(x)


class ModelLoader:
    _instance = None
    _model = None
    _is_loaded = False
    _device = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._device is None:
            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    @property
    def is_loaded(self) -> bool:
        return self._is_loaded
    
    @property
    def device(self):
        return self._device
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        if model_path is None:
            model_path = settings.MODEL_PATH
        
        try:
            if settings.MODEL_FORMAT == "onnx":
                import onnxruntime as ort
                self._model = ort.InferenceSession(model_path)
                self._is_loaded = True
                return True
            else:
                model = DiseaseClassifier(num_classes=len(settings.DISEASE_CLASSES))
                
                if os.path.exists(model_path):
                    checkpoint = torch.load(model_path, map_location=self._device)
                    if "state_dict" in checkpoint:
                        model.load_state_dict(checkpoint["state_dict"])
                    else:
                        model.load_state_dict(checkpoint)
                else:
                    print(f"Warning: Model file not found at {model_path}. Using untrained model for testing.")
                
                model.to(self._device)
                model.eval()
                self._model = model
                self._is_loaded = True
                return True
                
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            self._is_loaded = False
            return False
    
    def unload_model(self):
        self._model = None
        self._is_loaded = False
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    def get_model(self):
        if not self._is_loaded:
            self.load_model()
        return self._model
    
    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        transform = transforms.Compose([
            transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=settings.NORMALIZE_MEAN,
                std=settings.NORMALIZE_STD
            )
        ])
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        image_tensor = transform(image)
        image_tensor = image_tensor.unsqueeze(0)
        
        return image_tensor
    
    def predict(self, image: Image.Image, top_k: int = 3) -> List[Tuple[int, float]]:
        if not self._is_loaded:
            self.load_model()
        
        image_tensor = self.preprocess_image(image)
        
        if settings.MODEL_FORMAT == "onnx" and self._model is not None:
            image_np = image_tensor.numpy()
            input_name = self._model.get_inputs()[0].name
            output_name = self._model.get_outputs()[0].name
            outputs = self._model.run([output_name], {input_name: image_np})
            logits = torch.tensor(outputs[0])
        elif self._model is not None:
            image_tensor = image_tensor.to(self._device)
            with torch.no_grad():
                logits = self._model(image_tensor)
        else:
            raise RuntimeError("Model not loaded")
        
        probs = torch.softmax(logits, dim=1)
        top_probs, top_indices = torch.topk(probs, k=min(top_k, len(settings.DISEASE_CLASSES)))
        
        results = []
        for idx, prob in zip(top_indices[0], top_probs[0]):
            results.append((int(idx), float(prob)))
        
        return results
    
    def predict_with_class_names(self, image: Image.Image, top_k: int = 3) -> List[Tuple[str, float, str]]:
        raw_predictions = self.predict(image, top_k)
        
        results = []
        for class_idx, confidence in raw_predictions:
            if class_idx < len(settings.DISEASE_CLASSES):
                class_name = settings.DISEASE_CLASSES[class_idx]
            else:
                class_name = f"未知病害_{class_idx}"
            confidence_percent = f"{confidence * 100:.2f}%"
            results.append((class_name, confidence, confidence_percent))
        
        return results


model_loader = ModelLoader()
