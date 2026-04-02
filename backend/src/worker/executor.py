"""
Worker Process
Polls job queue and executes Soda Core checks asynchronously
"""

import logging
import time
from datetime import datetime
from threading import Thread
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from src.core.config import settings
from src.models.db import Run, CheckResult, Connection, CheckPlan, MetadataSnapshot
from src.services.soda_runner import SodaCoreRunner

logger = logging.getLogger(__name__)


class CheckExecutor:
    """Executes check plans using Soda Core."""
    
    def __init__(self):
        self.soda_runner = SodaCoreRunner()
        self.engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def execute_run(self, run_id: str, db: Session = None):
        """
        Execute a single run: fetch checks, run Soda, store results.
        
        Args:
            run_id: UUID of the run to execute
            db: Database session (creates new if not provided)
        """
        if db is None:
            db = self.SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            # Get run
            run = db.query(Run).filter(Run.id == run_id).first()
            if not run:
                logger.error(f"Run not found: {run_id}")
                return
            
            logger.info(f"Starting execution of run: {run_id}")
            
            # Update run status
            run.status = 'running'
            run.started_at = datetime.utcnow()
            db.commit()
            
            # Get check plan
            plan = db.query(CheckPlan).filter(CheckPlan.id == run.check_plan_id).first()
            if not plan:
                raise Exception(f"Check plan not found: {run.check_plan_id}")
            
            # Get metadata snapshot
            snapshot = db.query(MetadataSnapshot).filter(
                MetadataSnapshot.id == plan.metadata_snapshot_id
            ).first()
            if not snapshot:
                raise Exception(f"Metadata snapshot not found: {plan.metadata_snapshot_id}")
            
            # Get connection
            conn = db.query(Connection).filter(Connection.id == snapshot.connection_id).first()
            if not conn:
                raise Exception(f"Connection not found: {snapshot.connection_id}")
            
            # Parse checks configuration
            checks_config = json.loads(plan.checks_definition) if plan.checks_definition else []
            
            logger.info(f"Executing {len(checks_config)} checks on connection: {conn.name}")
            
            # Execute checks using Soda Core
            soda_results = self.soda_runner.execute_checks(
                connection_id=str(conn.id),
                connection_type=conn.type,
                remote_url=conn.remote_url,
                checks_config=checks_config
            )
            
            # Store results in database
            self._store_results(db, run, soda_results)
            
            # Update run status
            run.status = 'completed'
            run.completed_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Run completed successfully: {run_id}")
            logger.info(f"Summary: {soda_results['summary']}")
            
        except Exception as e:
            logger.error(f"Run execution failed: {e}", exc_info=True)
            
            # Update run with error status
            try:
                run = db.query(Run).filter(Run.id == run_id).first()
                if run:
                    run.status = 'failed'
                    run.completed_at = datetime.utcnow()
                    db.commit()
                    
                    # Create error result
                    error_result = CheckResult(
                        run_id=run.id,
                        check_name='execution_error',
                        outcome='fail',
                        message=f'Execution failed: {str(e)}',
                        details=json.dumps({'error': str(e)}),
                    )
                    db.add(error_result)
                    db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update run status: {inner_e}")
        
        finally:
            if should_close:
                db.close()
    
    def _store_results(self, db: Session, run: Run, soda_results: dict):
        """Store Soda Core results in the database."""
        try:
            if not soda_results.get('success', True):
                logger.warning(f"Soda execution had errors: {soda_results.get('error')}")
            
            # Store each check result
            for result in soda_results.get('results', []):
                check_result = CheckResult(
                    run_id=run.id,
                    check_name=result.get('check_name'),
                    outcome=result.get('outcome', 'unknown'),
                    message=result.get('message', ''),
                    details=json.dumps(result.get('details', {})),
                    failed_rows=json.dumps(result.get('failed_rows', [])),
                    metrics=json.dumps(result.get('metrics', {})),
                )
                db.add(check_result)
            
            db.commit()
            logger.info(f"Stored {len(soda_results.get('results', []))} check results for run: {run.id}")
        
        except Exception as e:
            logger.error(f"Failed to store results: {e}", exc_info=True)
            db.rollback()
            raise


class WorkerProcess:
    """Background worker that polls and executes check runs."""
    
    def __init__(self):
        self.executor = CheckExecutor()
        self.running = False
        self.poll_interval = 5  # seconds
    
    def start(self):
        """Start the worker process in a background thread."""
        if self.running:
            logger.warning("Worker already running")
            return
        
        self.running = True
        thread = Thread(target=self._run_loop, daemon=True)
        thread.start()
        logger.info("Worker process started")
    
    def stop(self):
        """Stop the worker process."""
        self.running = False
        logger.info("Worker process stopped")
    
    def _run_loop(self):
        """Main worker loop: poll for pending runs and execute."""
        logger.info(f"Worker loop started (poll interval: {self.poll_interval}s)")
        
        while self.running:
            try:
                self._poll_and_execute()
            except Exception as e:
                logger.error(f"Error in worker loop: {e}", exc_info=True)
            
            time.sleep(self.poll_interval)
    
    def _poll_and_execute(self):
        """Poll for pending runs and execute them."""
        db = self.executor.SessionLocal()
        try:
            # Get pending runs (FIFO order)
            pending_runs = db.query(Run).filter(
                Run.status == 'pending'
            ).order_by(Run.created_at.asc()).limit(1).all()
            
            for run in pending_runs:
                logger.info(f"Executing pending run: {run.id}")
                self.executor.execute_run(str(run.id), db)
            
            # Reuse session for next iteration
            if pending_runs:
                db.close()
                db = self.executor.SessionLocal()
        
        finally:
            db.close()


# Global worker instance
_worker = None


def get_worker() -> WorkerProcess:
    """Get or create the global worker instance."""
    global _worker
    if _worker is None:
        _worker = WorkerProcess()
    return _worker


def start_worker():
    """Start the global worker process."""
    worker = get_worker()
    worker.start()


def stop_worker():
    """Stop the global worker process."""
    worker = get_worker()
    worker.stop()
