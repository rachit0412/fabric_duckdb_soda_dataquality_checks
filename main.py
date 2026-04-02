"""
Main entry point for the Data Quality Platform
Run scans from command line
"""
import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.core.scanner import EnhancedDataQualityScanner
from src.reporting.html_generator import HTMLReportGenerator
from src.storage.cosmos_repository import CosmosDBRepository
from src.notifications.alerting import AlertingService
from src.utils.logging import setup_logging
from src.config import config


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Enterprise Data Quality Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run a basic scan
  python main.py --csv data.csv --table customers
  
  # Run scan with custom checks
  python main.py --csv data.csv --table customers --checks my_checks.yml
  
  # Run scan and generate report
  python main.py --csv data.csv --table customers --report report.html
  
  # Start API server
  python main.py --api --port 8000
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Scan command
    scan_parser = subparsers.add_parser('scan', help='Run data quality scan')
    scan_parser.add_argument('--csv', required=True, help='Path to CSV file')
    scan_parser.add_argument('--table', required=True, help='Table name')
    scan_parser.add_argument('--checks', help='Path to checks.yml file')
    scan_parser.add_argument('--config', help='Path to config.yml file')
    scan_parser.add_argument('--report', help='Output HTML report path')
    scan_parser.add_argument('--no-alerts', action='store_true', help='Disable alerts')
    scan_parser.add_argument('--no-cosmos', action='store_true', help='Disable Cosmos DB storage')
    
    # API command
    api_parser = subparsers.add_parser('api', help='Start API server')
    api_parser.add_argument('--host', default='0.0.0.0', help='API host')
    api_parser.add_argument('--port', type=int, default=8000, help='API port')
    
    # History command
    history_parser = subparsers.add_parser('history', help='View scan history')
    history_parser.add_argument('--table', required=True, help='Table name')
    history_parser.add_argument('--days', type=int, default=30, help='Number of days')
    
    # Trends command
    trends_parser = subparsers.add_parser('trends', help='View trends')
    trends_parser.add_argument('--table', required=True, help='Table name')
    trends_parser.add_argument('--days', type=int, default=7, help='Number of days')
    
    args = parser.parse_args()
    
    # Setup logging - map environment to logging level
    log_level_map = {
        "development": "DEBUG",
        "staging": "INFO",
        "production": "WARNING"
    }
    log_level = log_level_map.get(config.environment.value, "INFO")
    
    # Use /tmp for logs if logs directory is not writable
    log_file = "/tmp/data_quality.log"
    try:
        import os
        if os.path.exists("logs") and os.access("logs", os.W_OK):
            log_file = "logs/data_quality.log"
    except:
        pass
    
    setup_logging(
        log_level=log_level,
        log_file=log_file
    )
    
    if args.command == 'scan':
        run_scan(args)
    elif args.command == 'api':
        start_api(args)
    elif args.command == 'history':
        view_history(args)
    elif args.command == 'trends':
        view_trends(args)
    else:
        parser.print_help()


def run_scan(args):
    """Run data quality scan"""
    print("🎯 Enterprise Data Quality Platform")
    print("=" * 60)
    
    # Initialize services
    scanner = EnhancedDataQualityScanner()
    
    # Run scan
    print(f"📊 Scanning {args.table}...")
    result = scanner.execute_comprehensive_scan(
        csv_path=args.csv,
        table_name=args.table,
        checks_path=args.checks or config.soda_checks_path,
        config_path=args.config or config.soda_config_path
    )
    
    # Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Status: {result.status}")
    print(f"Pass Rate: {result.pass_rate:.1%}")
    print(f"Total Checks: {result.total_checks}")
    print(f"Passed: {result.passed_checks}")
    print(f"Failed: {result.failed_checks}")
    print(f"Anomalies: {len(result.anomalies or [])}")
    print(f"Duration: {result.duration_seconds:.2f}s")
    
    # Generate report
    if args.report:
        print(f"\n📝 Generating report...")
        report_generator = HTMLReportGenerator()
        report_generator.generate_report(result, args.report)
        print(f"✅ Report saved: {args.report}")
    
    # Save to Cosmos DB
    if not args.no_cosmos:
        print(f"\n💾 Saving to database...")
        
        # Import dynamically based on config
        from src.config import config
        
        if config.storage_backend == "postgresql":
            from src.storage.postgres_repository import PostgreSQLRepository
            storage_repo = PostgreSQLRepository()
        elif config.storage_backend == "cosmosdb":
            from src.storage.cosmos_repository import CosmosDBRepository
            storage_repo = PostgreSQLRepository()
        else:
            storage_repo = None
        
        if storage_repo and storage_repo.save_scan_result(result):
            print(f"✅ Saved to {config.storage_backend}")
            if hasattr(storage_repo, 'close'):
                storage_repo.close()
    
    # Send alerts
    if not args.no_alerts:
        print(f"\n🔔 Processing alerts...")
        alerting_service = AlertingService()
        alerting_service.process_scan_result(result)
        print("✅ Alerts processed")
    
    scanner.close()
    
    # Exit with error code if scan failed
    if result.status in ["FAILED", "CRITICAL"]:
        sys.exit(1)


def start_api(args):
    """Start API server"""
    from src.api.server import start_api_server
    
    print("🚀 Starting API server...")
    print(f"API: http://{args.host}:{args.port}")
    print(f"Docs: http://{args.host}:{args.port}/api/docs")
    
    start_api_server(host=args.host, port=args.port)


def view_history(args):
    """View scan history"""
    from src.config import config
    
    if config.storage_backend == "postgresql":
        from src.storage.postgres_repository import PostgreSQLRepository
        storage_repo = PostgreSQLRepository()
    elif config.storage_backend == "cosmosdb":
        from src.storage.cosmos_repository import CosmosDBRepository
        storage_repo = CosmosDBRepository()
    else:
        print("❌ No storage backend configured")
        return
    
    history = storage_repo.get_scan_history(args.table, days=args.days)
    
    print(f"📈 Scan History for {args.table}")
    print(f"Last {args.days} days: {len(history)} scans")
    print("\n")
    
    for scan in history[:10]:  # Show last 10
        print(f"  {scan['timestamp']} - {scan['status']} - {scan['pass_rate']:.1%}")
    
    if hasattr(storage_repo, 'close'):
        storage_repo.close()


def view_trends(args):
    """View trends"""
    from src.config import config
    
    if config.storage_backend == "postgresql":
        from src.storage.postgres_repository import PostgreSQLRepository
        storage_repo = PostgreSQLRepository()
    elif config.storage_backend == "cosmosdb":
        from src.storage.cosmos_repository import CosmosDBRepository
        storage_repo = CosmosDBRepository()
    else:
        print("❌ No storage backend configured")
        return
    
    trends = storage_repo.get_trend_analysis(args.table, days=args.days)
    
    print(f"📊 Trend Analysis for {args.table}")
    print(f"Period: {trends.get('period_days', 0)} days")
    print(f"Scans: {trends.get('scan_count', 0)}")
    print(f"Average Pass Rate: {trends.get('average_pass_rate', 0):.1%}")
    print(f"Latest Pass Rate: {trends.get('latest_pass_rate', 0):.1%}")
    print(f"Trend: {trends.get('trend', 'N/A')}")
    
    if hasattr(storage_repo, 'close'):
        storage_repo.close()


if __name__ == "__main__":
    main()
