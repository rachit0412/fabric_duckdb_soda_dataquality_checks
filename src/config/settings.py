"""
Centralized configuration management with environment-specific settings
"""
import os
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class Environment(Enum):
    """Environment types"""
    DEV = "development"
    STAGING = "staging"
    PROD = "production"


@dataclass
class CosmosDBConfig:
    """Azure Cosmos DB configuration for historical data tracking"""
    endpoint: str
    key: str
    database_name: str = "data_quality"
    container_name: str = "scan_results"
    
    @classmethod
    def from_env(cls):
        return cls(
            endpoint=os.getenv("COSMOS_ENDPOINT", ""),
            key=os.getenv("COSMOS_KEY", ""),
            database_name=os.getenv("COSMOS_DB_NAME", "data_quality"),
            container_name=os.getenv("COSMOS_CONTAINER_NAME", "scan_results")
        )


@dataclass
class AlertingConfig:
    """Alerting configuration"""
    enabled: bool = True
    email_enabled: bool = True
    teams_webhook_url: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    sender_email: Optional[str] = None
    recipient_emails: list = None
    
    @classmethod
    def from_env(cls):
        return cls(
            enabled=os.getenv("ALERTING_ENABLED", "true").lower() == "true",
            email_enabled=os.getenv("EMAIL_ALERTS_ENABLED", "true").lower() == "true",
            teams_webhook_url=os.getenv("TEAMS_WEBHOOK_URL"),
            smtp_server=os.getenv("SMTP_SERVER"),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            sender_email=os.getenv("SENDER_EMAIL"),
            recipient_emails=os.getenv("RECIPIENT_EMAILS", "").split(",") if os.getenv("RECIPIENT_EMAILS") else []
        )


@dataclass
class DataQualityConfig:
    """Main configuration class"""
    environment: Environment
    lakehouse_path: str
    duckdb_path: str
    soda_config_path: str
    soda_checks_path: str
    cosmos_config: CosmosDBConfig
    alerting_config: AlertingConfig
    
    # Thresholds
    critical_failure_threshold: float = 0.95  # 95% pass rate minimum
    warning_threshold: float = 0.98  # 98% pass rate for warnings
    
    # Advanced features
    enable_anomaly_detection: bool = True
    enable_data_profiling: bool = True
    enable_historical_analysis: bool = True
    
    @classmethod
    def from_env(cls):
        env = Environment(os.getenv("ENVIRONMENT", "development"))
        
        return cls(
            environment=env,
            lakehouse_path=os.getenv("LAKEHOUSE_PATH", "/lakehouse/default/Files"),
            duckdb_path=os.getenv("DUCKDB_PATH", "my_database.myduckdb"),
            soda_config_path=os.getenv("SODA_CONFIG_PATH", "/lakehouse/default/Files/soda_duckdb/config.yml"),
            soda_checks_path=os.getenv("SODA_CHECKS_PATH", "/lakehouse/default/Files/soda_duckdb/checks.yml"),
            cosmos_config=CosmosDBConfig.from_env(),
            alerting_config=AlertingConfig.from_env(),
            critical_failure_threshold=float(os.getenv("CRITICAL_FAILURE_THRESHOLD", "0.95")),
            warning_threshold=float(os.getenv("WARNING_THRESHOLD", "0.98")),
            enable_anomaly_detection=os.getenv("ENABLE_ANOMALY_DETECTION", "true").lower() == "true",
            enable_data_profiling=os.getenv("ENABLE_DATA_PROFILING", "true").lower() == "true",
            enable_historical_analysis=os.getenv("ENABLE_HISTORICAL_ANALYSIS", "true").lower() == "true"
        )


# Global config instance
config = DataQualityConfig.from_env()
