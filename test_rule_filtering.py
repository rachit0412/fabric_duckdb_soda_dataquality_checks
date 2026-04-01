#!/usr/bin/env python3
"""
Test script to verify rule filtering and profile endpoint functionality
"""

import requests
import csv
import io
import json
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000"
TEST_DATA_PATH = "/workspaces/fabric_duckdb_soda_dataquality_checks/data/customers.csv"

def test_profile_endpoint():
    """Test the new /api/profile endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Profile Endpoint")
    print("="*60)
    
    try:
        with open(TEST_DATA_PATH, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{API_URL}/api/profile", files=files)
        
        if response.status_code == 200:
            profile = response.json()
            print("✅ Profile endpoint works!")
            print(f"\n📊 Profile Data:")
            print(f"  - File: {profile.get('filename')}")
            print(f"  - Rows: {profile.get('row_count')}")
            print(f"  - Columns: {profile.get('column_count')}")
            print(f"  - Column names: {profile.get('columns')}")
            print(f"  - Has missing values: {profile.get('data_quality_indicators', {}).get('has_missing_values')}")
            print(f"  - Has duplicates: {profile.get('data_quality_indicators', {}).get('has_duplicates')}")
            print(f"  - Sample data rows: {len(profile.get('sample_data', []))}")
            return profile
        else:
            print(f"❌ Profile endpoint failed: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None


def test_rule_filtering():
    """Test rule filtering with /api/simple-upload"""
    print("\n" + "="*60)
    print("TEST 2: Rule Filtering")
    print("="*60)
    
    test_cases = [
        ("all", "All 13 checks (default)"),
        ("rowCount", "Row count checks (~2 checks)"),
        ("missingValues", "Missing values checks (~2 checks)"),
        ("duplicates", "Duplicate checks (~1 check)"),
        ("rowCount,missingValues", "Row count + missing values (~4 checks)"),
        ("rowCount,missingValues,duplicates", "Row count + missing values + duplicates (~5 checks)"),
    ]
    
    results = []
    
    for rules_param, description in test_cases:
        try:
            with open(TEST_DATA_PATH, 'rb') as f:
                files = {'file': f}
                data = {'rules': rules_param}
                response = requests.post(f"{API_URL}/api/simple-upload", files=files, data=data)
            
            if response.status_code == 200:
                scan_result = response.json()
                total_checks = scan_result.get('total_checks', 0)
                passed = scan_result.get('passed_checks', 0)
                failed = scan_result.get('failed_checks', 0)
                pass_rate = scan_result.get('pass_rate', 0)
                status = scan_result.get('status', 'UNKNOWN')
                
                results.append({
                    'rules': rules_param,
                    'description': description,
                    'total_checks': total_checks,
                    'passed': passed,
                    'failed': failed,
                    'pass_rate': f"{pass_rate*100:.1f}%",
                    'status': status
                })
                
                print(f"\n✅ Rules: {rules_param}")
                print(f"   {description}")
                print(f"   Total checks: {total_checks}")
                print(f"   Passed: {passed}, Failed: {failed}")
                print(f"   Pass rate: {pass_rate*100:.1f}%")
                print(f"   Status: {status}")
                
            else:
                print(f"\n❌ Rules: {rules_param} - Failed: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"\n❌ ERROR testing {rules_param}: {e}")
    
    return results


def test_rule_filtering_reduces_checks():
    """Verify that rule filtering actually reduces the number of checks"""
    print("\n" + "="*60)
    print("TEST 3: Verify Rule Filtering Reduces Checks")
    print("="*60)
    
    try:
        # Get all checks
        with open(TEST_DATA_PATH, 'rb') as f:
            files = {'file': f}
            data = {'rules': 'all'}
            response_all = requests.post(f"{API_URL}/api/simple-upload", files=files, data=data)
        
        all_checks = response_all.json().get('total_checks', 0) if response_all.status_code == 200 else None
        
        if all_checks is None:
            print(f"❌ Could not get all checks count")
            return False
        
        print(f"\n📊 All checks: {all_checks}")
        
        # Get specific rule checks
        with open(TEST_DATA_PATH, 'rb') as f:
            files = {'file': f}
            data = {'rules': 'rowCount'}
            response_filtered = requests.post(f"{API_URL}/api/simple-upload", files=files, data=data)
        
        filtered_checks = response_filtered.json().get('total_checks', 0) if response_filtered.status_code == 200 else None
        
        if filtered_checks is None:
            print(f"❌ Could not get filtered checks count")
            return False
        
        print(f"📊 Filtered (rowCount only): {filtered_checks}")
        
        if filtered_checks < all_checks:
            print(f"\n✅ SUCCESS: Rule filtering works! ({filtered_checks} < {all_checks})")
            print(f"   Reduction: {all_checks - filtered_checks} checks removed")
            return True
        else:
            print(f"\n❌ FAILURE: Rule filtering not working! ({filtered_checks} >= {all_checks})")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("DATA QUALITY PLATFORM - RULE FILTERING TEST SUITE")
    print("="*60)
    print(f"API URL: {API_URL}")
    print(f"Test data: {TEST_DATA_PATH}")
    
    # Check if test data exists
    if not Path(TEST_DATA_PATH).exists():
        print(f"❌ Test data file not found: {TEST_DATA_PATH}")
        return
    
    # Run tests
    profile = test_profile_endpoint()
    results = test_rule_filtering()
    filtering_works = test_rule_filtering_reduces_checks()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    if profile:
        print("✅ Profile endpoint: WORKING")
    else:
        print("❌ Profile endpoint: FAILED")
    
    if results:
        print(f"✅ Rule filtering: WORKING ({len(results)} test cases)")
        print("\n📋 Results Table:")
        print(f"{'Rules':<30} {'Total':<8} {'Passed':<8} {'Failed':<8} {'Rate':<10} {'Status':<12}")
        print("-" * 76)
        for r in results:
            print(f"{r['rules']:<30} {r['total_checks']:<8} {r['passed']:<8} {r['failed']:<8} {r['pass_rate']:<10} {r['status']:<12}")
    else:
        print("❌ Rule filtering: FAILED")
    
    if filtering_works:
        print("✅ Rule filtering reduces checks: YES")
    else:
        print("❌ Rule filtering reduces checks: NO")
    
    print("\n" + "="*60)
    print("If all tests passed (✅), the following is working:")
    print("  1. Data profiling before scanning")
    print("  2. Rule selection actually filters which checks run")
    print("  3. Selected rules reduce total checks from 13")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
