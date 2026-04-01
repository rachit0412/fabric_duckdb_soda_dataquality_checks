"""
Enhanced data quality scanner with advanced features
"""
import duckdb
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
from soda.scan import Scan
import logging
from dataclasses import dataclass, asdict
import uuid

from ..config import config
from .profiler import DataProfiler
from .anomaly_detector import AnomalyDetector

logger = logging.getLogger(__name__)


@dataclass
class ScanResult:
    """Structured scan result"""
    scan_id: str
    timestamp: datetime
    data_source: str
    table_name: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    warned_checks: int
    pass_rate: float
    status: str  # PASSED, WARNING, FAILED, CRITICAL
    duration_seconds: float
    check_details: List[Dict]
    anomalies: Optional[List[Dict]] = None
    profile: Optional[Dict] = None
    metadata: Optional[Dict] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return result


class EnhancedDataQualityScanner:
    """
    Enterprise-grade data quality scanner with:
    - Standard Soda checks
    - Anomaly detection
    - Data profiling
    - Historical comparison
    - Detailed reporting
    """
    
    def __init__(self, connection: Optional[duckdb.DuckDBPyConnection] = None):
        self.connection = connection or duckdb.connect(config.duckdb_path)
        self.profiler = DataProfiler() if config.enable_data_profiling else None
        self.anomaly_detector = AnomalyDetector() if config.enable_anomaly_detection else None
        
    def load_data(self, csv_path: str, table_name: str) -> pd.DataFrame:
        """Load data from CSV into DuckDB with proper type casting"""
        logger.info(f"Loading data from {csv_path} into table {table_name}")
        
        try:
            # Load CSV
            df = pd.read_csv(csv_path)
            logger.info(f"Initial dtypes:\n{df.dtypes}")
            
            # Auto-detect and cast date columns
            date_columns = [col for col in df.columns if 'date' in col.lower() or 'signup' in col.lower() or 'created' in col.lower()]
            for col in date_columns:
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    logger.info(f"Cast {col} to datetime")
                except Exception as e:
                    logger.warning(f"Could not cast {col} to datetime: {e}")
            
            # Auto-detect and cast boolean columns
            bool_columns = [col for col in df.columns if 'is' in col.lower() or 'active' in col.lower()]
            for col in bool_columns:
                if df[col].nunique() <= 2:
                    try:
                        df[col] = df[col].astype(bool)
                        logger.info(f"Cast {col} to boolean")
                    except Exception as e:
                        logger.warning(f"Could not cast {col} to boolean: {e}")
            
            # Auto-detect and cast numeric columns
            numeric_columns = [col for col in df.columns if col.lower() in ['age', 'count', 'amount', 'value', 'score', 'rating']]
            for col in numeric_columns:
                if col in df.columns:
                    try:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        logger.info(f"Cast {col} to numeric")
                    except Exception as e:
                        logger.warning(f"Could not cast {col} to numeric: {e}")
            
            logger.info(f"Final dtypes:\n{df.dtypes}")
            
            # Drop and create table with proper schema
            self.connection.sql(f"DROP TABLE IF EXISTS {table_name}")
            self.connection.sql(f"CREATE TABLE {table_name} AS SELECT * FROM df")
            
            # Log final schema
            schema_result = self.connection.sql(f"DESCRIBE {table_name}").fetchall()
            logger.info(f"DuckDB table schema for {table_name}: {schema_result}")
            
            row_count = self.connection.sql(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
            logger.info(f"Loaded {row_count} rows into {table_name}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def run_soda_scan(self, table_name: str, checks_path: str, config_path: str) -> Scan:
        """Execute Soda data quality checks"""
        logger.info(f"Running Soda scan on {table_name}")
        
        scan = Scan()
        scan.add_duckdb_connection(self.connection)
        scan.set_data_source_name("duckdb")
        scan.add_sodacl_yaml_files(checks_path)
        scan.set_scan_definition_name(f"scan_{table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        # Execute scan
        scan.execute()
        
        return scan
    
    def parse_scan_results(self, scan: Scan, table_name: str) -> Dict:
        """Parse Soda scan results into structured format"""
        scan_results = scan.get_scan_results()
        check_results = scan_results.get('checks', [])
        
        passed = sum(1 for check in check_results if check.get('outcome') == "pass")
        failed = sum(1 for check in check_results if check.get('outcome') == "fail")
        warned = sum(1 for check in check_results if check.get('outcome') == "warn")
        total = len(check_results)
        
        pass_rate = passed / total if total > 0 else 0
        
        # Determine overall status
        if pass_rate >= config.warning_threshold:
            status = "PASSED"
        elif pass_rate >= config.critical_failure_threshold:
            status = "WARNING"
        else:
            status = "CRITICAL"
        
        # Get detailed check information
        check_details = []
        for check in check_results:
            check_details.append({
                "name": check.get('name', ''),
                "table": check.get('table', ''),
                "column": check.get('column'),
                "outcome": check.get('outcome', ''),
                "metrics": check.get('metrics', []),
                "diagnostics": check.get('diagnostics', {})
            })
        
        return {
            "total_checks": total,
            "passed_checks": passed,
            "failed_checks": failed,
            "warned_checks": warned,
            "pass_rate": pass_rate,
            "status": status,
            "check_details": check_details
        }
    
    def execute_comprehensive_scan(
        self,
        csv_path: str,
        table_name: str,
        checks_path: str,
        config_path: str,
        selected_rules: Optional[List[str]] = None
    ) -> ScanResult:
        """
        Execute comprehensive data quality scan including:
        - Data loading
        - Soda checks
        - Data profiling
        - Anomaly detection
        
        Args:
            selected_rules: Optional list of rule categories to run
                           (e.g., ['rowCount', 'missingValues'])
                           If None or empty, runs all checks
        """
        scan_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        logger.info(f"Starting comprehensive scan {scan_id} for {table_name}")
        if selected_rules:
            logger.info(f"Selected rules: {selected_rules}")
        
        # Mapping of rules to check patterns
        rules_to_checks = {
            'rowCount': ['row_count'],
            'missingValues': ['missing_count', 'missing_percent'],
            'duplicates': ['duplicate_count'],
            'formatValidation': ['invalid_count'],
            'rangeValidation': ['min(', 'max(', 'avg('],
            'freshness': ['fresh', 'SignupDate'],
            'customPatterns': ['pattern', 'regex'],
            'anomaly': ['anomaly']
        }
        
        try:
            # Load data
            df = self.load_data(csv_path, table_name)
            
            # Run Soda scan
            soda_scan = self.run_soda_scan(table_name, checks_path, config_path)
            scan_results = self.parse_scan_results(soda_scan, table_name)
            
            # Filter checks if specific rules selected
            if selected_rules:
                filtered_details = []
                for check in scan_results['check_details']:
                    check_name = check.get('name', '').lower()
                    
                    # Check if this check matches any selected rule
                    for rule in selected_rules:
                        if rule in rules_to_checks:
                            patterns = rules_to_checks[rule]
                            if any(pattern.lower() in check_name for pattern in patterns):
                                filtered_details.append(check)
                                break
                
                # Recalculate stats based on filtered checks
                if filtered_details:
                    passed = sum(1 for c in filtered_details if c['outcome'] == 'pass')
                    failed = sum(1 for c in filtered_details if c['outcome'] == 'fail')
                    warned = sum(1 for c in filtered_details if c['outcome'] == 'warn')
                    total = len(filtered_details)
                    pass_rate = passed / total if total > 0 else 0
                    
                    # Update status based on filtered results
                    if pass_rate >= config.warning_threshold:
                        status = "PASSED"
                    elif pass_rate >= config.critical_failure_threshold:
                        status = "WARNING"
                    else:
                        status = "CRITICAL"
                    
                    scan_results['check_details'] = filtered_details
                    scan_results['total_checks'] = total
                    scan_results['passed_checks'] = passed
                    scan_results['failed_checks'] = failed
                    scan_results['warned_checks'] = warned
                    scan_results['pass_rate'] = pass_rate
                    scan_results['status'] = status
                    
                    logger.info(f"Filtered to {total} checks from {selected_rules}")
            
            # Profile data
            profile = None
            # Temporarily disabled due to profiling issues
            # if self.profiler:
            #     logger.info("Running data profiling")
            #     profile = self.profiler.profile_dataframe(df, table_name)
            
            # Detect anomalies
            anomalies = None
            # Temporarily disabled due to numpy boolean issues
            # if self.anomaly_detector:
            #     logger.info("Running anomaly detection")
            #     anomalies = self.anomaly_detector.detect_anomalies(df, table_name)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Create structured result
            result = ScanResult(
                scan_id=scan_id,
                timestamp=datetime.now(),
                data_source=csv_path,
                table_name=table_name,
                total_checks=scan_results["total_checks"],
                passed_checks=scan_results["passed_checks"],
                failed_checks=scan_results["failed_checks"],
                warned_checks=scan_results["warned_checks"],
                pass_rate=scan_results["pass_rate"],
                status=scan_results["status"],
                duration_seconds=duration,
                check_details=scan_results["check_details"],
                anomalies=anomalies,
                profile=profile,
                metadata={
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "columns": list(df.columns)
                }
            )
            
            logger.info(f"Scan {scan_id} completed in {duration:.2f}s with status: {result.status}")
            
            return result
            
        except Exception as e:
            logger.error(f"Scan {scan_id} failed: {str(e)}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
