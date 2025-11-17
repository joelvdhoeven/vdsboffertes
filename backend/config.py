"""
Configuration management for Offerte Generator
Loads settings from environment variables and .env file
"""
import os
from pathlib import Path
from typing import Optional

# Try to load .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not available, use environment variables only


class Config:
    """Configuration settings for the application"""

    # AI Matching Settings
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    AI_MATCHING_ENABLED: bool = os.getenv("AI_MATCHING_ENABLED", "true").lower() == "true"
    AI_MODEL: str = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")
    AI_CONFIDENCE_THRESHOLD: float = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.7"))
    MAX_CANDIDATES_FOR_AI: int = int(os.getenv("MAX_CANDIDATES_FOR_AI", "10"))
    AI_TIMEOUT_SECONDS: int = int(os.getenv("AI_TIMEOUT_SECONDS", "30"))

    # Caching Settings
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL_HOURS: int = int(os.getenv("CACHE_TTL_HOURS", "24"))

    # Learning Settings
    LEARNING_ENABLED: bool = os.getenv("LEARNING_ENABLED", "true").lower() == "true"
    MIN_CORRECTION_FREQUENCY: int = int(os.getenv("MIN_CORRECTION_FREQUENCY", "2"))

    # Matching Weights
    TEXT_SCORE_WEIGHT: float = float(os.getenv("TEXT_SCORE_WEIGHT", "0.7"))
    UNIT_SCORE_WEIGHT: float = float(os.getenv("UNIT_SCORE_WEIGHT", "0.3"))

    @classmethod
    def is_ai_available(cls) -> bool:
        """Check if AI matching is available and configured"""
        return cls.AI_MATCHING_ENABLED and cls.ANTHROPIC_API_KEY is not None

    @classmethod
    def to_dict(cls) -> dict:
        """Export configuration as dictionary (hide sensitive data)"""
        return {
            "ai_matching_enabled": cls.AI_MATCHING_ENABLED,
            "ai_available": cls.is_ai_available(),
            "ai_model": cls.AI_MODEL,
            "ai_confidence_threshold": cls.AI_CONFIDENCE_THRESHOLD,
            "max_candidates_for_ai": cls.MAX_CANDIDATES_FOR_AI,
            "cache_enabled": cls.CACHE_ENABLED,
            "cache_ttl_hours": cls.CACHE_TTL_HOURS,
            "learning_enabled": cls.LEARNING_ENABLED,
            "text_score_weight": cls.TEXT_SCORE_WEIGHT,
            "unit_score_weight": cls.UNIT_SCORE_WEIGHT,
        }


# Singleton instance
config = Config()
