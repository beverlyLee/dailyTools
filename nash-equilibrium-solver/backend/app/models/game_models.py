from sqlalchemy import Column, Integer, String, Text, JSON
from app.database import Base


class GameExample(Base):
    __tablename__ = "game_examples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    player1_strategies = Column(JSON, nullable=False)
    player2_strategies = Column(JSON, nullable=False)
    payoff_matrix_player1 = Column(JSON, nullable=False)
    payoff_matrix_player2 = Column(JSON, nullable=False)
    category = Column(String(50), nullable=True)
