"""
Anomaly detection for data quality monitoring
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from scipy import stats
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Detect anomalies in data using statistical methods:
    - Z-score based outlier detection
    - IQR method for outliers
    - Pattern-based anomalies
    - Volume anomalies
    """
    
    def __init__(self, z_threshold: float = 3.0, iqr_multiplier: float = 1.5):
        self.z_threshold = z_threshold
        self.iqr_multiplier = iqr_multiplier
    
    def detect_anomalies(self, df: pd.DataFrame, table_name: str) -> List[Dict[str, Any]]:
        """Detect anomalies across all columns"""
        logger.info(f"Running anomaly detection on {table_name}")
        
        anomalies = []
        
        # Check for numeric anomalies
        for column in df.select_dtypes(include=[np.number]).columns:
            column_anomalies = self._detect_numeric_anomalies(df[column], column)
            if column_anomalies:
                anomalies.extend(column_anomalies)
        
        # Check for pattern anomalies in text columns
        for column in df.select_dtypes(include=['object', 'string']).columns:
            column_anomalies = self._detect_pattern_anomalies(df[column], column)
            if column_anomalies:
                anomalies.extend(column_anomalies)
        
        # Check for volume anomalies
        volume_anomalies = self._detect_volume_anomalies(df)
        if volume_anomalies:
            anomalies.extend(volume_anomalies)
        
        logger.info(f"Detected {len(anomalies)} anomalies in {table_name}")
        
        return anomalies
    
    def _detect_numeric_anomalies(self, series: pd.Series, column_name: str) -> List[Dict[str, Any]]:
        """Detect outliers in numeric columns using Z-score and IQR"""
        anomalies = []
        non_null = series.dropna()
        
        if len(non_null) < 3:
            return anomalies
        
        # Z-score method
        z_scores = np.abs(stats.zscore(non_null))
        z_outliers = np.where(z_scores > self.z_threshold)[0]
        
        if len(z_outliers) > 0:
            anomalies.append({
                "type": "numeric_outlier_zscore",
                "column": column_name,
                "severity": "medium",
                "message": f"Found {len(z_outliers)} outliers using Z-score method",
                "details": {
                    "outlier_count": int(len(z_outliers)),
                    "outlier_percentage": float(len(z_outliers) / len(non_null) * 100),
                    "threshold": self.z_threshold,
                    "sample_values": non_null.iloc[z_outliers[:5]].tolist()
                }
            })
        
        # IQR method
        Q1 = non_null.quantile(0.25)
        Q3 = non_null.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - self.iqr_multiplier * IQR
        upper_bound = Q3 + self.iqr_multiplier * IQR
        
        iqr_outliers = non_null[(non_null < lower_bound) | (non_null > upper_bound)]
        
        if len(iqr_outliers) > 0:
            anomalies.append({
                "type": "numeric_outlier_iqr",
                "column": column_name,
                "severity": "medium",
                "message": f"Found {len(iqr_outliers)} outliers using IQR method",
                "details": {
                    "outlier_count": int(len(iqr_outliers)),
                    "outlier_percentage": float(len(iqr_outliers) / len(non_null) * 100),
                    "lower_bound": float(lower_bound),
                    "upper_bound": float(upper_bound),
                    "sample_values": iqr_outliers.head(5).tolist()
                }
            })
        
        return anomalies
    
    def _detect_pattern_anomalies(self, series: pd.Series, column_name: str) -> List[Dict[str, Any]]:
        """Detect pattern-based anomalies in text columns"""
        anomalies = []
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return anomalies
        
        # Check for unusual value concentrations
        value_counts = non_null.value_counts()
        top_value_percentage = value_counts.iloc[0] / len(non_null) * 100
        
        if top_value_percentage > 90:
            anomalies.append({
                "type": "high_concentration",
                "column": column_name,
                "severity": "low",
                "message": f"Single value represents {top_value_percentage:.1f}% of column",
                "details": {
                    "dominant_value": value_counts.index[0],
                    "percentage": float(top_value_percentage),
                    "count": int(value_counts.iloc[0])
                }
            })
        
        # Check for unexpected nulls
        null_percentage = series.isnull().sum() / len(series) * 100
        if null_percentage > 50:
            anomalies.append({
                "type": "high_null_rate",
                "column": column_name,
                "severity": "high",
                "message": f"Column has {null_percentage:.1f}% null values",
                "details": {
                    "null_count": int(series.isnull().sum()),
                    "null_percentage": float(null_percentage)
                }
            })
        
        return anomalies
    
    def _detect_volume_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect volume-based anomalies"""
        anomalies = []
        
        # Check for empty dataset
        if len(df) == 0:
            anomalies.append({
                "type": "empty_dataset",
                "column": "ALL",
                "severity": "critical",
                "message": "Dataset is empty",
                "details": {}
            })
        
        # Check for very small dataset
        elif len(df) < 10:
            anomalies.append({
                "type": "low_volume",
                "column": "ALL",
                "severity": "medium",
                "message": f"Dataset has only {len(df)} rows",
                "details": {
                    "row_count": len(df)
                }
            })
        
        return anomalies
