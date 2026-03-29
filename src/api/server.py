"""
FastAPI REST API for enterprise integration
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import logging
from datetime import datetime
import uvicorn
import os
from pathlib import Path

from ..core.scanner import EnhancedDataQualityScanner, ScanResult
from ..storage.postgres_repository import PostgreSQLRepository
from ..storage.cosmos_repository import CosmosDBRepository
from ..reporting.html_generator import HTMLReportGenerator
from ..notifications.alerting import AlertingService
from ..config import config

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Data Quality Platform API",
    description="Enterprise-grade data quality monitoring and alerting",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Initialize services - use PostgreSQL by default, fallback to Cosmos DB
if config.storage_backend == "postgresql":
    storage_repo = PostgreSQLRepository()
elif config.storage_backend == "cosmosdb":
    storage_repo = CosmosDBRepository()
else:
    storage_repo = None

html_generator = HTMLReportGenerator()
alerting_service = AlertingService()


class ScanRequest(BaseModel):
    """Scan request model"""
    csv_path: str
    table_name: str
    checks_path: Optional[str] = None
    config_path: Optional[str] = None
    send_alerts: bool = True


class ScanResponse(BaseModel):
    """Scan response model"""
    scan_id: str
    status: str
    pass_rate: float
    message: str
    report_url: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the dashboard UI"""
    ui_path = Path(__file__).parent.parent / "ui" / "dashboard.html"
    if ui_path.exists():
        return FileResponse(ui_path)
    else:
        # Fallback to simple page
        return HTMLResponse(
            """
            <html>
                <head>
                    <title>Data Quality Platform</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                        }
                        .container {
                            background: white;
                            padding: 60px;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            text-align: center;
                            max-width: 600px;
                        }
                        h1 { color: #667eea; margin-bottom: 20px; }
                        p { color: #666; font-size: 1.1em; line-height: 1.6; }
                        a {
                            display: inline-block;
                            margin: 10px;
                            padding: 15px 30px;
                            background: #667eea;
                            color: white;
                            text-decoration: none;
                            border-radius: 10px;
                            transition: all 0.3s;
                        }
                        a:hover { background: #764ba2; transform: translateY(-2px); }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🎯 Enterprise Data Quality Platform</h1>
                        <p>Enterprise-grade data quality monitoring</p>
                        <p>
                            <a href="/api/docs">📚 API Documentation</a>
                            <a href="/api/health">❤️ Health Check</a>
                        </p>
                    </div>
                </body>
            </html>
            """
        )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "storage_backend": config.storage_backend,
            "storage_available": storage_repo is not None and (
                hasattr(storage_repo, 'connection') and storage_repo.connection is not None or
                hasattr(storage_repo, 'client') and storage_repo.client is not None
            ),
            "alerting": config.alerting_config.enabled
        }
    }


@app.post("/api/scan", response_model=ScanResponse)
async def run_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """
    Execute data quality scan
    
    This endpoint:
    1. Loads data from CSV
    2. Runs comprehensive quality checks
    3. Generates HTML report
    4. Stores results in Cosmos DB
    5. Sends alerts if configured
    """
    try:
        logger.info(f"Received scan request for {request.table_name}")
        
        # Initialize scanner
        scanner = EnhancedDataQualityScanner()
        
        # Run scan
        scan_result = scanner.execute_comprehensive_scan(
            csv_path=request.csv_path,
            table_name=request.table_name,
            checks_path=request.checks_path or config.soda_checks_path,
            config_path=request.config_path or config.soda_config_path
        )
        
        # Generate report
        report_path = f"/tmp/reports/report_{scan_result.scan_id}.html"
        html_generator.generate_report(scan_result, report_path)
        
        # Store in database (async)
        if storage_repo:
            background_tasks.add_task(storage_repo.save_scan_result, scan_result)
        
        # Send alerts if enabled
        if request.send_alerts:
            background_tasks.add_task(alerting_service.process_scan_result, scan_result)
        
        return ScanResponse(
            scan_id=scan_result.scan_id,
            status=scan_result.status,
            pass_rate=scan_result.pass_rate,
            message=f"Scan completed with {scan_result.status} status",
            report_url=f"/api/reports/{scan_result.scan_id}"
        )
        
    except Exception as e:
        logger.error(f"Scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{table_name}")
async def get_history(table_name: str, days: int = 30):
    if not storage_repo:
        raise HTTPException(status_code=503, detail="Storage backend not available")
    
    try:
        history = storage_repo.get_scan_history(table_name, days=days)
        return {
            "table_name": table_name,
            "period_days": days,
            "scan_count": len(history),
            "scans": history
        }
    except Exception as e:
        logger.error(f"Error retrieving history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trends/{table_name}")
async def get_trends(table_name: str, days: int = 7):
    """Get trend analysis for a table"""
    if not storage_repo:
        raise HTTPException(status_code=503, detail="Storage backend not available")
    
    try:
        trends = storage_repo.get_trend_analysis(table_name, days=days)
        return trends
    except Exception as e:
        logger.error(f"Error retrieving trends: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/summary")
async def get_summary():
    """Get summary of all monitored tables and recent scans"""
    if not storage_repo:
        return {
            "total_tables": 0,
            "total_scans": 0,
            "average_pass_rate": 0,
            "failed_scans": 0,
            "tables": [],
            "recent_scans": [],
            "storage_backend": config.storage_backend,
            "storage_available": False
        }
    
    try:
        tables = storage_repo.get_all_tables_summary()
        
        # Calculate overall statistics
        total_scans = sum(t.get('scan_count', 0) for t in tables)
        total_pass_rate = sum(t.get('avg_pass_rate', 0) * t.get('scan_count', 0) for t in tables)
        avg_pass_rate = (total_pass_rate / total_scans) if total_scans > 0 else 0
        
        # Get recent scans across all tables (last 20)
        recent_scans = []
        for table in tables:
            try:
                history = storage_repo.get_scan_history(table['table_name'], days=7)
                recent_scans.extend(history[:5])  # Get last 5 from each table
            except:
                pass
        
        # Sort by timestamp and get latest 20
        recent_scans.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        recent_scans = recent_scans[:20]
        
        # Count failed scans
        failed_scans = sum(1 for scan in recent_scans if scan.get('status') == 'FAILED')
        
        return {
            "total_tables": len(tables),
            "total_scans": total_scans,
            "average_pass_rate": avg_pass_rate / 100,  # Convert to decimal
            "failed_scans": failed_scans,
            "tables": tables,
            "recent_scans": recent_scans,
            "storage_backend": config.storage_backend,
            "storage_available": True
        }
    except Exception as e:
        logger.error(f"Error retrieving summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def start_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the API server"""
    logger.info(f"Starting API server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_api_server()
