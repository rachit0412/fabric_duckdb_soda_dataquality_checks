"""
Unit tests for the scanner module
"""
import pytest
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
import duckdb

from src.core.scanner import EnhancedDataQualityScanner, ScanResult


@pytest.fixture
def sample_dataframe():
    """Create a sample DataFrame for testing"""
    return pd.DataFrame({
        'CustomerID': range(1, 101),
        'Name': [f'Customer {i}' for i in range(1, 101)],
        'Email': [f'customer{i}@example.com' for i in range(1, 101)],
        'Age': [20 + (i % 50) for i in range(1, 101)],
        'Amount': [100.0 + i * 10 for i in range(1, 101)]
    })


@pytest.fixture
def scanner():
    """Create a scanner instance"""
    return EnhancedDataQualityScanner()


class TestEnhancedDataQualityScanner:
    """Test cases for EnhancedDataQualityScanner"""
    
    def test_scanner_initialization(self, scanner):
        """Test scanner initializes correctly"""
        assert scanner is not None
        assert scanner.connection is not None
        
    def test_load_data(self, scanner, sample_dataframe, tmp_path):
        """Test data loading from CSV"""
        # Save DataFrame to CSV
        csv_path = tmp_path / "test_data.csv"
        sample_dataframe.to_csv(csv_path, index=False)
        
        # Load data
        df = scanner.load_data(str(csv_path), "test_table")
        
        assert len(df) == 100
        assert 'CustomerID' in df.columns
        
    def test_parse_scan_results(self, scanner):
        """Test parsing of Soda scan results"""
        # Create mock scan with results
        mock_scan = Mock()
        
        # Create mock checks
        mock_check_pass = Mock()
        mock_check_pass.outcome = "pass"
        mock_check_pass.name = "row_count"
        
        mock_check_fail = Mock()
        mock_check_fail.outcome = "fail"
        mock_check_fail.name = "missing_count"
        
        mock_scan.get_checks.return_value = [mock_check_pass, mock_check_fail]
        
        # Parse results
        results = scanner.parse_scan_results(mock_scan, "test_table")
        
        assert results['total_checks'] == 2
        assert results['passed_checks'] == 1
        assert results['failed_checks'] == 1
        assert results['pass_rate'] == 0.5
        
    def test_scan_result_to_dict(self):
        """Test ScanResult serialization"""
        from datetime import datetime
        
        result = ScanResult(
            scan_id="test-123",
            timestamp=datetime.now(),
            data_source="test.csv",
            table_name="test_table",
            total_checks=10,
            passed_checks=8,
            failed_checks=2,
            warned_checks=0,
            pass_rate=0.8,
            status="WARNING",
            duration_seconds=5.5,
            check_details=[]
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['scan_id'] == "test-123"
        assert result_dict['total_checks'] == 10
        assert result_dict['pass_rate'] == 0.8
        assert isinstance(result_dict['timestamp'], str)


class TestDataProfiler:
    """Test cases for DataProfiler"""
    
    def test_profile_dataframe(self, sample_dataframe):
        """Test data profiling"""
        from src.core.profiler import DataProfiler
        
        profiler = DataProfiler()
        profile = profiler.profile_dataframe(sample_dataframe, "test_table")
        
        assert profile['table_name'] == "test_table"
        assert profile['row_count'] == 100
        assert profile['column_count'] == 5
        assert len(profile['columns']) == 5
        
    def test_profile_numeric_column(self, sample_dataframe):
        """Test numeric column profiling"""
        from src.core.profiler import DataProfiler
        
        profiler = DataProfiler()
        profile = profiler.profile_dataframe(sample_dataframe, "test_table")
        
        # Find Age column profile
        age_profile = next(c for c in profile['columns'] if c['name'] == 'Age')
        
        assert 'numeric_stats' in age_profile
        assert 'mean' in age_profile['numeric_stats']
        assert 'min' in age_profile['numeric_stats']
        assert 'max' in age_profile['numeric_stats']


class TestAnomalyDetector:
    """Test cases for AnomalyDetector"""
    
    def test_detect_anomalies(self, sample_dataframe):
        """Test anomaly detection"""
        from src.core.anomaly_detector import AnomalyDetector
        
        detector = AnomalyDetector()
        anomalies = detector.detect_anomalies(sample_dataframe, "test_table")
        
        assert isinstance(anomalies, list)
        
    def test_detect_numeric_outliers(self):
        """Test numeric outlier detection"""
        from src.core.anomaly_detector import AnomalyDetector
        
        # Create DataFrame with outliers
        df = pd.DataFrame({
            'value': [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000]  # 1000 is an outlier
        })
        
        detector = AnomalyDetector()
        anomalies = detector._detect_numeric_anomalies(df['value'], 'value')
        
        assert len(anomalies) > 0
        assert anomalies[0]['type'] in ['numeric_outlier_zscore', 'numeric_outlier_iqr']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
