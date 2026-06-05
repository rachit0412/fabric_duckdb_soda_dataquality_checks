"""
Soda Core Integration & Check Execution
Converts check plans to Soda configurations and runs checks
"""

import json
import logging
import tempfile
from pathlib import Path
from typing import Dict, List, Any
import duckdb
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
        dataset_identifier: str,
        checks_config: Any
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
            check_count = len(checks_config) if isinstance(checks_config, list) else 1
            logger.info(f"Executing {check_count} checks for connection {connection_id}")
            
            # Generate Soda configuration
            soda_config = self._generate_soda_config(
                connection_type,
                remote_url,
                dataset_identifier,
                checks_config
            )
            
            # Save config to temp file
            config_path = self.temp_dir / f"config_{connection_id}.yml"
            checks_path = self.temp_dir / f"checks_{connection_id}.yml"
            
            with open(config_path, 'w') as f:
                f.write(soda_config['configuration_yaml'])
            
            with open(checks_path, 'w') as f:
                f.write(soda_config['checks_yaml'])
            
            logger.info(f"Soda config written to {config_path}")
            
            # Execute checks using Soda Core API
            results = self._run_soda_scan(
                connection_type=connection_type,
                remote_url=remote_url,
                dataset_identifier=dataset_identifier,
                config_path=config_path,
                checks_path=checks_path,
            )

            if results.get('summary', {}).get('total', 0) == 0 and check_count > 0:
                return {
                    'success': False,
                    'error': f'Soda evaluated 0 of {check_count} declared checks',
                    'execution_mode': results.get('execution_mode', 'soda'),
                    'summary': results.get('summary', {'total': 0, 'passed': 0, 'failed': 0}),
                    'results': [
                        {
                            'check_name': 'execution_error',
                            'outcome': 'fail',
                            'message': f'Soda evaluated 0 of {check_count} declared checks',
                            'details': {
                                'dataset_identifier': dataset_identifier,
                                'connection_type': connection_type,
                            },
                        }
                    ],
                }
            
            logger.info(f"Check execution completed: {results['summary']}")
            
            return results
        
        except Exception as e:
            logger.error(f"Failed to execute checks: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'execution_mode': 'error',
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
        dataset_identifier: str,
        checks_config: Any
    ) -> Dict[str, Any]:
        """Generate Soda YAMLconfiguration from check definitions."""

        config_lines = ["data_source data:"]

        if connection_type == 'postgres':
            config_lines.extend([
                '  type: postgres',
                '  host: ${SODA_POSTGRES_HOST}',
                '  port: ${SODA_POSTGRES_PORT}',
                '  username: ${SODA_POSTGRES_USER}',
                '  password: ${SODA_POSTGRES_PASSWORD}',
                '  database: ${SODA_POSTGRES_DB}',
            ])
        elif connection_type == 'csv':
            config_lines.extend([
                '  type: duckdb',
                '  connection_string: duckdb://',
                '  settings_csv:',
                f'    {dataset_identifier}: {json.dumps(remote_url)}',
            ])
        elif connection_type == 'parquet':
            config_lines.extend([
                '  type: duckdb',
                '  connection_string: duckdb://',
                '  settings_parquet:',
                f'    {dataset_identifier}: {json.dumps(remote_url)}',
            ])
        else:
            raise ValueError(f"Unsupported connection type: {connection_type}")
        
        # Preserve raw SodaCL YAML when it is already assembled by the plan builder.
        if isinstance(checks_config, str):
            checks_yaml = checks_config.strip()
        else:
            checks_yaml = yaml.safe_dump(checks_config or {}, sort_keys=False)
        
        return {
            'configuration_yaml': "\n".join(config_lines),
            'checks_yaml': checks_yaml,
        }
    
    def _run_soda_scan(
        self,
        connection_type: str,
        remote_url: str,
        dataset_identifier: str,
        config_path: Path,
        checks_path: Path,
    ) -> Dict[str, Any]:
        """Execute Soda Core scan and return formatted results."""
        try:
            from soda.scan import Scan
            
            # Create and run scan
            scan = Scan()

            if connection_type in {'csv', 'parquet'}:
                duckdb_conn = duckdb.connect(':memory:')
                table_name = self._quote_identifier(dataset_identifier or 'data')
                escaped_path = remote_url.replace("'", "''")

                if connection_type == 'csv':
                    duckdb_conn.execute(
                        f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_csv_auto('{escaped_path}', HEADER = TRUE, SAMPLE_SIZE = -1)"
                    )
                else:
                    duckdb_conn.execute(
                        f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{escaped_path}')"
                    )

                scan.add_duckdb_connection(duckdb_conn)
                scan.set_data_source_name('duckdb')
            else:
                scan.set_data_source_name('data')
                scan.add_configuration_yaml_file(str(config_path))

            scan.add_sodacl_yaml_files(str(checks_path))
            
            # Execute scan
            scan.execute()
            
            # Parse results
            results = []
            scan_results = scan.get_scan_results() or {}
            checks = scan_results.get('checks', [])

            for check in checks:
                raw_outcome = str(check.get('outcome', '')).lower()
                outcome = 'pass' if raw_outcome in {'pass', 'passed'} else 'fail'
                results.append({
                    'check_name': check.get('name', 'unknown'),
                    'outcome': outcome,
                    'message': check.get('diagnostics', {}).get('value') or check.get('message', ''),
                    'details': {
                        'result': check.get('metrics'),
                        'diagnostics': check.get('diagnostics', {}),
                        'table': check.get('table'),
                        'column': check.get('column'),
                    }
                })
            
            return {
                'success': True,
                'execution_mode': 'soda',
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

    def _quote_identifier(self, identifier: str) -> str:
        return '"' + str(identifier).replace('"', '""') + '"'
    
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
            'execution_mode': 'mock',
            'summary': {
                'total': len(results),
                'passed': sum(1 for r in results if r['outcome'] == 'pass'),
                'failed': sum(1 for r in results if r['outcome'] == 'fail'),
            },
            'results': results,
        }
