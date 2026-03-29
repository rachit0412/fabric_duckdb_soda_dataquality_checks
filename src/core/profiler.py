"""
Advanced data profiling for enterprise insights
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DataProfiler:
    """
    Comprehensive data profiling including:
    - Basic statistics
    - Data type distribution
    - Missing value analysis
    - Cardinality analysis
    - Value distribution
    """
    
    def profile_dataframe(self, df: pd.DataFrame, table_name: str) -> Dict[str, Any]:
        """Generate comprehensive data profile"""
        logger.info(f"Profiling dataset: {table_name}")
        
        profile = {
            "table_name": table_name,
            "timestamp": datetime.now().isoformat(),
            "row_count": len(df),
            "column_count": len(df.columns),
            "total_cells": len(df) * len(df.columns),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / (1024 * 1024),
            "columns": self._profile_columns(df)
        }
        
        return profile
    
    def _profile_columns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Profile individual columns"""
        column_profiles = []
        
        for column in df.columns:
            column_data = df[column]
            
            profile = {
                "name": column,
                "data_type": str(column_data.dtype),
                "null_count": int(column_data.isnull().sum()),
                "null_percentage": float(column_data.isnull().sum() / len(column_data) * 100),
                "unique_count": int(column_data.nunique()),
                "cardinality_percentage": float(column_data.nunique() / len(column_data) * 100)
            }
            
            # Type-specific profiling
            if pd.api.types.is_numeric_dtype(column_data):
                profile.update(self._profile_numeric(column_data))
            elif pd.api.types.is_string_dtype(column_data) or pd.api.types.is_object_dtype(column_data):
                profile.update(self._profile_text(column_data))
            elif pd.api.types.is_datetime64_any_dtype(column_data):
                profile.update(self._profile_datetime(column_data))
            
            column_profiles.append(profile)
        
        return column_profiles
    
    def _profile_numeric(self, series: pd.Series) -> Dict[str, Any]:
        """Profile numeric columns"""
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {"numeric_stats": None}
        
        return {
            "numeric_stats": {
                "mean": float(non_null.mean()),
                "median": float(non_null.median()),
                "std": float(non_null.std()),
                "min": float(non_null.min()),
                "max": float(non_null.max()),
                "q25": float(non_null.quantile(0.25)),
                "q75": float(non_null.quantile(0.75)),
                "zeros_count": int((non_null == 0).sum()),
                "negative_count": int((non_null < 0).sum())
            }
        }
    
    def _profile_text(self, series: pd.Series) -> Dict[str, Any]:
        """Profile text columns"""
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {"text_stats": None}
        
        lengths = non_null.astype(str).str.len()
        
        return {
            "text_stats": {
                "min_length": int(lengths.min()),
                "max_length": int(lengths.max()),
                "avg_length": float(lengths.mean()),
                "empty_count": int((non_null.astype(str).str.strip() == "").sum()),
                "top_values": non_null.value_counts().head(5).to_dict()
            }
        }
    
    def _profile_datetime(self, series: pd.Series) -> Dict[str, Any]:
        """Profile datetime columns"""
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {"datetime_stats": None}
        
        return {
            "datetime_stats": {
                "min_date": str(non_null.min()),
                "max_date": str(non_null.max()),
                "date_range_days": (non_null.max() - non_null.min()).days
            }
        }
