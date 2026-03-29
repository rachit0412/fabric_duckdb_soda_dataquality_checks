"""
Rich HTML report generator with interactive charts
"""
import json
from typing import Dict, Any
from datetime import datetime
from pathlib import Path
import logging

from ..core.scanner import ScanResult

logger = logging.getLogger(__name__)


class HTMLReportGenerator:
    """Generate beautiful, interactive HTML reports"""
    
    def generate_report(self, scan_result: ScanResult, output_path: str) -> str:
        """Generate comprehensive HTML report"""
        logger.info(f"Generating HTML report for scan {scan_result.scan_id}")
        
        html_content = self._build_html(scan_result)
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"HTML report generated: {output_path}")
        return output_path
    
    def _build_html(self, result: ScanResult) -> str:
        """Build complete HTML document"""
        status_color = self._get_status_color(result.status)
        
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Quality Report - {result.table_name}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }}
        
        .header .subtitle {{
            font-size: 1.2em;
            opacity: 0.9;
        }}
        
        .status-badge {{
            display: inline-block;
            padding: 10px 30px;
            border-radius: 30px;
            font-size: 1.1em;
            font-weight: bold;
            margin-top: 20px;
            background: {status_color};
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        
        .content {{
            padding: 40px;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        
        .metric-card {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }}
        
        .metric-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }}
        
        .metric-card .label {{
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        
        .metric-card .value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }}
        
        .section {{
            margin-bottom: 40px;
        }}
        
        .section h2 {{
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            font-size: 1.8em;
        }}
        
        .chart-container {{
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }}
        
        canvas {{
            max-height: 400px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }}
        
        th {{
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }}
        
        td {{
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }}
        
        tr:hover {{
            background: #f8f9fa;
        }}
        
        .check-pass {{
            color: #28a745;
            font-weight: bold;
        }}
        
        .check-fail {{
            color: #dc3545;
            font-weight: bold;
        }}
        
        .check-warn {{
            color: #ffc107;
            font-weight: bold;
        }}
        
        .anomaly-card {{
            background: #fff3cd;
            border-left: 5px solid #ffc107;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 5px;
        }}
        
        .anomaly-card.high {{
            background: #f8d7da;
            border-left-color: #dc3545;
        }}
        
        .anomaly-card.critical {{
            background: #721c24;
            color: white;
            border-left-color: #f5c6cb;
        }}
        
        .profile-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }}
        
        .column-profile {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }}
        
        .column-profile h3 {{
            color: #667eea;
            margin-bottom: 15px;
        }}
        
        .profile-stat {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }}
        
        .profile-stat:last-child {{
            border-bottom: none;
        }}
        
        .footer {{
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }}
        
        .metadata {{
            background: #e9ecef;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        
        .metadata-item {{
            display: inline-block;
            margin-right: 30px;
            margin-bottom: 10px;
        }}
        
        .metadata-item strong {{
            color: #667eea;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Data Quality Report</h1>
            <div class="subtitle">{result.table_name}</div>
            <div class="status-badge">{result.status}</div>
        </div>
        
        <div class="content">
            <!-- Metadata -->
            <div class="metadata">
                <div class="metadata-item"><strong>Scan ID:</strong> {result.scan_id}</div>
                <div class="metadata-item"><strong>Timestamp:</strong> {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</div>
                <div class="metadata-item"><strong>Duration:</strong> {result.duration_seconds:.2f}s</div>
                <div class="metadata-item"><strong>Data Source:</strong> {result.data_source}</div>
            </div>
            
            <!-- Key Metrics -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="label">Pass Rate</div>
                    <div class="value">{result.pass_rate:.1%}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Total Checks</div>
                    <div class="value">{result.total_checks}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Passed</div>
                    <div class="value" style="color: #28a745;">{result.passed_checks}</div>
                </div>
                <div class="metric-card">
                    <div class="label">Failed</div>
                    <div class="value" style="color: #dc3545;">{result.failed_checks}</div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="section">
                <h2>📊 Visual Analysis</h2>
                <div class="chart-container">
                    <canvas id="checksChart"></canvas>
                </div>
            </div>
            
            <!-- Check Details -->
            <div class="section">
                <h2>✅ Check Details</h2>
                {self._generate_checks_table(result.check_details)}
            </div>
            
            <!-- Anomalies -->
            {self._generate_anomalies_section(result.anomalies)}
            
            <!-- Data Profile -->
            {self._generate_profile_section(result.profile)}
        </div>
        
        <div class="footer">
            <p>Generated by KPMG Enterprise Data Quality Platform v1.0</p>
            <p>Powered by Soda Core, DuckDB, and Microsoft Fabric</p>
        </div>
    </div>
    
    <script>
        // Checks Distribution Chart
        const ctx = document.getElementById('checksChart').getContext('2d');
        new Chart(ctx, {{
            type: 'doughnut',
            data: {{
                labels: ['Passed', 'Failed', 'Warned'],
                datasets: [{{
                    data: [{result.passed_checks}, {result.failed_checks}, {result.warned_checks}],
                    backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{
                            font: {{
                                size: 14
                            }},
                            padding: 20
                        }}
                    }},
                    title: {{
                        display: true,
                        text: 'Quality Checks Distribution',
                        font: {{
                            size: 18
                        }},
                        padding: 20
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""
    
    def _generate_checks_table(self, check_details: list) -> str:
        """Generate HTML table for check details"""
        rows = ""
        for check in check_details:
            outcome_class = f"check-{check['outcome']}"
            rows += f"""
            <tr>
                <td>{check['name']}</td>
                <td>{check.get('column', 'N/A')}</td>
                <td class="{outcome_class}">{check['outcome'].upper()}</td>
                <td>{check.get('metric_value', 'N/A')}</td>
            </tr>
            """
        
        return f"""
        <table>
            <thead>
                <tr>
                    <th>Check Name</th>
                    <th>Column</th>
                    <th>Outcome</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
        """
    
    def _generate_anomalies_section(self, anomalies: list) -> str:
        """Generate anomalies section"""
        if not anomalies or len(anomalies) == 0:
            return """
            <div class="section">
                <h2>🔍 Anomalies</h2>
                <p style="color: #28a745; font-size: 1.2em;">✓ No anomalies detected!</p>
            </div>
            """
        
        anomaly_cards = ""
        for anomaly in anomalies:
            severity_class = anomaly.get('severity', 'medium')
            anomaly_cards += f"""
            <div class="anomaly-card {severity_class}">
                <h4>{anomaly['type'].replace('_', ' ').title()}</h4>
                <p><strong>Column:</strong> {anomaly['column']}</p>
                <p><strong>Severity:</strong> {anomaly['severity'].upper()}</p>
                <p>{anomaly['message']}</p>
            </div>
            """
        
        return f"""
        <div class="section">
            <h2>🔍 Anomalies Detected</h2>
            <p style="margin-bottom: 20px;">Found {len(anomalies)} anomalies requiring attention:</p>
            {anomaly_cards}
        </div>
        """
    
    def _generate_profile_section(self, profile: dict) -> str:
        """Generate data profile section"""
        if not profile:
            return ""
        
        column_cards = ""
        for col in profile.get('columns', []):
            stats_html = self._format_column_stats(col)
            column_cards += f"""
            <div class="column-profile">
                <h3>{col['name']}</h3>
                <div class="profile-stat">
                    <span>Data Type:</span>
                    <strong>{col['data_type']}</strong>
                </div>
                <div class="profile-stat">
                    <span>Null %:</span>
                    <strong>{col['null_percentage']:.2f}%</strong>
                </div>
                <div class="profile-stat">
                    <span>Unique Values:</span>
                    <strong>{col['unique_count']}</strong>
                </div>
                {stats_html}
            </div>
            """
        
        return f"""
        <div class="section">
            <h2>📈 Data Profile</h2>
            <div class="profile-grid">
                {column_cards}
            </div>
        </div>
        """
    
    def _format_column_stats(self, col: dict) -> str:
        """Format type-specific column statistics"""
        stats_html = ""
        
        if 'numeric_stats' in col and col['numeric_stats']:
            stats = col['numeric_stats']
            stats_html += f"""
            <div class="profile-stat">
                <span>Mean:</span>
                <strong>{stats['mean']:.2f}</strong>
            </div>
            <div class="profile-stat">
                <span>Min/Max:</span>
                <strong>{stats['min']:.2f} / {stats['max']:.2f}</strong>
            </div>
            """
        
        if 'text_stats' in col and col['text_stats']:
            stats = col['text_stats']
            stats_html += f"""
            <div class="profile-stat">
                <span>Avg Length:</span>
                <strong>{stats['avg_length']:.0f} chars</strong>
            </div>
            """
        
        return stats_html
    
    def _get_status_color(self, status: str) -> str:
        """Get color for status badge"""
        colors = {
            "PASSED": "#28a745",
            "WARNING": "#ffc107",
            "FAILED": "#fd7e14",
            "CRITICAL": "#dc3545"
        }
        return colors.get(status, "#6c757d")
