from datetime import datetime
from .database import db

class ODESolution(db.Model):
    __tablename__ = 'ode_solutions'
    
    id = db.Column(db.Integer, primary_key=True)
    equation_type = db.Column(db.String(50), nullable=False)
    equation_form = db.Column(db.Text, nullable=False)
    initial_conditions = db.Column(db.Text, nullable=False)
    parameters = db.Column(db.Text, nullable=False)
    method = db.Column(db.String(20), nullable=False)
    time_span = db.Column(db.String(50), nullable=False)
    solution_data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'equation_type': self.equation_type,
            'equation_form': self.equation_form,
            'initial_conditions': self.initial_conditions,
            'parameters': self.parameters,
            'method': self.method,
            'time_span': self.time_span,
            'solution_data': self.solution_data,
            'created_at': self.created_at.isoformat()
        }

class HousingModel(db.Model):
    __tablename__ = 'housing_models'
    
    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False)
    features = db.Column(db.Text, nullable=False)
    coefficients = db.Column(db.Text, nullable=False)
    intercept = db.Column(db.Float, nullable=False)
    r_squared = db.Column(db.Float, nullable=False)
    rmse = db.Column(db.Float, nullable=False)
    training_data_info = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'model_name': self.model_name,
            'features': self.features,
            'coefficients': self.coefficients,
            'intercept': self.intercept,
            'r_squared': self.r_squared,
            'rmse': self.rmse,
            'training_data_info': self.training_data_info,
            'created_at': self.created_at.isoformat()
        }

class PredictionHistory(db.Model):
    __tablename__ = 'prediction_history'
    
    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.Integer, db.ForeignKey('housing_models.id'), nullable=False)
    input_features = db.Column(db.Text, nullable=False)
    predicted_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    model = db.relationship('HousingModel', backref=db.backref('predictions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'model_id': self.model_id,
            'input_features': self.input_features,
            'predicted_price': self.predicted_price,
            'created_at': self.created_at.isoformat()
        }
