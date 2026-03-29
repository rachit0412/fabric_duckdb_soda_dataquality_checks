"""
Quick test script - Run this first to verify installation
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 60)
print("🧪 Quick System Test")
print("=" * 60)

# Test 1: Import packages
print("\n1️⃣ Testing imports...")
try:
    from src.core.scanner import EnhancedDataQualityScanner
    from src.reporting.html_generator import HTMLReportGenerator
    from src.core.profiler import DataProfiler
    from src.core.anomaly_detector import AnomalyDetector
    from src.utils.logging import setup_logging
    print("✅ All imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    print("\n💡 Fix: pip install -r requirements.txt")
    sys.exit(1)

# Test 2: Create test data
print("\n2️⃣ Creating test data...")
try:
    import pandas as pd
    
    test_data = pd.DataFrame({
        'CustomerID': [1, 2, 3, 4, 5],
        'Name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
        'Email': ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'david@test.com', 'eve@test.com'],
        'Age': [25, 32, 28, 41, 35],
        'Amount': [100.0, 200.0, 150.0, 300.0, 250.0]
    })
    
    test_file = "quick_test_data.csv"
    test_data.to_csv(test_file, index=False)
    print(f"✅ Test data created: {test_file}")
except Exception as e:
    print(f"❌ Failed to create test data: {e}")
    sys.exit(1)

# Test 3: Initialize scanner
print("\n3️⃣ Testing scanner initialization...")
try:
    setup_logging(log_level="ERROR")  # Quiet mode
    scanner = EnhancedDataQualityScanner()
    print("✅ Scanner initialized")
except Exception as e:
    print(f"❌ Scanner initialization failed: {e}")
    sys.exit(1)

# Test 4: Run basic scan
print("\n4️⃣ Running quick scan...")
try:
    result = scanner.execute_comprehensive_scan(
        csv_path=test_file,
        table_name="quick_test",
        checks_path="soda_duckdb/checks.yml",
        config_path="soda_duckdb/config.yml"
    )
    
    print(f"✅ Scan completed")
    print(f"   Status: {result.status}")
    print(f"   Pass Rate: {result.pass_rate:.1%}")
    print(f"   Total Checks: {result.total_checks}")
    print(f"   Duration: {result.duration_seconds:.2f}s")
except Exception as e:
    print(f"❌ Scan failed: {e}")
    print("\n💡 Make sure soda_duckdb/checks.yml and config.yml exist")
    scanner.close()
    sys.exit(1)

# Test 5: Generate HTML report
print("\n5️⃣ Testing HTML report generation...")
try:
    generator = HTMLReportGenerator()
    report_file = "quick_test_report.html"
    generator.generate_report(result, report_file)
    print(f"✅ Report generated: {report_file}")
    print(f"   Open this file in your browser to view")
except Exception as e:
    print(f"❌ Report generation failed: {e}")

# Test 6: Test profiler
print("\n6️⃣ Testing data profiler...")
try:
    profiler = DataProfiler()
    profile = profiler.profile_dataframe(test_data, "quick_test")
    print(f"✅ Profiler working")
    print(f"   Profiled {profile['column_count']} columns")
except Exception as e:
    print(f"❌ Profiler failed: {e}")

# Test 7: Test anomaly detector
print("\n7️⃣ Testing anomaly detector...")
try:
    detector = AnomalyDetector()
    anomalies = detector.detect_anomalies(test_data, "quick_test")
    print(f"✅ Anomaly detector working")
    print(f"   Detected {len(anomalies)} anomalies")
except Exception as e:
    print(f"❌ Anomaly detector failed: {e}")

# Cleanup
scanner.close()

# Summary
print("\n" + "=" * 60)
print("🎉 QUICK TEST COMPLETE!")
print("=" * 60)
print("\nYour system is ready! Next steps:")
print("1. View the report: quick_test_report.html")
print("2. Read the full testing guide: TESTING.md")
print("3. Run comprehensive tests: pytest tests/ -v")
print("4. Start the API: python -m src.api.server")
print("\n📚 Full documentation: README.md")
print("=" * 60)
