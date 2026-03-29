"""
PostgreSQL integration for historical data tracking
Cost-effective, open-source alternative to Azure Cosmos DB
"""
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
import json

from ..config import config
from ..core.scanner import ScanResult

logger = logging.getLogger(__name__)


class PostgreSQLRepository:
    """
    Store and retrieve data quality scan results in PostgreSQL
    Enables historical analysis and trend tracking
    
    Benefits over Cosmos DB:
    - Open source and free
    - Lower operational costs
    - Familiar SQL interface
    - Strong ACID guarantees
    - Wide hosting options (Azure, AWS, on-prem, Docker)
    """
    
    def __init__(self):
        self.connection = None
        self.config = config.postgres_config
        
        if not self._is_configured():
            logger.warning("PostgreSQL not configured - historical tracking disabled")
            return
        
        try:
            self._connect()
            self._ensure_schema()
            logger.info("Connected to PostgreSQL for historical tracking")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {str(e)}")
            self.connection = None
    
    def _is_configured(self) -> bool:
        """Check if PostgreSQL is properly configured"""
        return bool(
            self.config.host and 
            self.config.database and 
            self.config.user
        )
    
    def _connect(self):
        """Connect to PostgreSQL database"""
        self.connection = psycopg2.connect(
            host=self.config.host,
            port=self.config.port,
            database=self.config.database,
            user=self.config.user,
            password=self.config.password,
            sslmode=self.config.sslmode,
            connect_timeout=10
        )
        self.connection.autocommit = False
    
    def _ensure_schema(self):
        """Create tables if they don't exist"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS data_quality_scans (
            scan_id VARCHAR(100) PRIMARY KEY,
            timestamp TIMESTAMP NOT NULL,
            table_name VARCHAR(255) NOT NULL,
            data_source TEXT NOT NULL,
            total_checks INTEGER NOT NULL,
            passed_checks INTEGER NOT NULL,
            failed_checks INTEGER NOT NULL,
            warned_checks INTEGER NOT NULL,
            pass_rate DECIMAL(5, 4) NOT NULL,
            status VARCHAR(50) NOT NULL,
            duration_seconds DECIMAL(10, 2) NOT NULL,
            check_details JSONB,
            anomalies JSONB,
            profile JSONB,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for efficient queries
        CREATE INDEX IF NOT EXISTS idx_table_name ON data_quality_scans(table_name);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON data_quality_scans(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_status ON data_quality_scans(status);
        CREATE INDEX IF NOT EXISTS idx_table_timestamp ON data_quality_scans(table_name, timestamp DESC);
        """
        
        with self.connection.cursor() as cursor:
            cursor.execute(create_table_sql)
        self.connection.commit()
        logger.info("PostgreSQL schema initialized")
    
    def save_scan_result(self, scan_result: ScanResult) -> bool:
        """Save scan result to PostgreSQL"""
        if not self.connection:
            logger.warning("PostgreSQL not available - skipping save")
            return False
        
        try:
            insert_sql = """
            INSERT INTO data_quality_scans (
                scan_id, timestamp, table_name, data_source,
                total_checks, passed_checks, failed_checks, warned_checks,
                pass_rate, status, duration_seconds,
                check_details, anomalies, profile, metadata
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """
            
            with self.connection.cursor() as cursor:
                cursor.execute(insert_sql, (
                    scan_result.scan_id,
                    scan_result.timestamp,
                    scan_result.table_name,
                    scan_result.data_source,
                    scan_result.total_checks,
                    scan_result.passed_checks,
                    scan_result.failed_checks,
                    scan_result.warned_checks,
                    scan_result.pass_rate,
                    scan_result.status,
                    scan_result.duration_seconds,
                    Json(scan_result.check_details),
                    Json(scan_result.anomalies) if scan_result.anomalies else None,
                    Json(scan_result.profile) if scan_result.profile else None,
                    Json(scan_result.metadata) if scan_result.metadata else None
                ))
            
            self.connection.commit()
            logger.info(f"Saved scan result {scan_result.scan_id} to PostgreSQL")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to PostgreSQL: {str(e)}")
            self.connection.rollback()
            return False
    
    def get_scan_history(
        self,
        table_name: str,
        days: int = 30,
        limit: int = 100
    ) -> List[Dict]:
        """Get historical scan results for a table"""
        if not self.connection:
            return []
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            query = """
            SELECT 
                scan_id, timestamp, table_name, data_source,
                total_checks, passed_checks, failed_checks, warned_checks,
                pass_rate, status, duration_seconds,
                check_details, anomalies, profile, metadata
            FROM data_quality_scans
            WHERE table_name = %s 
              AND timestamp >= %s
            ORDER BY timestamp DESC
            LIMIT %s
            """
            
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, (table_name, cutoff_date, limit))
                results = cursor.fetchall()
            
            # Convert to list of dicts and format timestamps
            history = []
            for row in results:
                item = dict(row)
                item['timestamp'] = item['timestamp'].isoformat()
                history.append(item)
            
            logger.info(f"Retrieved {len(history)} historical scans for {table_name}")
            return history
            
        except Exception as e:
            logger.error(f"Error querying PostgreSQL: {str(e)}")
            return []
    
    def get_trend_analysis(self, table_name: str, days: int = 7) -> Dict:
        """Get trend analysis for a table"""
        if not self.connection:
            return {}
        
        history = self.get_scan_history(table_name, days=days)
        
        if not history:
            return {"message": "No historical data available"}
        
        # Calculate trends
        pass_rates = [item['pass_rate'] for item in history]
        avg_pass_rate = sum(pass_rates) / len(pass_rates)
        
        latest_pass_rate = float(history[0]['pass_rate'])
        trend = "improving" if latest_pass_rate > avg_pass_rate else "declining"
        
        return {
            "table_name": table_name,
            "period_days": days,
            "scan_count": len(history),
            "average_pass_rate": float(avg_pass_rate),
            "latest_pass_rate": latest_pass_rate,
            "trend": trend,
            "historical_pass_rates": [float(pr) for pr in pass_rates[:10]]
        }
    
    def get_all_tables_summary(self, days: int = 30) -> List[Dict]:
        """Get summary of all monitored tables"""
        if not self.connection:
            return []
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            query = """
            SELECT 
                table_name,
                MAX(timestamp) as last_scan,
                AVG(pass_rate) as avg_pass_rate,
                COUNT(*) as scan_count,
                MAX(status) as latest_status
            FROM data_quality_scans
            WHERE timestamp >= %s
            GROUP BY table_name
            ORDER BY last_scan DESC
            """
            
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, (cutoff_date,))
                results = cursor.fetchall()
            
            summary = []
            for row in results:
                item = dict(row)
                item['last_scan'] = item['last_scan'].isoformat()
                item['avg_pass_rate'] = float(item['avg_pass_rate'])
                summary.append(item)
            
            return summary
            
        except Exception as e:
            logger.error(f"Error querying PostgreSQL: {str(e)}")
            return []
    
    def get_scan_by_id(self, scan_id: str) -> Optional[Dict]:
        """Get specific scan by ID"""
        if not self.connection:
            return None
        
        try:
            query = """
            SELECT * FROM data_quality_scans
            WHERE scan_id = %s
            """
            
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, (scan_id,))
                result = cursor.fetchone()
            
            if result:
                item = dict(result)
                item['timestamp'] = item['timestamp'].isoformat()
                item['created_at'] = item['created_at'].isoformat()
                return item
            
            return None
            
        except Exception as e:
            logger.error(f"Error querying PostgreSQL: {str(e)}")
            return None
    
    def delete_old_scans(self, days: int = 90) -> int:
        """Delete scans older than specified days (for cleanup)"""
        if not self.connection:
            return 0
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            query = """
            DELETE FROM data_quality_scans
            WHERE timestamp < %s
            """
            
            with self.connection.cursor() as cursor:
                cursor.execute(query, (cutoff_date,))
                deleted_count = cursor.rowcount
            
            self.connection.commit()
            logger.info(f"Deleted {deleted_count} old scan records")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting old scans: {str(e)}")
            self.connection.rollback()
            return 0
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("PostgreSQL connection closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
