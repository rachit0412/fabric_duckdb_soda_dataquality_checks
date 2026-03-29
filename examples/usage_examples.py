"""
Example usage of the Data Quality Platform
"""
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.scanner import EnhancedDataQualityScanner
from src.reporting.html_generator import HTMLReportGenerator
from src.storage.cosmos_repository import CosmosDBRepository
from src.notifications.alerting import AlertingService
from src.utils.logging import setup_logging


def example_basic_scan():
    """Example: Basic data quality scan"""
    print("=" * 60)
    print("Example 1: Basic Data Quality Scan")
    print("=" * 60)
    
    # Setup logging
    setup_logging(log_level="INFO")
    
    # Initialize scanner
    scanner = EnhancedDataQualityScanner()
    
    # Run scan
    result = scanner.execute_comprehensive_scan(
        csv_path="/lakehouse/default/Files/sample_data_quality_test_large.csv",
        table_name="sample_data",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    # Print results
    print(f"\n✅ Scan completed!")
    print(f"Status: {result.status}")
    print(f"Pass Rate: {result.pass_rate:.1%}")
    print(f"Total Checks: {result.total_checks}")
    print(f"Failed Checks: {result.failed_checks}")
    print(f"Anomalies Detected: {len(result.anomalies or [])}")
    
    scanner.close()


def example_with_reporting():
    """Example: Scan with HTML reporting"""
    print("\n" + "=" * 60)
    print("Example 2: Scan with HTML Report Generation")
    print("=" * 60)
    
    setup_logging(log_level="INFO")
    
    # Run scan
    scanner = EnhancedDataQualityScanner()
    result = scanner.execute_comprehensive_scan(
        csv_path="/lakehouse/default/Files/sample_data_quality_test_large.csv",
        table_name="sample_data",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    # Generate HTML report
    report_generator = HTMLReportGenerator()
    report_path = f"reports/report_{result.scan_id}.html"
    report_generator.generate_report(result, report_path)
    
    print(f"\n📊 HTML report generated: {report_path}")
    
    scanner.close()


def example_with_cosmos_db():
    """Example: Scan with Cosmos DB storage"""
    print("\n" + "=" * 60)
    print("Example 3: Scan with Database Storage (PostgreSQL/Cosmos DB)")
    print("=" * 60)
    
    setup_logging(log_level="INFO")
    
    # Run scan
    scanner = EnhancedDataQualityScanner()
    result = scanner.execute_comprehensive_scan(
        csv_path="/lakehouse/default/Files/sample_data_quality_test_large.csv",
        table_name="sample_data",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    # Save to database (PostgreSQL by default)
    from src.storage.postgres_repository import PostgreSQLRepository
    
    storage_repo = PostgreSQLRepository()
    if storage_repo.save_scan_result(result):
        print("\n💾 Scan result saved to database")
        
        # Get historical data
        history = storage_repo.get_scan_history("sample_data", days=7)
        print(f"📈 Historical scans: {len(history)}")
        
        # Get trend analysis
        trends = storage_repo.get_trend_analysis("sample_data", days=7)
        print(f"📊 Trend: {trends.get('trend', 'N/A')}")
        
        storage_repo.close()
    
    scanner.close()


def example_with_alerting():
    """Example: Scan with alerting"""
    print("\n" + "=" * 60)
    print("Example 4: Scan with Alerting")
    print("=" * 60)
    
    setup_logging(log_level="INFO")
    
    # Run scan
    scanner = EnhancedDataQualityScanner()
    result = scanner.execute_comprehensive_scan(
        csv_path="/lakehouse/default/Files/sample_data_quality_test_large.csv",
        table_name="sample_data",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    # Send alerts
    alerting_service = AlertingService()
    alerting_service.process_scan_result(result)
    
    print(f"\n🔔 Alerts processed for status: {result.status}")
    
    scanner.close()


def example_comprehensive():
    """Example: Complete end-to-end workflow"""
    print("\n" + "=" * 60)
    print("Example 5: Complete End-to-End Workflow")
    print("=" * 60)
    
    setup_logging(log_level="INFO", log_file="logs/data_quality.log")
    
    # Initialize all services
    scanner = EnhancedDataQualityScanner()
    report_generator = HTMLReportGenerator()
    
    # Use PostgreSQL by default (can also use Cosmos DB)
    from src.storage.postgres_repository import PostgreSQLRepository
    storage_repo = PostgreSQLRepository()
    
    alerting_service = AlertingService()
    
    # Run scan
    print("\n1️⃣ Running comprehensive scan...")
    result = scanner.execute_comprehensive_scan(
        csv_path="/lakehouse/default/Files/sample_data_quality_test_large.csv",
        table_name="sample_data",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    print(f"✅ Scan completed: {result.status}")
    
    # Generate report
    print("\n2️⃣ Generating HTML report...")
    report_path = f"reports/report_{result.scan_id}.html"
    report_generator.generadatabase...")
    if storage_repo.save_scan_result(result):
        print("✅ Saved to database
    # Save to Cosmos DB
    print("\n3️⃣ Saving to Cosmos DB...")
    if cosmos_repo.save_scan_result(result):
        print("✅ Saved to Cosmos DB")
    
    # Send alerts
    print("\n4️⃣ Processing alerts...")
    alerting_service.process_scan_result(result)
    print("✅ Alerts sent")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Scan ID: {result.scan_id}")
    print(f"Status: {result.status}")
    print(f"Pass Rate: {result.pass_rate:.1%}")
    print(f"Duration: {result.duration_seconds:.2f}s")
    print(f"Failed Checks: {result.failed_checks}/{result.total_checks}")
    print(f"Anomalies: {len(result.anomalies or [])}")
    
    scanner.close()


if __name__ == "__main__":
    print("🎯 Enterprise Data Quality Platform - Examples")
    print("=" * 60)
    
    # Run examples
    try:
        example_basic_scan()
        example_with_reporting()
        example_with_cosmos_db()
        example_with_alerting()
        example_comprehensive()
        
        print("\n" + "=" * 60)
        print("🎉 All examples completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error running examples: {str(e)}")
        import traceback
        traceback.print_exc()
