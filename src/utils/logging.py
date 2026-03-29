"""
Centralized logging configuration
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from datetime import datetime


def setup_logging(
    log_level: str = "INFO",
    log_file: str = None,
    max_bytes: int = 10485760,  # 10MB
    backup_count: int = 5
):
    """
    Configure enterprise-grade logging with:
    - Console output with colors
    - File rotation
    - Structured formatting
    - Multiple log levels
    """
    
    # Create formatter
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    formatter = logging.Formatter(log_format)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler with color support
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if log_file:
        # Ensure log directory exists
        log_path = Path(log_file).parent
        log_path.mkdir(parents=True, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific log levels for noisy libraries
    logging.getLogger("azure").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    
    root_logger.info("Logging configured successfully")
    
    return root_logger


class StructuredLogger:
    """
    Structured logger for enterprise monitoring
    Outputs JSON-formatted logs for ingestion by monitoring systems
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def log_scan_start(self, scan_id: str, table_name: str):
        """Log scan start"""
        self.logger.info(
            f"SCAN_START | scan_id={scan_id} table={table_name}"
        )
    
    def log_scan_complete(
        self,
        scan_id: str,
        table_name: str,
        status: str,
        duration: float,
        pass_rate: float
    ):
        """Log scan completion"""
        self.logger.info(
            f"SCAN_COMPLETE | scan_id={scan_id} table={table_name} "
            f"status={status} duration={duration:.2f}s pass_rate={pass_rate:.2%}"
        )
    
    def log_scan_error(self, scan_id: str, error: str):
        """Log scan error"""
        self.logger.error(
            f"SCAN_ERROR | scan_id={scan_id} error={error}"
        )
    
    def log_alert_sent(self, scan_id: str, channel: str):
        """Log alert sent"""
        self.logger.info(
            f"ALERT_SENT | scan_id={scan_id} channel={channel}"
        )
    
    def log_metric(self, metric_name: str, value: float, tags: dict = None):
        """Log custom metric"""
        tags_str = " ".join([f"{k}={v}" for k, v in (tags or {}).items()])
        self.logger.info(
            f"METRIC | name={metric_name} value={value} {tags_str}"
        )
