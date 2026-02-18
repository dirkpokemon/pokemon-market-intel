"""
Core Alert Engine Logic
Processes signals and sends alerts to premium users
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.signal import Signal
from app.models.user import User, UserRole
from app.models.alert_sent import AlertSent
from app.providers.email_provider import get_email_provider, EmailMessage
from app.providers.telegram_provider import get_telegram_provider, TelegramMessage, format_signal_for_telegram


logger = logging.getLogger(__name__)


# Setup Jinja2 template environment
template_dir = os.path.join(os.path.dirname(__file__), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(template_dir),
    autoescape=select_autoescape(["html", "xml"])
)


class AlertEngine:
    """
    Main alert engine that processes signals and sends alerts
    
    Responsibilities:
    - Find new high-priority signals
    - Find eligible premium users
    - Check for duplicates
    - Send immediate alerts (high priority)
    - Compile and send daily digests (medium priority)
    - Track sent alerts
    """
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.email_provider = None
        self.telegram_provider = None
        
        # Initialize providers
        try:
            self.email_provider = get_email_provider()
            logger.info(f"Email provider initialized: {settings.EMAIL_PROVIDER}")
        except Exception as e:
            logger.error(f"Failed to initialize email provider: {e}")
        
        try:
            self.telegram_provider = get_telegram_provider()
            if self.telegram_provider:
                logger.info("Telegram provider initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Telegram provider: {e}")
    
    async def process_high_priority_alerts(self) -> Dict[str, int]:
        """
        Process and send immediate alerts for high-priority signals
        
        Returns:
            Stats dict with counts of processed/sent alerts
        """
        logger.info("Processing high-priority (immediate) alerts...")
        
        stats = {
            "signals_found": 0,
            "users_eligible": 0,
            "alerts_sent": 0,
            "alerts_failed": 0,
            "alerts_skipped_duplicate": 0
        }
        
        # Find unsent high-priority signals
        signals = await self._get_unsent_high_priority_signals()
        stats["signals_found"] = len(signals)
        
        if not signals:
            logger.info("No new high-priority signals found")
            return stats
        
        logger.info(f"Found {len(signals)} high-priority signals to process")
        
        # Get eligible premium users
        users = await self._get_premium_users_with_alerts_enabled()
        stats["users_eligible"] = len(users)
        
        if not users:
            logger.warning("No eligible premium users found")
            return stats
        
        logger.info(f"Found {len(users)} eligible premium users")
        
        # Send alerts for each signal to each eligible user
        for signal in signals:
            for user in users:
                # Check if already sent
                if await self._is_alert_already_sent(user.id, signal.id):
                    stats["alerts_skipped_duplicate"] += 1
                    continue
                
                # Check daily rate limit
                if await self._is_rate_limited(user.id):
                    logger.warning(f"User {user.email} has reached daily alert limit")
                    continue
                
                # Send alert
                success = await self._send_immediate_alert(user, signal)
                if success:
                    stats["alerts_sent"] += 1
                else:
                    stats["alerts_failed"] += 1
            
            # Mark signal as sent
            signal.is_sent = True
            signal.sent_at = datetime.utcnow()
        
        await self.db.commit()
        
        logger.info(f"High-priority alerts complete: {stats}")
        return stats
    
    async def process_daily_digest(self) -> Dict[str, int]:
        """
        Compile and send daily digest of medium-priority signals
        
        Should be run once per day (e.g., 9 AM UTC)
        
        Returns:
            Stats dict with counts
        """
        logger.info("Processing daily digest (medium-priority signals)...")
        
        stats = {
            "signals_found": 0,
            "users_eligible": 0,
            "digests_sent": 0,
            "digests_failed": 0
        }
        
        if not settings.MEDIUM_PRIORITY_DIGEST:
            logger.info("Daily digest is disabled")
            return stats
        
        # Get medium-priority signals from last 24 hours
        signals = await self._get_recent_medium_priority_signals()
        stats["signals_found"] = len(signals)
        
        if not signals:
            logger.info("No medium-priority signals for digest")
            return stats
        
        logger.info(f"Found {len(signals)} medium-priority signals for digest")
        
        # Get eligible users
        users = await self._get_premium_users_with_alerts_enabled()
        stats["users_eligible"] = len(users)
        
        if not users:
            logger.warning("No eligible users for digest")
            return stats
        
        # Send digest to each user
        for user in users:
            success = await self._send_daily_digest(user, signals)
            if success:
                stats["digests_sent"] += 1
                
                # Record digest as sent for all signals
                for signal in signals:
                    await self._record_alert_sent(
                        user_id=user.id,
                        signal_id=signal.id,
                        alert_type="digest",
                        severity="medium",
                        channel="email",
                        subject="Daily Market Digest",
                        success=True
                    )
            else:
                stats["digests_failed"] += 1
        
        await self.db.commit()
        
        logger.info(f"Daily digest complete: {stats}")
        return stats
    
    async def _get_unsent_high_priority_signals(self) -> List[Signal]:
        """Get active, unsent high-priority signals"""
        query = select(Signal).where(
            and_(
                Signal.is_active == True,
                Signal.is_sent == False,
                Signal.signal_level.in_(settings.HIGH_SEVERITY_LEVELS)
            )
        ).order_by(Signal.priority.desc(), Signal.detected_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _get_recent_medium_priority_signals(self, hours: int = 24) -> List[Signal]:
        """Get medium-priority signals from last N hours"""
        threshold = datetime.utcnow() - timedelta(hours=hours)
        
        query = select(Signal).where(
            and_(
                Signal.is_active == True,
                Signal.signal_level.in_(settings.MEDIUM_SEVERITY_LEVELS),
                Signal.detected_at >= threshold
            )
        ).order_by(Signal.priority.desc(), Signal.detected_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _get_premium_users_with_alerts_enabled(self) -> List[User]:
        """Get all premium users who have alerts enabled"""
        query = select(User).where(
            and_(
                User.is_active == True,
                User.role.in_([UserRole.paid, UserRole.pro, UserRole.admin]),
                User.alerts_enabled == True  # Assumes this column exists
            )
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _is_alert_already_sent(self, user_id: int, signal_id: int) -> bool:
        """Check if alert was already sent to this user for this signal"""
        query = select(AlertSent).where(
            and_(
                AlertSent.user_id == user_id,
                AlertSent.signal_id == signal_id
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def _is_rate_limited(self, user_id: int) -> bool:
        """Check if user has exceeded daily alert limit"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        query = select(func.count(AlertSent.id)).where(
            and_(
                AlertSent.user_id == user_id,
                AlertSent.sent_at >= today,
                AlertSent.alert_type == "immediate"
            )
        )
        
        result = await self.db.execute(query)
        count = result.scalar()
        
        return count >= settings.MAX_ALERTS_PER_USER_PER_DAY
    
    async def _send_immediate_alert(self, user: User, signal: Signal) -> bool:
        """Send immediate alert via email and/or Telegram"""
        success_email = False
        success_telegram = False
        
        # Prepare signal data
        signal_data = {
            "product_name": signal.product_name,
            "product_set": signal.product_set,
            "signal_level": signal.signal_level,
            "signal_type": signal.signal_type,
            "current_price": float(signal.current_price) if signal.current_price else None,
            "market_avg_price": float(signal.market_avg_price) if signal.market_avg_price else None,
            "deal_score": float(signal.deal_score) if signal.deal_score else None,
            "description": signal.description
        }
        
        # Send email
        if self.email_provider:
            try:
                html_content = self._render_alert_email(signal_data)
                subject = f"🔥 {signal.signal_level.upper()} ALERT: {signal.product_name}"
                
                email_msg = EmailMessage(
                    to_email=user.email,
                    to_name=user.full_name,
                    subject=subject,
                    html_content=html_content
                )
                
                success, message_id = await self.email_provider.send_email(email_msg)
                success_email = success
                
                # Record sent alert
                await self._record_alert_sent(
                    user_id=user.id,
                    signal_id=signal.id,
                    alert_type="immediate",
                    severity=signal.signal_level,
                    channel="email",
                    subject=subject,
                    success=success,
                    message_id=message_id
                )
            except Exception as e:
                logger.error(f"Failed to send email alert to {user.email}: {e}")
        
        # Send Telegram (if user has chat_id configured)
        if self.telegram_provider and user.telegram_chat_id:
            try:
                telegram_text = format_signal_for_telegram(signal_data)
                telegram_msg = TelegramMessage(
                    chat_id=user.telegram_chat_id,
                    text=telegram_text,
                    parse_mode="HTML"
                )
                
                success, message_id = await self.telegram_provider.send_message(telegram_msg)
                success_telegram = success
                
                # Record sent alert
                await self._record_alert_sent(
                    user_id=user.id,
                    signal_id=signal.id,
                    alert_type="immediate",
                    severity=signal.signal_level,
                    channel="telegram",
                    subject=f"Alert: {signal.product_name}",
                    success=success,
                    message_id=message_id
                )
            except Exception as e:
                logger.error(f"Failed to send Telegram alert to {user.email}: {e}")
        
        return success_email or success_telegram
    
    async def _send_daily_digest(self, user: User, signals: List[Signal]) -> bool:
        """Send daily digest email"""
        if not self.email_provider:
            return False
        
        try:
            # Prepare signal data for template
            signal_data_list = []
            for signal in signals:
                signal_data_list.append({
                    "product_name": signal.product_name,
                    "product_set": signal.product_set,
                    "current_price": float(signal.current_price) if signal.current_price else None,
                    "deal_score": float(signal.deal_score) if signal.deal_score else None,
                    "description": signal.description
                })
            
            # Render email
            html_content = self._render_digest_email(signal_data_list)
            subject = f"📊 Daily Market Digest — {len(signals)} New Signals"
            
            email_msg = EmailMessage(
                to_email=user.email,
                to_name=user.full_name,
                subject=subject,
                html_content=html_content
            )
            
            success, message_id = await self.email_provider.send_email(email_msg)
            return success
            
        except Exception as e:
            logger.error(f"Failed to send digest to {user.email}: {e}")
            return False
    
    async def _record_alert_sent(
        self,
        user_id: int,
        signal_id: int,
        alert_type: str,
        severity: str,
        channel: str,
        subject: str,
        success: bool,
        message_id: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Record an alert as sent in the database"""
        alert_record = AlertSent(
            user_id=user_id,
            signal_id=signal_id,
            alert_type=alert_type,
            severity=severity,
            channel=channel,
            subject=subject,
            sent_successfully=success,
            error_message=error,
            external_message_id=message_id
        )
        
        self.db.add(alert_record)
    
    def _render_alert_email(self, signal_data: Dict[str, Any]) -> str:
        """Render immediate alert email template"""
        template = jinja_env.get_template("email_alert.html")
        return template.render(
            alert_title=f"New {signal_data['signal_level'].title()} Priority Signal",
            severity=signal_data['signal_level'],
            product_name=signal_data['product_name'],
            product_set=signal_data.get('product_set'),
            current_price=signal_data.get('current_price'),
            market_avg_price=signal_data.get('market_avg_price'),
            deal_score=signal_data.get('deal_score'),
            description=signal_data.get('description'),
            dashboard_url=settings.FRONTEND_URL
        )
    
    def _render_digest_email(self, signals: List[Dict[str, Any]]) -> str:
        """Render daily digest email template"""
        template = jinja_env.get_template("email_digest.html")
        return template.render(
            date=datetime.utcnow().strftime("%B %d, %Y"),
            signal_count=len(signals),
            signals=signals,
            dashboard_url=settings.FRONTEND_URL
        )
