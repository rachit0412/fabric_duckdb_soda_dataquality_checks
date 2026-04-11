"""
File Security Validation Service

Provides comprehensive file validation including:
- Virus scanning (ClamAV integration, optional)
- MIME type verification
- File size validation
- Content inspection
"""

import logging
import os
from pathlib import Path
from typing import Optional
import magic

logger = logging.getLogger(__name__)


class FileSecurityValidator:
    """Validates files for security threats before processing."""
    
    def __init__(self):
        """Initialize validator with optional ClamAV connection."""
        self.clamav_enabled = os.getenv("CLAMAV_ENABLED", "false").lower() == "true"
        self.clamav_socket = os.getenv("CLAMAV_SOCKET", "unix:///var/run/clamav/clamd.ctl")
        self.mime_detector = magic.Magic(mime=True)
        
        if self.clamav_enabled:
            logger.info("ClamAV virus scanning enabled")
        else:
            logger.info("ClamAV virus scanning disabled (optional)")
    
    async def scan_file(self, file_path: str) -> bool:
        """
        Scan file for viruses using ClamAV if available.
        
        Args:
            file_path: Path to file to scan
            
        Returns:
            True if file is safe or scanner unavailable, False if threat detected
        """
        if not self.clamav_enabled:
            logger.debug("Skipping ClamAV scan (disabled)")
            return True
        
        try:
            import pyclamd
            
            clam = pyclamd.ClamdUnixSocket(self.clamav_socket)
            
            if not clam.ping():
                logger.warning("ClamAV daemon not responding, proceeding without scan")
                return True
            
            # Scan file
            result = clam.scan_file(file_path)
            
            if result is None:
                logger.debug(f"File passed ClamAV scan: {file_path}")
                return True
            else:
                logger.error(f"ClamAV threat detected in {file_path}: {result}")
                return False
                
        except ImportError:
            logger.warning("pyclamd not installed, skipping ClamAV scan")
            return True
        except Exception as e:
            logger.warning(f"ClamAV scan failed (proceeding): {e}")
            return True
    
    def verify_mime_type(self, file_path: str, expected_types: list) -> bool:
        """
        Verify MIME type matches expected types.
        
        Args:
            file_path: Path to file
            expected_types: List of allowed MIME types (e.g., ['text/csv', 'text/plain'])
            
        Returns:
            True if MIME type matches, False otherwise
        """
        try:
            mime_type = self.mime_detector.from_file(file_path)
            is_valid = mime_type in expected_types
            
            if not is_valid:
                logger.warning(f"MIME type mismatch: {file_path} is {mime_type}, expected {expected_types}")
            
            return is_valid
        except Exception as e:
            logger.error(f"Failed to detect MIME type: {e}")
            return False
    
    def inspect_file_content(self, file_path: str, max_lines: int = 10) -> dict:
        """
        Inspect file content for suspicious patterns.
        
        Args:
            file_path: Path to file
            max_lines: Number of lines to inspect
            
        Returns:
            Dict with inspection results
        """
        try:
            suspicious_patterns = []
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for i, line in enumerate(f):
                    if i >= max_lines:
                        break
                    
                    # Check for SQL injection patterns (basic)
                    if any(pattern in line.lower() for pattern in [
                        "drop table", "delete from", "truncate", "insert into",
                        "update", "exec", "execute"
                    ]):
                        suspicious_patterns.append(f"Line {i+1}: Possible SQL injection pattern")
                    
                    # Check for shell command patterns
                    if any(pattern in line for pattern in [
                        "$(", "`", "| sh", "| bash"
                    ]):
                        suspicious_patterns.append(f"Line {i+1}: Possible shell injection pattern")
            
            return {
                "safe": len(suspicious_patterns) == 0,
                "patterns_found": suspicious_patterns,
                "lines_inspected": max(i + 1, max_lines)
            }
        except Exception as e:
            logger.error(f"Failed to inspect file content: {e}")
            return {
                "safe": True,
                "patterns_found": [],
                "error": str(e)
            }
