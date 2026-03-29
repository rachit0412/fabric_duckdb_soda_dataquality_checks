"""
Azure Cosmos DB integration for historical data tracking
"""
from azure.cosmos import CosmosClient, PartitionKey, exceptions
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta

from ..config import config
from ..core.scanner import ScanResult

logger = logging.getLogger(__name__)


class CosmosDBRepository:
    """
    Store and retrieve data quality scan results in Azure Cosmos DB
    Enables historical analysis and trend tracking
    """
    
    def __init__(self):
        if not config.cosmos_config.endpoint or not config.cosmos_config.key:
            logger.warning("Cosmos DB not configured - historical tracking disabled")
            self.client = None
            return
        
        try:
            self.client = CosmosClient(
                config.cosmos_config.endpoint,
                config.cosmos_config.key
            )
            self.database = self._get_or_create_database()
            self.container = self._get_or_create_container()
            logger.info("Connected to Cosmos DB for historical tracking")
        except Exception as e:
            logger.error(f"Failed to connect to Cosmos DB: {str(e)}")
            self.client = None
    
    def _get_or_create_database(self):
        """Get or create database"""
        try:
            return self.client.create_database_if_not_exists(
                id=config.cosmos_config.database_name
            )
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error creating database: {str(e)}")
            raise
    
    def _get_or_create_container(self):
        """Get or create container with optimal partition key"""
        try:
            return self.database.create_container_if_not_exists(
                id=config.cosmos_config.container_name,
                partition_key=PartitionKey(path="/table_name"),
                offer_throughput=400  # Start with minimal RUs
            )
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error creating container: {str(e)}")
            raise
    
    def save_scan_result(self, scan_result: ScanResult) -> bool:
        """Save scan result to Cosmos DB"""
        if not self.client:
            logger.warning("Cosmos DB not available - skipping save")
            return False
        
        try:
            document = scan_result.to_dict()
            document['id'] = scan_result.scan_id  # Cosmos DB requires 'id' field
            document['ttl'] = 7776000  # 90 days retention
            
            self.container.create_item(body=document)
            logger.info(f"Saved scan result {scan_result.scan_id} to Cosmos DB")
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error saving to Cosmos DB: {str(e)}")
            return False
    
    def get_scan_history(
        self,
        table_name: str,
        days: int = 30,
        limit: int = 100
    ) -> List[Dict]:
        """Get historical scan results for a table"""
        if not self.client:
            return []
        
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            query = """
                SELECT * FROM c 
                WHERE c.table_name = @table_name 
                AND c.timestamp >= @cutoff_date
                ORDER BY c.timestamp DESC
                OFFSET 0 LIMIT @limit
            """
            
            parameters = [
                {"name": "@table_name", "value": table_name},
                {"name": "@cutoff_date", "value": cutoff_date},
                {"name": "@limit", "value": limit}
            ]
            
            items = list(self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=False,
                partition_key=table_name
            ))
            
            logger.info(f"Retrieved {len(items)} historical scans for {table_name}")
            return items
            
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error querying Cosmos DB: {str(e)}")
            return []
    
    def get_trend_analysis(self, table_name: str, days: int = 7) -> Dict:
        """Get trend analysis for a table"""
        if not self.client:
            return {}
        
        history = self.get_scan_history(table_name, days=days)
        
        if not history:
            return {"message": "No historical data available"}
        
        # Calculate trends
        pass_rates = [item['pass_rate'] for item in history]
        avg_pass_rate = sum(pass_rates) / len(pass_rates)
        
        latest_pass_rate = history[0]['pass_rate']
        trend = "improving" if latest_pass_rate > avg_pass_rate else "declining"
        
        return {
            "table_name": table_name,
            "period_days": days,
            "scan_count": len(history),
            "average_pass_rate": avg_pass_rate,
            "latest_pass_rate": latest_pass_rate,
            "trend": trend,
            "historical_pass_rates": pass_rates[:10]  # Last 10 for charting
        }
    
    def get_all_tables_summary(self) -> List[Dict]:
        """Get summary of all monitored tables"""
        if not self.client:
            return []
        
        try:
            query = """
                SELECT c.table_name, 
                       MAX(c.timestamp) as last_scan,
                       AVG(c.pass_rate) as avg_pass_rate,
                       COUNT(1) as scan_count
                FROM c
                WHERE c.timestamp >= @cutoff_date
                GROUP BY c.table_name
            """
            
            cutoff_date = (datetime.now() - timedelta(days=30)).isoformat()
            
            parameters = [
                {"name": "@cutoff_date", "value": cutoff_date}
            ]
            
            items = list(self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return items
            
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Error querying Cosmos DB: {str(e)}")
            return []
