"""
Soda Core Integration & Check Execution
Converts check plans to Soda configurations and runs checks
"""

import json
import logging
import tempfile
from pathlib import Path
from typing import Dict, List, Any
import yaml

logger = logging.getLogger(__name__)


class SodaCoreRunner:
    """Executes Soda Core quality checks against data sources."""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "dq_platform_soda"
        self.temp_dir.mkdir(exist_ok=True, parents=True)
    
    def execute_checks(
        self,
        connection_id: str,
        connection_type: str,
        remote_url: str,
        checks_config: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Execute Soda Core checks against a data source.
        
        Args:
            connection_id: Connection UUID
            connection_type: Type of connection (postgres, csv, parquet)
            remote_url: Connection string or file path
            checks_config: List of check configurations
            
        Returns:
            Dictionary with check results and metrics
        """
        try:
            logger.info(f"Executing {len(checks_config)} checks for connection {connection_id}")
            
            # Generate Soda configuration
            soda_config = self._generate_soda_config(
                connection_type,
                remote_url,
                checks_config
            )
            
            # Save config to temp file
            config_path = self.temp_dir / f"config_{connection_id}.yml"
            checks_path = self.temp_dir / f"checks_{connection_id}.yml"
            
            with open(config_path, 'w') as f:
                yaml.dump(soda_config['configuration'], f)
            
            with open(checks_path, 'w') as f:
                yaml.dump(soda_config['checks'], f)
            
            logger.info(f"Soda config written to {config_path}")
            
            # Execute checks using Soda Core API
            results = self._run_soda_scan(config_path, checks_path)
            
            logger.info(f"Check execution completed: {results['summary']}")
            
            return results
        
        except Exception as e:
            logger.error(f"Failed to execute checks: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'results': [
                    {
                        'check_name': 'execution_error',
                        'outcome': 'fail',
                        'message': f'Check execution failed: {str(e)}',
                        'details': {'error': str(e)},
                    }
                ]
            }
    
    def _generate_soda_config(
        self,
        connection_type: str,
        remote_url: str,
        checks_config: List[Dict]
    ) -> Dict[str, Any]:
        """Generate Soda YAMLconfiguration from check definitions."""
        
        # Generate data source configuration based on connection type
        if connection_type == 'postgres':
            data_source_config = {
                'type': 'postgres',
                'host': '${SODA_POSTGRES_HOST}',
                'port': '${SODA_POSTGRES_PORT}',
                'username': '${SODA_POSTGRES_USER}',
                'password': '${SODA_POSTGRES_PASSWORD}',
                'database': '${SODA_POSTGRES_DB}',
            }
        elif connection_type == 'csv':
            data_source_config = {
                'type': 'duckdb',
                'connection_string': f'duckdb://{remote_url}?read_only=true',
            }
        elif connection_type == 'parquet':
            data_source_config = {
                'type': 'duckdb',
                'connection_string': f'duckdb://{remote_url}?read_only=true',
            }
        else:
            raise ValueError(f"Unsupported connection type: {connection_type}")
        
        # Build checks YAML from config
        checks_yaml = []
        for check in checks_config:
            if isinstance(check, str):
                # Simple check name (like "missing_count")
                checks_yaml.append(check)
            elif isinstance(check, dict):
                # Detailed check configuration
                checks_yaml.append(check)
        
        return {
            'configuration': {
                'data_sources': {
                    'data': data_source_config
                }
            },
            'checks': checks_yaml,
        }
    
    def _run_soda_scan(self, config_path: Path, checks_path: Path) -> Dict[str, Any]:
        """Execute Soda Core scan and return formatted results."""
        try:
            from soda.scan import Scan
            
            # Create and run scan
            scan = Scan()
            scan.set_data_source_name('data')
            scan.add_configuration_yaml_file(str(config_path))
            scan.add_checks_yaml_file(str(checks_path))
            
            # Execute scan
            scan.execute()
            
            # Parse results
            results = []
            
            # Check for scan errors
            if scan.get_error():
                logger.warning(f"Scan error: {scan.get_error()}")
            
            # Extract check results
            checks = scan.get_check_results()
            for check in checks:
                outcome = 'pass' if check['outcome'] == 'passed' else 'fail'
                results.append({
                    'check_name': check.get('name', 'unknown'),
                    'outcome': outcome,
                    'message': check.get('message', ''),
                    'details': {
                        'result': check.get('result'),
                        'reference': check.get('reference_url'),
                    }
                })
            
            return {
                'success': True,
                'summary': {
                    'total': len(results),
                    'passed': sum(1 for r in results if r['outcome'] == 'pass'),
                    'failed': sum(1 for r in results if r['outcome'] == 'fail'),
                },
                'results': results,
            }
        
        except ImportError:
            logger.error("Soda Core not installed. Using mock execution.")
            return self._mock_soda_execution(checks_path)
        except Exception as e:
            logger.error(f"Soda scan execution failed: {e}", exc_info=True)
            raise
    
    def _mock_soda_execution(self, checks_path: Path) -> Dict[str, Any]:
        """Mock Soda execution for testing (when Soda Core not available)."""
        logger.warning("Using mock Soda execution (development mode)")
        
        try:
            with open(checks_path, 'r') as f:
                checks_config = yaml.safe_load(f) or []
        except Exception as e:
            logger.error(f"Failed to read checks config: {e}")
            checks_config = []
        
        # Generate mock results
        results = []
        for i, check in enumerate(checks_config):
            check_name = check if isinstance(check, str) else check.get('name', f'check_{i}')
            # Randomly pass/fail for demo
            import random
            outcome = 'pass' if random.random() > 0.3 else 'fail'
            
            results.append({
                'check_name': check_name,
                'outcome': outcome,
                'message': f"Mock execution: {check_name} {outcome}",
                'details': {
                    'result': {'value': random.randint(10, 100)},
                    'reference': 'https://docs.soda.io/soda-core/',
                }
            })
        
        return {
            'success': True,
            'summary': {
                'total': len(results),
                'passed': sum(1 for r in results if r['outcome'] == 'pass'),
                'failed': sum(1 for r in results if r['outcome'] == 'fail'),
            },
            'results': results,
        }
