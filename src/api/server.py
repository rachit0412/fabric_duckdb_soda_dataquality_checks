"""
FastAPI REST API for enterprise integration
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import uvicorn
import os
from pathlib import Path
import shutil
import tempfile
import pandas as pd
import numpy as np

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
    description="Enterprise-grade data quality monitoring and validation platform",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services - use PostgreSQL by default, fallback to Cosmos DB
if config.storage_backend == "postgresql":
    storage_repo = PostgreSQLRepository()
elif config.storage_backend == "cosmosdb":
    storage_repo = CosmosDBRepository()
else:
    storage_repo = None

alerting_service = AlertingService()


class ScanRequest(BaseModel):
    """Scan request model"""
    csv_path: str
    table_name: str
    checks_path: Optional[str] = None
    config_path: Optional[str] = None
    send_alerts: bool = True


class SodaCheck(BaseModel):
    """Individual Soda check specification"""
    name: str
    check_type: str  # 'generic', 'missing', 'duplicate', 'validity', 'freshness', 'custom'
    column: Optional[str] = None
    condition: Optional[str] = None
    valid_format: Optional[str] = None
    valid_values: Optional[List[Any]] = None
    valid_regex: Optional[str] = None
    fail_condition: Optional[str] = None
    warn_condition: Optional[str] = None
    custom_query: Optional[str] = None
    custom_fail_query: Optional[str] = None


class DynamicScanRequest(BaseModel):
    """Dynamic scan request with inline checks"""
    table_name: str
    checks: List[Dict[str, Any]]  # Dynamic Soda checks
    send_alerts: bool = True
    data_source_config: Optional[Dict[str, Any]] = None  # Optional data source config


class UploadScanRequest(BaseModel):
    """Request for scanning uploaded file"""
    table_name: str
    checks: List[SodaCheck]
    send_alerts: bool = True


class ScanResponse(BaseModel):
    """Scan response model"""
    scan_id: str
    status: str
    pass_rate: float
    message: str
    report_url: Optional[str] = None
    total_checks: Optional[int] = None
    passed_checks: Optional[int] = None
    failed_checks: Optional[int] = None
    warned_checks: Optional[int] = None
    check_details: Optional[List[Dict[str, Any]]] = None


@app.post("/api/upload-scan")
async def upload_and_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    table_name: str = Form(...),
    checks_json: str = Form(...),
    send_alerts: bool = Form(True)
):
    """
    Upload a CSV file and run dynamic data quality scans
    
    This endpoint:
    1. Accepts file upload
    2. Parses dynamic checks from JSON
    3. Runs comprehensive quality checks using Soda
    4. Generates HTML report
    5. Stores results in database
    6. Sends alerts if configured
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Parse checks
        import json
        try:
            checks_data = json.loads(checks_json)
            checks = [SodaCheck(**check) for check in checks_data]
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid checks JSON format")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_csv_path = temp_file.name
        
        try:
            # Initialize scanner
            scanner = EnhancedDataQualityScanner()
            
            # Generate dynamic Soda checks YAML
            checks_yaml = generate_dynamic_checks_yaml(table_name, checks)
            config_yaml = generate_dynamic_config_yaml(table_name)
            
            # Save temporary check files
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as checks_file:
                checks_file.write(checks_yaml)
                temp_checks_path = checks_file.name
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as config_file:
                config_file.write(config_yaml)
                temp_config_path = config_file.name
            
            try:
                # Run scan
                scan_result = scanner.execute_comprehensive_scan(
                    csv_path=temp_csv_path,
                    table_name=table_name,
                    checks_path=temp_checks_path,
                    config_path=temp_config_path
                )
                
                # Generate report
                html_generator = HTMLReportGenerator()
                report_path = f"/tmp/reports/report_{scan_result.scan_id}.html"
                html_generator.generate_report(scan_result, report_path)
                
                # Store in database (async)
                if storage_repo:
                    background_tasks.add_task(storage_repo.save_scan_result, scan_result)
                
                # Send alerts if enabled
                if send_alerts:
                    background_tasks.add_task(alerting_service.process_scan_result, scan_result)
                
                return ScanResponse(
                    scan_id=scan_result.scan_id,
                    status=scan_result.status,
                    pass_rate=scan_result.pass_rate,
                    message=f"Scan completed with {scan_result.status} status",
                    report_url=f"/api/reports/{scan_result.scan_id}"
                )
                
            finally:
                # Clean up temporary files
                os.unlink(temp_checks_path)
                os.unlink(temp_config_path)
                
        finally:
            # Clean up uploaded file
            os.unlink(temp_csv_path)
            
    except Exception as e:
        logger.error(f"Upload scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/dynamic-scan", response_model=ScanResponse)
async def run_dynamic_scan(
    request: DynamicScanRequest,
    background_tasks: BackgroundTasks
):
    """
    Run dynamic data quality scan with inline Soda checks
    
    This endpoint allows specifying checks directly in the request
    without needing YAML files, leveraging Soda's full capabilities.
    """
    try:
        logger.info(f"Received dynamic scan request for {request.table_name}")
        
        # For now, we'll use a sample CSV path - in production this would be configurable
        csv_path = f"/app/data/{request.table_name}.csv"
        
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Data file not found: {csv_path}. Please upload the file first or specify the correct path."
            )
        
        # Generate dynamic Soda configuration
        # Convert dicts to SodaCheck objects
        try:
            soda_checks = [SodaCheck(**check) for check in request.checks]
        except Exception as e:
            logger.error(f"Failed to convert checks: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid check format: {e}")
        
        checks_yaml = generate_dynamic_checks_yaml(request.table_name, soda_checks)
        config_yaml = generate_dynamic_config_yaml(request.table_name, request.data_source_config)
        
        # Save temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as checks_file:
            checks_file.write(checks_yaml)
            temp_checks_path = checks_file.name
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as config_file:
            config_file.write(config_yaml)
            temp_config_path = config_file.name
        
        try:
            # Initialize scanner
            scanner = EnhancedDataQualityScanner()
            
            # Run scan
            scan_result = scanner.execute_comprehensive_scan(
                csv_path=csv_path,
                table_name=request.table_name,
                checks_path=temp_checks_path,
                config_path=temp_config_path
            )
            
            # Generate report
            html_generator = HTMLReportGenerator()
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
            
        finally:
            # Clean up temporary files
            os.unlink(temp_checks_path)
            os.unlink(temp_config_path)
            
    except Exception as e:
        logger.error(f"Dynamic scan failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_dynamic_checks_yaml(table_name: str, checks: List[SodaCheck]) -> str:
    """Generate Soda checks YAML from dynamic check specifications"""
    yaml_lines = [f"checks for {table_name}:"]
    
    for check in checks:
        if check.check_type == "generic" and check.condition:
            yaml_lines.append(f"  - {check.condition}")
        elif check.check_type == "missing" and check.column:
            if check.fail_condition:
                yaml_lines.append(f"  - missing_count({check.column}) {check.fail_condition}")
            else:
                yaml_lines.append(f"  - missing_count({check.column}) = 0")
        elif check.check_type == "duplicate" and check.column:
            if check.fail_condition:
                yaml_lines.append(f"  - duplicate_count({check.column}) {check.fail_condition}")
            else:
                yaml_lines.append(f"  - duplicate_count({check.column}) = 0")
        elif check.check_type == "validity" and check.column:
            yaml_lines.append(f"  - invalid_count({check.column}) = 0:")
            if check.valid_format:
                yaml_lines.append(f"      valid format: {check.valid_format}")
            if check.valid_values:
                yaml_lines.append(f"      valid values: {check.valid_values}")
            if check.valid_regex:
                yaml_lines.append(f"      valid regex: '{check.valid_regex}'")
        elif check.check_type == "freshness" and check.column:
            if check.fail_condition:
                yaml_lines.append(f"  - freshness({check.column}) {check.fail_condition}")
            else:
                yaml_lines.append(f"  - freshness({check.column}) < 1d")
        elif check.check_type == "custom" and check.custom_query:
            yaml_lines.append(f"  - failed rows:")
            yaml_lines.append(f"      name: {check.name}")
            yaml_lines.append(f"      fail query: |")
            yaml_lines.append(f"        {check.custom_query}")
    
    return "\n".join(yaml_lines)


def generate_dynamic_config_yaml(table_name: str, data_source_config: Optional[Dict[str, Any]] = None) -> str:
    """Generate Soda data source configuration YAML"""
    if data_source_config:
        # Use provided config
        config_lines = [f"data_source {data_source_config.get('name', 'dynamic')}:"]
        config_lines.append("  type: duckdb")
        config_lines.append("  connection:")
        config_lines.append("    database: my_database.duckdb")
        
        # Add any additional config
        for key, value in data_source_config.items():
            if key not in ['name', 'type']:
                config_lines.append(f"    {key}: {value}")
    else:
        # Default config
        config_lines = [f"data_source {table_name}_ds:"]
        config_lines.append("  type: duckdb")
        config_lines.append("  connection:")
        config_lines.append("    database: my_database.duckdb")
    
    return "\n".join(config_lines)


@app.get("/", response_class=HTMLResponse)
async def root():
    """API root endpoint"""
    return HTMLResponse("""
    <html>
        <head>
            <title>Data Quality Platform API</title>
        </head>
        <body>
            <h1>Data Quality Platform API</h1>
            <p>API is running. Access the dashboard at: <a href="http://localhost:8000">http://localhost:8000</a></p>
            <p>API Documentation: <a href="/docs">/docs</a></p>
        </body>
    </html>
    """)


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


@app.post("/api/simple-upload")
async def simple_upload_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    rules: str = Form(default="all")  # Rules as comma-separated string or 'all'
):
    """
    Simple file upload and scan with optional rule filtering
    
    This endpoint:
    1. Accepts CSV file upload
    2. Optionally filters which data quality checks to run based on rules
    3. Returns scan results with full check details
    
    Rules parameter can be:
    - 'all' (default): Run all 13 checks
    - 'rowCount,missingValues,duplicates' etc: Run specific categories
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Save uploaded file to writable temp directory
        os.makedirs("/tmp/uploads", exist_ok=True)
        file_path = f"/tmp/uploads/{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Extract table name from filename
        table_name = file.filename.replace('.csv', '').lower()
        
        try:
            # Initialize scanner
            scanner = EnhancedDataQualityScanner()
            
            # Parse rules filter
            rules_list = None
            if rules and rules != "all":
                rules_list = [r.strip() for r in rules.split(",")]
            
            # Run scan with optional rule filtering
            scan_result = scanner.execute_comprehensive_scan(
                csv_path=file_path,
                table_name=table_name,
                checks_path=config.soda_checks_path,
                config_path=config.soda_config_path,
                selected_rules=rules_list  # Pass rules to scanner
            )
            
            # Generate report
            html_generator = HTMLReportGenerator()
            os.makedirs("/tmp/reports", exist_ok=True)
            report_path = f"/tmp/reports/report_{scan_result.scan_id}.html"
            html_generator.generate_report(scan_result, report_path)
            
            # Store in database (async)
            if storage_repo:
                background_tasks.add_task(storage_repo.save_scan_result, scan_result)
            
            # Send alerts if configured
            background_tasks.add_task(alerting_service.process_scan_result, scan_result)
            
            return ScanResponse(
                scan_id=scan_result.scan_id,
                status=scan_result.status,
                pass_rate=scan_result.pass_rate,
                message=f"Scan completed with {scan_result.status} status",
                report_url=f"/api/reports/{scan_result.scan_id}",
                total_checks=scan_result.total_checks,
                passed_checks=scan_result.passed_checks,
                failed_checks=scan_result.failed_checks,
                warned_checks=getattr(scan_result, 'warned_checks', 0),
                check_details=scan_result.check_details
            )
            
        except Exception as e:
            logger.error(f"Scan failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/profile")
async def profile_data(file: UploadFile = File(...)):
    """
    Profile uploaded CSV before scanning
    
    Returns:
    - Row count, column count
    - Column names and types
    - Sample rows (first 5)
    - Basic statistics per column
    - Data quality indicators
    """
    try:
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        os.makedirs("/tmp/uploads", exist_ok=True)
        file_path = f"/tmp/uploads/{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        table_name = file.filename.replace('.csv', '').lower()
        
        try:
            scanner = EnhancedDataQualityScanner()
            df = scanner.load_data(file_path, table_name)
            
            # Convert sample data to ensure JSON serialization
            sample_data = df.head(5).to_dict(orient='records')
            # Convert numpy types to native Python types
            for row in sample_data:
                for key, value in row.items():
                    if isinstance(value, (np.integer, np.floating)):
                        row[key] = float(value) if isinstance(value, np.floating) else int(value)
                    elif isinstance(value, np.bool_):
                        row[key] = bool(value)
                    elif pd.isna(value):
                        row[key] = None
            
            # Convert numpy counts to Python int
            missing_counts = {col: int(df[col].isnull().sum()) for col in df.columns}
            missing_percent = {col: float((df[col].isnull().sum() / len(df) * 100)) for col in df.columns}
            
            # Profile the data
            profile = {
                "filename": file.filename,
                "row_count": int(len(df)),
                "column_count": len(df.columns),
                "columns": list(df.columns),
                "dtypes": {col: str(df[col].dtype) for col in df.columns},
                "sample_data": sample_data,
                "missing_counts": missing_counts,
                "missing_percent": missing_percent,
                "data_quality_indicators": {
                    "has_missing_values": bool(df.isnull().any().any()),
                    "has_duplicates": bool(df.duplicated().any()),
                    "empty_strings": int((df == '').sum().sum()) if df.select_dtypes(include=['object']).size > 0 else 0
                }
            }
            
            logger.info(f"Profiled {table_name}: {profile['row_count']} rows, {profile['column_count']} columns")
            return profile
            
        except Exception as e:
            logger.error(f"Profiling failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Profiling failed: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile upload failed: {str(e)}")


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
        html_generator = HTMLReportGenerator()
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
