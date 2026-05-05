from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime
from ..database import Base
import json


class GameExample(Base):
    __tablename__ = "game_examples"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    player1_strategies_json = Column(Text, nullable=False)
    player2_strategies_json = Column(Text, nullable=False)
    payoff_matrix_player1_json = Column(Text, nullable=False)
    payoff_matrix_player2_json = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @property
    def player1_strategies(self):
        return json.loads(self.player1_strategies_json)
    
    @player1_strategies.setter
    def player1_strategies(self, value):
        self.player1_strategies_json = json.dumps(value)
    
    @property
    def player2_strategies(self):
        return json.loads(self.player2_strategies_json)
    
    @player2_strategies.setter
    def player2_strategies(self, value):
        self.player2_strategies_json = json.dumps(value)
    
    @property
    def payoff_matrix_player1(self):
        return json.loads(self.payoff_matrix_player1_json)
    
    @payoff_matrix_player1.setter
    def payoff_matrix_player1(self, value):
        self.payoff_matrix_player1_json = json.dumps(value)
    
    @property
    def payoff_matrix_player2(self):
        return json.loads(self.payoff_matrix_player2_json)
    
    @payoff_matrix_player2.setter
    def payoff_matrix_player2(self, value):
        self.payoff_matrix_player2_json = json.dumps(value)


class GameHistory(Base):
    __tablename__ = "game_history"
    
    id = Column(Integer, primary_key=True, index=True)
    
    player1_strategies_json = Column(Text, nullable=False)
    player2_strategies_json = Column(Text, nullable=False)
    payoff_matrix_player1_json = Column(Text, nullable=False)
    payoff_matrix_player2_json = Column(Text, nullable=False)
    
    pure_equilibria_json = Column(Text, nullable=True)
    mixed_equilibria_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    @property
    def player1_strategies(self):
        return json.loads(self.player1_strategies_json)
    
    @player1_strategies.setter
    def player1_strategies(self, value):
        self.player1_strategies_json = json.dumps(value)
    
    @property
    def player2_strategies(self):
        return json.loads(self.player2_strategies_json)
    
    @player2_strategies.setter
    def player2_strategies(self, value):
        self.player2_strategies_json = json.dumps(value)
    
    @property
    def payoff_matrix_player1(self):
        return json.loads(self.payoff_matrix_player1_json)
    
    @payoff_matrix_player1.setter
    def payoff_matrix_player1(self, value):
        self.payoff_matrix_player1_json = json.dumps(value)
    
    @property
    def payoff_matrix_player2(self):
        return json.loads(self.payoff_matrix_player2_json)
    
    @payoff_matrix_player2.setter
    def payoff_matrix_player2(self, value):
        self.payoff_matrix_player2_json = json.dumps(value)
    
    @property
    def pure_equilibria(self):
        if self.pure_equilibria_json:
            return json.loads(self.pure_equilibria_json)
        return []
    
    @pure_equilibria.setter
    def pure_equilibria(self, value):
        self.pure_equilibria_json = json.dumps(value) if value else None
    
    @property
    def mixed_equilibria(self):
        if self.mixed_equilibria_json:
            return json.loads(self.mixed_equilibria_json)
        return []
    
    @mixed_equilibria.setter
    def mixed_equilibria(self, value):
        self.mixed_equilibria_json = json.dumps(value) if value else None
