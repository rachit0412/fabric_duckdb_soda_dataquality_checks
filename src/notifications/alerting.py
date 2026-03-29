"""
Multi-channel alerting and notification system
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import logging
from typing import List
from datetime import datetime

from ..core.scanner import ScanResult
from ..config import config

logger = logging.getLogger(__name__)


class AlertingService:
    """
    Enterprise alerting service supporting:
    - Email notifications (SMTP)
    - Microsoft Teams webhooks
    - Slack webhooks (optional)
    - Custom webhooks
    """
    
    def __init__(self):
        self.config = config.alerting_config
    
    def process_scan_result(self, scan_result: ScanResult):
        """Process scan result and send alerts if needed"""
        if not self.config.enabled:
            logger.info("Alerting disabled - skipping notifications")
            return
        
        # Determine if alert should be sent
        should_alert = self._should_send_alert(scan_result)
        
        if should_alert:
            logger.info(f"Sending alerts for scan {scan_result.scan_id} with status {scan_result.status}")
            
            if self.config.email_enabled:
                self._send_email_alert(scan_result)
            
            if self.config.teams_webhook_url:
                self._send_teams_alert(scan_result)
    
    def _should_send_alert(self, scan_result: ScanResult) -> bool:
        """Determine if alert should be sent based on status"""
        # Always alert on failures and warnings
        return scan_result.status in ["WARNING", "FAILED", "CRITICAL"]
    
    def _send_email_alert(self, scan_result: ScanResult):
        """Send email alert"""
        if not self.config.smtp_server or not self.config.recipient_emails:
            logger.warning("Email configuration incomplete - skipping email alert")
            return
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🚨 Data Quality Alert: {scan_result.table_name} - {scan_result.status}"
            msg['From'] = self.config.sender_email
            msg['To'] = ', '.join(self.config.recipient_emails)
            
            # Create HTML email
            html_body = self._create_email_html(scan_result)
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.config.smtp_server, self.config.smtp_port) as server:
                server.starttls()
                # Add authentication if credentials are available
                # server.login(username, password)
                server.send_message(msg)
            
            logger.info(f"Email alert sent for scan {scan_result.scan_id}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
    
    def _send_teams_alert(self, scan_result: ScanResult):
        """Send Microsoft Teams alert"""
        try:
            # Create Teams adaptive card
            card = self._create_teams_card(scan_result)
            
            response = requests.post(
                self.config.teams_webhook_url,
                json=card,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                logger.info(f"Teams alert sent for scan {scan_result.scan_id}")
            else:
                logger.error(f"Failed to send Teams alert: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send Teams alert: {str(e)}")
    
    def _create_email_html(self, scan_result: ScanResult) -> str:
        """Create HTML email body"""
        status_emoji = {
            "PASSED": "✅",
            "WARNING": "⚠️",
            "FAILED": "❌",
            "CRITICAL": "🔴"
        }.get(scan_result.status, "ℹ️")
        
        status_color = {
            "PASSED": "#28a745",
            "WARNING": "#ffc107",
            "FAILED": "#fd7e14",
            "CRITICAL": "#dc3545"
        }.get(scan_result.status, "#6c757d")
        
        failed_checks_html = ""
        for check in scan_result.check_details:
            if check['outcome'] == 'fail':
                failed_checks_html += f"<li>{check['name']} ({check.get('column', 'N/A')})</li>"
        
        return f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ 
                    background: {status_color}; 
                    color: white; 
                    padding: 30px; 
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{ 
                    background: #f8f9fa; 
                    padding: 30px; 
                    border-radius: 0 0 10px 10px;
                }}
                .metric {{ 
                    display: inline-block; 
                    margin: 10px 20px; 
                    text-align: center;
                }}
                .metric-value {{ 
                    font-size: 2em; 
                    font-weight: bold; 
                    color: {status_color};
                }}
                .metric-label {{ 
                    color: #666; 
                    font-size: 0.9em;
                }}
                .footer {{
                    text-align: center;
                    color: #666;
                    margin-top: 20px;
                    font-size: 0.9em;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{status_emoji} Data Quality Alert</h1>
                    <h2>{scan_result.table_name}</h2>
                </div>
                <div class="content">
                    <p><strong>Status:</strong> {scan_result.status}</p>
                    <p><strong>Scan ID:</strong> {scan_result.scan_id}</p>
                    <p><strong>Timestamp:</strong> {scan_result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</p>
                    
                    <div style="margin: 30px 0;">
                        <div class="metric">
                            <div class="metric-value">{scan_result.pass_rate:.1%}</div>
                            <div class="metric-label">Pass Rate</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">{scan_result.failed_checks}</div>
                            <div class="metric-label">Failed Checks</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">{len(scan_result.anomalies or [])}</div>
                            <div class="metric-label">Anomalies</div>
                        </div>
                    </div>
                    
                    {f'<h3>Failed Checks:</h3><ul>{failed_checks_html}</ul>' if failed_checks_html else ''}
                    
                    <p style="margin-top: 30px;">
                        <strong>Action Required:</strong> 
                        Review the data quality issues and take corrective action.
                    </p>
                </div>
                <div class="footer">
                    <p>Enterprise Data Quality Platform</p>
                    <p>Powered by Soda Core & Microsoft Fabric</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_teams_card(self, scan_result: ScanResult) -> dict:
        """Create Microsoft Teams adaptive card"""
        status_color = {
            "PASSED": "good",
            "WARNING": "warning",
            "FAILED": "attention",
            "CRITICAL": "attention"
        }.get(scan_result.status, "default")
        
        facts = [
            {"title": "Table", "value": scan_result.table_name},
            {"title": "Status", "value": scan_result.status},
            {"title": "Pass Rate", "value": f"{scan_result.pass_rate:.1%}"},
            {"title": "Failed Checks", "value": str(scan_result.failed_checks)},
            {"title": "Timestamp", "value": scan_result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
        ]
        
        return {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": f"Data Quality Alert: {scan_result.table_name}",
            "themeColor": status_color,
            "title": f"🚨 Data Quality Alert: {scan_result.status}",
            "sections": [
                {
                    "activityTitle": f"**{scan_result.table_name}**",
                    "activitySubtitle": f"Scan completed at {scan_result.timestamp.strftime('%H:%M:%S')}",
                    "facts": facts,
                    "text": f"Data quality scan detected {scan_result.failed_checks} failed checks. Review and take action."
                }
            ],
            "potentialAction": [
                {
                    "@type": "OpenUri",
                    "name": "View Details",
                    "targets": [
                        {
                            "os": "default",
                            "uri": f"http://your-api-server/api/reports/{scan_result.scan_id}"
                        }
                    ]
                }
            ]
        }
