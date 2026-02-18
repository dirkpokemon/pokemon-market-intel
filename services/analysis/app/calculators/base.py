"""
Base Calculator Class
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List
import pandas as pd
import numpy as np

from app.config import settings
from app.database import get_db


class BaseCalculator(ABC):
    """
    Abstract base class for all calculators
    """

    def __init__(self):
        self.name = self.__class__.__name__
        self.batch_size = settings.BATCH_SIZE

    async def fetch_data(self, query: str, params: Dict[str, Any] = None) -> pd.DataFrame:
        """
        Fetch data from database and return as DataFrame
        """
        async for session in get_db():
            result = await session.execute(query, params or {})
            rows = result.fetchall()
            
            if not rows:
                return pd.DataFrame()
            
            # Convert to DataFrame
            columns = result.keys()
            return pd.DataFrame(rows, columns=columns)

    def remove_outliers(self, data: pd.Series, threshold: float = None) -> pd.Series:
        """
        Remove outliers using z-score method
        """
        if threshold is None:
            threshold = settings.OUTLIER_THRESHOLD
        
        z_scores = np.abs((data - data.mean()) / data.std())
        return data[z_scores < threshold]

    def calculate_moving_average(
        self,
        data: pd.Series,
        window: int = 7
    ) -> pd.Series:
        """
        Calculate moving average
        """
        return data.rolling(window=window, min_periods=1).mean()

    def calculate_volatility(self, data: pd.Series) -> float:
        """
        Calculate price volatility (coefficient of variation)
        """
        if len(data) < 2:
            return 0.0
        
        return float(data.std() / data.mean()) if data.mean() != 0 else 0.0

    @abstractmethod
    async def calculate(self) -> None:
        """
        Main calculation logic - to be implemented by subclasses
        """
        pass

    @abstractmethod
    async def save_results(self, results: List[Dict[str, Any]]) -> None:
        """
        Save calculation results to database
        """
        pass
