"""
Metadata extraction and profiling service.

Supports multiple data sources: Postgres, BigQuery, CSV/Parquet, Snowflake.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class DataSourceConnector(ABC):
    """Abstract base for data source connectors."""
    
    @abstractmethod
    def connect(self) -> None:
        """Establish connection to data source."""
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """Close connection."""
        pass
    
    @abstractmethod
    def get_schema(self, dataset_identifier: str) -> Dict[str, Any]:
        """Extract schema for a dataset/table."""
        pass
    
    @abstractmethod
    def profile_dataset(self, dataset_identifier: str, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Run profiling on dataset; return stats per column."""
        pass

class PostgresConnector(DataSourceConnector):
    """PostgreSQL connector."""
    
    def __init__(self, connection_url: str):
        self.connection_url = connection_url
        self.conn = None
    
    def connect(self) -> None:
        import psycopg2
        try:
            self.conn = psycopg2.connect(self.connection_url)
            logger.info("Connected to Postgres")
        except Exception as e:
            logger.error(f"Failed to connect to Postgres: {e}")
            raise
    
    def disconnect(self) -> None:
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from Postgres")
    
    def get_schema(self, dataset_identifier: str) -> Dict[str, Any]:
        """Extract schema from Postgres table (schema.table format)."""
        if not self.conn:
            self.connect()
        
        cursor = self.conn.cursor()
        schema_name, table_name = dataset_identifier.split(".", 1) if "." in dataset_identifier else ("public", dataset_identifier)
        
        # Query information schema
        query = """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
        """
        
        cursor.execute(query, (schema_name, table_name))
        columns = []
        
        for col_name, col_type, is_nullable in cursor.fetchall():
            columns.append({
                "name": col_name,
                "type": col_type,
                "nullable": is_nullable == "YES"
            })
        
        cursor.close()
        return {"columns": columns}
    
    def profile_dataset(self, dataset_identifier: str, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Profile dataset: row count, null %, distinct count, min/max."""
        if not self.conn:
            self.connect()
        
        cursor = self.conn.cursor()
        schema_name, table_name = dataset_identifier.split(".", 1) if "." in dataset_identifier else ("public", dataset_identifier)
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {schema_name}.{table_name}")
        row_count = cursor.fetchone()[0]
        
        # Get schema
        schema = self.get_schema(dataset_identifier)
        columns = schema["columns"]
        
        profile = {}
        for col in columns:
            col_name = col["name"]
            col_type = col["type"].upper()
            
            # Basic profile query
            if col_type in ["INT", "BIGINT", "FLOAT", "NUMERIC", "DECIMAL"]:
                query = f"""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN "{col_name}" IS NULL THEN 1 END) as null_count,
                        COUNT(DISTINCT "{col_name}") as distinct_count,
                        MIN("{col_name}") as min_val,
                        MAX("{col_name}") as max_val,
                        AVG("{col_name}") as avg_val,
                        STDDEV_POP("{col_name}") as stddev_val
                    FROM {schema_name}.{table_name}
                """
            elif "TIMESTAMP" in col_type or "DATE" in col_type:
                query = f"""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN "{col_name}" IS NULL THEN 1 END) as null_count,
                        COUNT(DISTINCT "{col_name}") as distinct_count,
                        MIN("{col_name}") as min_val,
                        MAX("{col_name}") as max_val,
                        NULL, NULL
                    FROM {schema_name}.{table_name}
                """
            else:  # String
                query = f"""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN "{col_name}" IS NULL THEN 1 END) as null_count,
                        COUNT(DISTINCT "{col_name}") as distinct_count,
                        MIN(LENGTH(CAST("{col_name}" AS TEXT))) as min_length,
                        MAX(LENGTH(CAST("{col_name}" AS TEXT))) as max_length,
                        NULL, NULL
                    FROM {schema_name}.{table_name}
                """
            
            try:
                cursor.execute(query)
                result = cursor.fetchone()
                total, null_count, distinct_count, val1, val2, val3, val4 = result
                
                profile[col_name] = {
                    "row_count": total,
                    "null_count": null_count,
                    "null_percent": (null_count / total * 100) if total > 0 else 0,
                    "distinct_count": distinct_count or 0,
                }
                
                if col_type in ["INT", "BIGINT", "FLOAT", "NUMERIC", "DECIMAL"]:
                    profile[col_name].update({
                        "min": val1,
                        "max": val2,
                        "mean": val3,
                        "stddev": val4
                    })
                else:
                    profile[col_name].update({
                        "min_length": val1,
                        "max_length": val2
                    })
            except Exception as e:
                logger.warning(f"Failed to profile column {col_name}: {e}")
                profile[col_name] = {
                    "row_count": row_count,
                    "null_count": None,
                    "distinct_count": None,
                    "error": str(e)
                }
        
        cursor.close()
        return profile

class CSVConnector(DataSourceConnector):
    """CSV/Parquet file connector (via DuckDB)."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.conn = None
    
    def connect(self) -> None:
        import duckdb
        try:
            self.conn = duckdb.connect(":memory:")
            logger.info(f"Connected to DuckDB for file {self.file_path}")
        except Exception as e:
            logger.error(f"Failed to connect to DuckDB: {e}")
            raise
    
    def disconnect(self) -> None:
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from DuckDB")
    
    def get_schema(self, dataset_identifier: str) -> Dict[str, Any]:
        """Extract schema from CSV/Parquet."""
        if not self.conn:
            self.connect()
        
        # dataset_identifier is the file path (e.g., 'path/to/file.csv')
        result = self.conn.execute(f"SELECT * FROM '{self.file_path}' LIMIT 0").description
        
        columns = []
        for col_info in result:
            columns.append({
                "name": col_info[0],
                "type": str(col_info[1]),
                "nullable": True
            })
        
        return {"columns": columns}
    
    def profile_dataset(self, dataset_identifier: str, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Profile CSV/Parquet file."""
        if not self.conn:
            self.connect()
        
        # Get schema
        schema = self.get_schema(dataset_identifier)
        columns = schema["columns"]
        
        # Get row count
        row_count = self.conn.execute(f"SELECT COUNT(*) FROM '{self.file_path}'").fetchone()[0]
        
        profile = {}
        for col in columns:
            col_name = col["name"]
            
            # Basic profile
            query = f"""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN "{col_name}" IS NULL THEN 1 END) as null_count,
                    COUNT(DISTINCT "{col_name}") as distinct_count
                FROM '{self.file_path}'
            """
            
            try:
                result = self.conn.execute(query).fetchone()
                total, null_count, distinct_count = result
                
                profile[col_name] = {
                    "row_count": total,
                    "null_count": null_count,
                    "null_percent": (null_count / total * 100) if total > 0 else 0,
                    "distinct_count": distinct_count or 0,
                }
            except Exception as e:
                logger.warning(f"Failed to profile column {col_name}: {e}")
                profile[col_name] = {"error": str(e)}
        
        return profile

class MetadataService:
    """Orchestrates metadata extraction and profiling."""
    
    def __init__(self):
        self.connectors: Dict[str, DataSourceConnector] = {}
    
    def register_connector(self, source_type: str, connector: DataSourceConnector):
        """Register a data source connector."""
        self.connectors[source_type] = connector
    
    def get_connector(self, source_type: str) -> DataSourceConnector:
        """Get connector by type."""
        if source_type not in self.connectors:
            raise ValueError(f"Unknown source type: {source_type}")
        return self.connectors[source_type]
    
    def extract_metadata(self, source_type: str, connection_url: str, dataset_identifier: str) -> Dict[str, Any]:
        """Extract schema metadata."""
        if source_type == "postgres":
            connector = PostgresConnector(connection_url)
        elif source_type == "csv":
            connector = CSVConnector(connection_url)  # connection_url is file path
        else:
            raise ValueError(f"Unsupported source type: {source_type}")
        
        try:
            connector.connect()
            schema = connector.get_schema(dataset_identifier)
            connector.disconnect()
            return schema
        except Exception as e:
            logger.error(f"Failed to extract metadata: {e}")
            raise
    
    def profile_metadata(self, source_type: str, connection_url: str, dataset_identifier: str, 
                        sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Extract schema and profile statistics."""
        if source_type == "postgres":
            connector = PostgresConnector(connection_url)
        elif source_type == "csv":
            connector = CSVConnector(connection_url)
        else:
            raise ValueError(f"Unsupported source type: {source_type}")
        
        try:
            connector.connect()
            schema = connector.get_schema(dataset_identifier)
            profile = connector.profile_dataset(dataset_identifier, sample_size)
            connector.disconnect()
            return {
                "schema": schema,
                "profile": profile
            }
        except Exception as e:
            logger.error(f"Failed to profile dataset: {e}")
            raise

# Singleton instance
metadata_service = MetadataService()
