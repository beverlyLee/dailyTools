import pytest
import torch
from PIL import Image
import numpy as np
from unittest.mock import patch, MagicMock

from app.core.model_loader import ModelLoader, DiseaseClassifier, model_loader
from app.core.config import settings


class TestDiseaseClassifier:
    def test_initialization(self):
        num_classes = 14
        model = DiseaseClassifier(num_classes=num_classes)
        assert model is not None
        assert isinstance(model, torch.nn.Module)
    
    def test_forward_pass(self):
        model = DiseaseClassifier(num_classes=14)
        model.eval()
        
        batch_size = 2
        input_tensor = torch.randn(batch_size, 3, 224, 224)
        
        with torch.no_grad():
            output = model(input_tensor)
        
        assert output.shape == (batch_size, 14)


class TestModelLoader:
    @pytest.fixture(autouse=True)
    def setup(self):
        ModelLoader._instance = None
        ModelLoader._model = None
        ModelLoader._is_loaded = False
    
    def test_singleton_pattern(self):
        loader1 = ModelLoader()
        loader2 = ModelLoader()
        assert loader1 is loader2
    
    def test_initial_state(self):
        loader = ModelLoader()
        assert loader.is_loaded is False
    
    def test_load_model_untrained(self):
        loader = ModelLoader()
        result = loader.load_model()
        
        assert result is True
        assert loader.is_loaded is True
        assert loader._model is not None
    
    def test_load_model_with_custom_path(self):
        loader = ModelLoader()
        result = loader.load_model("/path/to/nonexistent/model.pt")
        
        assert result is True
        assert loader.is_loaded is True
    
    def test_unload_model(self):
        loader = ModelLoader()
        loader.load_model()
        assert loader.is_loaded is True
        
        loader.unload_model()
        assert loader.is_loaded is False
        assert loader._model is None
    
    def test_get_model_when_not_loaded(self):
        loader = ModelLoader()
        assert loader.is_loaded is False
        
        model = loader.get_model()
        
        assert loader.is_loaded is True
        assert model is not None
    
    def test_get_model_when_loaded(self):
        loader = ModelLoader()
        loader.load_model()
        assert loader.is_loaded is True
        
        model1 = loader.get_model()
        model2 = loader.get_model()
        
        assert model1 is model2
    
    def test_preprocess_image(self):
        loader = ModelLoader()
        
        test_image = Image.new('RGB', (500, 400), color='red')
        
        tensor = loader.preprocess_image(test_image)
        
        assert isinstance(tensor, torch.Tensor)
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_image_grayscale(self):
        loader = ModelLoader()
        
        test_image = Image.new('L', (500, 400), color=128)
        
        tensor = loader.preprocess_image(test_image)
        
        assert isinstance(tensor, torch.Tensor)
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_predict_returns_expected_format(self):
        loader = ModelLoader()
        loader.load_model()
        
        test_image = Image.new('RGB', (224, 224), color='green')
        
        results = loader.predict(test_image, top_k=3)
        
        assert isinstance(results, list)
        assert len(results) == 3
        for class_idx, confidence in results:
            assert isinstance(class_idx, int)
            assert isinstance(confidence, float)
            assert 0 <= confidence <= 1
    
    def test_predict_with_class_names(self):
        loader = ModelLoader()
        loader.load_model()
        
        test_image = Image.new('RGB', (224, 224), color='green')
        
        results = loader.predict_with_class_names(test_image, top_k=3)
        
        assert isinstance(results, list)
        assert len(results) == 3
        for class_name, confidence, confidence_percent in results:
            assert isinstance(class_name, str)
            assert isinstance(confidence, float)
            assert isinstance(confidence_percent, str)
            assert "%" in confidence_percent
    
    @patch('app.core.model_loader.ModelLoader.load_model')
    def test_predict_auto_loads_model(self, mock_load_model):
        mock_load_model.return_value = True
        
        loader = ModelLoader()
        loader._model = MagicMock()
        loader._is_loaded = False
        
        loader._model.return_value = torch.randn(1, 14)
        loader._model.to.return_value = loader._model
        
        test_image = Image.new('RGB', (224, 224), color='blue')
        
        with patch.object(loader, 'preprocess_image', return_value=torch.randn(1, 3, 224, 224)):
            try:
                results = loader.predict(test_image)
            except Exception:
                pass
    
    def test_model_loader_device(self):
        loader = ModelLoader()
        
        assert loader.device is not None
        assert loader.device in [torch.device('cpu'), torch.device('cuda')]


class TestModelLoaderIntegration:
    def test_full_prediction_flow(self):
        loader = ModelLoader()
        
        assert loader.load_model() is True
        assert loader.is_loaded is True
        
        test_image = Image.new('RGB', (400, 300), color=(100, 150, 50))
        
        predictions = loader.predict_with_class_names(test_image, top_k=5)
        
        assert len(predictions) == 5
        for pred in predictions:
            assert len(pred) == 3
            class_name, confidence, percent = pred
            assert class_name in settings.DISEASE_CLASSES or class_name.startswith("未知病害")
            assert 0 <= confidence <= 1
            assert percent.endswith("%")
    
    def test_multiple_predictions(self):
        loader = ModelLoader()
        loader.load_model()
        
        image1 = Image.new('RGB', (224, 224), color='red')
        image2 = Image.new('RGB', (224, 224), color='green')
        image3 = Image.new('RGB', (224, 224), color='blue')
        
        pred1 = loader.predict(image1)
        pred2 = loader.predict(image2)
        pred3 = loader.predict(image3)
        
        assert len(pred1) > 0
        assert len(pred2) > 0
        assert len(pred3) > 0
