#!/usr/bin/env python3
"""
Alert Engine Entry Point for Cron Execution
Run this script to process alerts once and exit
"""

import sys
import asyncio
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.main import run_once_and_exit

if __name__ == "__main__":
    asyncio.run(run_once_and_exit())
