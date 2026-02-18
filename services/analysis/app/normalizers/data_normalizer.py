"""
Data Normalization Engine
Normalizes raw price data for analysis
"""

import logging
from typing import Dict, Optional, List
from decimal import Decimal
import re

from app.config_analysis import analysis_config

logger = logging.getLogger(__name__)


class DataNormalizer:
    """
    Normalizes price data for consistent analysis
    """
    
    def __init__(self):
        self.currency_rates = analysis_config.CURRENCY_RATES
        self.condition_map = analysis_config.CONDITION_MAP
        logger.info("DataNormalizer initialized")
    
    def normalize_price(self, price: float, currency: str) -> float:
        """
        Convert price to EUR
        
        Args:
            price: Original price
            currency: Currency code (EUR, USD, GBP, etc.)
            
        Returns:
            Price in EUR
        """
        if currency == 'EUR':
            return price
        
        rate = self.currency_rates.get(currency.upper())
        if not rate:
            logger.warning(f"Unknown currency: {currency}, using 1.0")
            return price
        
        return price * rate
    
    def normalize_condition(self, condition: str) -> str:
        """
        Standardize condition strings
        
        Args:
            condition: Raw condition string
            
        Returns:
            Normalized condition code (NM, LP, MP, etc.)
        """
        if not condition:
            return 'NM'  # Default
        
        normalized = condition.lower().strip()
        
        # Try exact match first
        if normalized in self.condition_map:
            return self.condition_map[normalized]
        
        # Try partial match
        for key, value in self.condition_map.items():
            if key in normalized:
                return value
        
        logger.debug(f"Unknown condition: {condition}, defaulting to NM")
        return 'NM'
    
    def normalize_product_name(self, name: str) -> str:
        """
        Normalize product name for consistent grouping
        
        Args:
            name: Raw product name
            
        Returns:
            Normalized name
        """
        if not name:
            return ""
        
        # Convert to lowercase
        normalized = name.lower().strip()
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Remove special characters that might cause issues
        # But keep important ones like hyphens
        normalized = re.sub(r'[^\w\s\-éè]', '', normalized)
        
        return normalized.title()  # Title case
    
    def normalize_set_name(self, set_name: str) -> str:
        """
        Normalize set name
        
        Args:
            set_name: Raw set name
            
        Returns:
            Normalized set name
        """
        if not set_name:
            return "Unknown Set"
        
        # Common set name variations
        set_mapping = {
            'base set': 'Base Set',
            'base': 'Base Set',
            '151': '151',
            'sv 151': '151',
            'scarlet violet 151': '151',
            'scarlet-violet-151': '151',
            'paldean fates': 'Paldean Fates',
            'obsidian flames': 'Obsidian Flames',
        }
        
        normalized_key = set_name.lower().strip()
        return set_mapping.get(normalized_key, set_name.title())
    
    def extract_product_id(self, url: str, source: str) -> Optional[str]:
        """
        Extract consistent product ID from source URL
        
        Args:
            url: Product URL
            source: Source name (CardMarket, CardTrader, etc.)
            
        Returns:
            Product ID or None
        """
        if not url:
            return None
        
        # CardMarket: extract ID from URL
        if 'cardmarket.com' in url.lower():
            match = re.search(r'/(\d+)$', url)
            if match:
                return f"CM-{match.group(1)}"
        
        # CardTrader: extract ID
        if 'cardtrader.com' in url.lower():
            match = re.search(r'/products/(\d+)', url)
            if match:
                return f"CT-{match.group(1)}"
        
        return None
    
    def detect_outliers(self, prices: List[float], threshold: float = None) -> List[bool]:
        """
        Detect price outliers using z-score method
        
        Args:
            prices: List of prices
            threshold: Z-score threshold (default from config)
            
        Returns:
            List of booleans indicating outliers
        """
        if not prices or len(prices) < 3:
            return [False] * len(prices)
        
        if threshold is None:
            threshold = analysis_config.OUTLIER_THRESHOLD
        
        import numpy as np
        
        prices_array = np.array(prices)
        mean = np.mean(prices_array)
        std = np.std(prices_array)
        
        if std == 0:
            return [False] * len(prices)
        
        z_scores = np.abs((prices_array - mean) / std)
        return (z_scores > threshold).tolist()
    
    def calculate_quality_score(self, sample_size: int) -> str:
        """
        Determine data quality based on sample size
        
        Args:
            sample_size: Number of data points
            
        Returns:
            Quality label: excellent, good, fair, poor
        """
        if sample_size >= analysis_config.MIN_SAMPLES_EXCELLENT:
            return 'excellent'
        elif sample_size >= analysis_config.MIN_SAMPLES_GOOD:
            return 'good'
        elif sample_size >= analysis_config.MIN_SAMPLES_FAIR:
            return 'fair'
        elif sample_size >= analysis_config.MIN_SAMPLES_POOR:
            return 'poor'
        else:
            return 'insufficient'
