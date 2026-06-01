import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from .database import db
from .sentiment.comment_analyzer import analyzer, analyze_comment

__all__ = ["db", "analyzer", "analyze_comment"]
