"""
Data Source Connectors

Adapter pattern for different data source types (CSV, PostgreSQL, DuckDB, etc.)
Each connector implements common interface for profiling and data access.
"""

import logging
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    """Base connector interface for all data sources."""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test if connection is valid."""
        pass
    
    @abstractmethod
    def get_schema(self, dataset_identifier: str) -> Dict[str, Any]:
        """Get dataset schema (column names, types)."""
        pass
    
    @abstractmethod
    def profile_dataset(self, dataset_identifier: str, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Profile dataset for statistics."""
        pass
    
    @abstractmethod
    def read_sample(self, dataset_identifier: str, limit: int = 100) -> List[Dict]:
        """Read sample rows from dataset."""
        pass


class CSVConnector(BaseConnector):
    """Connector for CSV files or DuckDB CSV scanning."""
    
    def __init__(self, file_path: str):
        super().__init__(file_path)
        self.file_path = Path(file_path)
        
        if not self.file_path.exists():
            raise FileNotFoundError(f"CSV file not found: {file_path}")
        
        if not self.file_path.suffix.lower() == '.csv':
            raise ValueError(f"Expected CSV file, got: {self.file_path.suffix}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test CSV file accessibility."""
        try:
            df = pd.read_csv(self.file_path, nrows=1)
            return {
                "success": True,
                "message": f"CSV file accessible ({self.file_path.stat().st_size} bytes)"
            }
        except Exception as e:
            logger.error(f"CSV connection test failed: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    
    def get_schema(self, dataset_identifier: str = "data") -> Dict[str, Any]:
        """Extract CSV schema using pandas."""
        try:
            df = pd.read_csv(self.file_path, nrows=100)
            
            schema = {
                "dataset": dataset_identifier,
                "columns": []
            }
            
            for col in df.columns:
                col_type = str(df[col].dtype)
                schema["columns"].append({
                    "name": col,
                    "type": col_type,
                    "nullable": df[col].isna().any()
                })
            
            return schema
        except Exception as e:
            logger.error(f"Failed to extract CSV schema: {e}")
            raise
    
    def profile_dataset(self, dataset_identifier: str = "data", sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Profile CSV dataset for data quality metrics."""
        try:
            df = pd.read_csv(self.file_path)
            
            profile = {
                "dataset": dataset_identifier,
                "row_count": len(df),
                "column_count": len(df.columns),
                "file_size_bytes": self.file_path.stat().st_size,
                "columns": []
            }
            
            for col in df.columns:
                col_profile = {
                    "name": col,
                    "type": str(df[col].dtype),
                    "null_count": df[col].isna().sum(),
                    "null_percentage": float(df[col].isna().sum() / len(df) * 100),
                    "unique_count": df[col].nunique(),
                    "min_length": None,
                    "max_length": None
                }
                
                # String column statistics
                if df[col].dtype == 'object':
                    str_lengths = df[col].astype(str).str.len()
                    col_profile["min_length"] = int(str_lengths.min())
                    col_profile["max_length"] = int(str_lengths.max())
                
                # Numeric column statistics
                if pd.api.types.is_numeric_dtype(df[col]):
                    col_profile["mean"] = float(df[col].mean())
                    col_profile["median"] = float(df[col].median())
                    col_profile["std_dev"] = float(df[col].std())
                    col_profile["min_value"] = float(df[col].min())
                    col_profile["max_value"] = float(df[col].max())
                
                profile["columns"].append(col_profile)
            
            return profile
        except Exception as e:
            logger.error(f"Failed to profile CSV dataset: {e}")
            raise
    
    def read_sample(self, dataset_identifier: str = "data", limit: int = 100) -> List[Dict]:
        """Read sample rows from CSV."""
        try:
            df = pd.read_csv(self.file_path, nrows=limit)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to read CSV sample: {e}")
            raise


class ParquetConnector(BaseConnector):
    """Connector for Parquet files."""
    
    def __init__(self, file_path: str):
        super().__init__(file_path)
        self.file_path = Path(file_path)
        
        if not self.file_path.exists():
            raise FileNotFoundError(f"Parquet file not found: {file_path}")
        
        ext = self.file_path.suffix.lower()
        if ext not in ['.parquet', '.parq']:
            raise ValueError(f"Expected Parquet file, got: {ext}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Parquet file accessibility."""
        try:
            df = pd.read_parquet(self.file_path, engine='pyarrow')
            return {
                "success": True,
                "message": f"Parquet file accessible ({self.file_path.stat().st_size} bytes)"
            }
        except Exception as e:
            logger.error(f"Parquet connection test failed: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    
    def get_schema(self, dataset_identifier: str = "data") -> Dict[str, Any]:
        """Extract Parquet schema."""
        try:
            df = pd.read_parquet(self.file_path, engine='pyarrow')
            
            schema = {
                "dataset": dataset_identifier,
                "columns": []
            }
            
            for col in df.columns:
                col_type = str(df[col].dtype)
                schema["columns"].append({
                    "name": col,
                    "type": col_type,
                    "nullable": df[col].isna().any()
                })
            
            return schema
        except Exception as e:
            logger.error(f"Failed to extract Parquet schema: {e}")
            raise
    
    def profile_dataset(self, dataset_identifier: str = "data", sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Profile Parquet dataset."""
        try:
            df = pd.read_parquet(self.file_path, engine='pyarrow')
            
            profile = {
                "dataset": dataset_identifier,
                "row_count": len(df),
                "column_count": len(df.columns),
                "file_size_bytes": self.file_path.stat().st_size,
                "columns": []
            }
            
            for col in df.columns:
                col_profile = {
                    "name": col,
                    "type": str(df[col].dtype),
                    "null_count": df[col].isna().sum(),
                    "null_percentage": float(df[col].isna().sum() / len(df) * 100),
                    "unique_count": df[col].nunique()
                }
                profile["columns"].append(col_profile)
            
            return profile
        except Exception as e:
            logger.error(f"Failed to profile Parquet dataset: {e}")
            raise
    
    def read_sample(self, dataset_identifier: str = "data", limit: int = 100) -> List[Dict]:
        """Read sample rows from Parquet."""
        try:
            df = pd.read_parquet(self.file_path, engine='pyarrow')
            return df.head(limit).to_dict('records')
        except Exception as e:
            logger.error(f"Failed to read Parquet sample: {e}")
            raise


def get_connector(connection_obj) -> BaseConnector:
    """Factory function to get appropriate connector for connection type."""
    conn_type = connection_obj.type.lower()
    connection_url = connection_obj.remote_url
    
    if conn_type == "csv":
        return CSVConnector(connection_url)
    elif conn_type == "parquet":
        return ParquetConnector(connection_url)
    else:
        raise ValueError(f"Unsupported connection type: {conn_type}")
