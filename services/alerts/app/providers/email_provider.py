"""
Email Provider Abstraction
Supports SendGrid and SMTP for sending alert emails
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass

import httpx
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

from app.config import settings


logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """Email message data structure"""
    to_email: str
    to_name: Optional[str] = None
    subject: str = ""
    html_content: str = ""
    text_content: Optional[str] = None


class EmailProvider(ABC):
    """Abstract base class for email providers"""
    
    @abstractmethod
    async def send_email(self, message: EmailMessage) -> tuple[bool, Optional[str]]:
        """
        Send an email
        
        Returns:
            (success: bool, message_id: Optional[str])
        """
        pass


class SendGridProvider(EmailProvider):
    """SendGrid email provider implementation"""
    
    def __init__(self, api_key: str, from_email: str, from_name: str):
        self.api_key = api_key
        self.from_email = from_email
        self.from_name = from_name
        self.client = SendGridAPIClient(api_key)
        logger.info(f"SendGrid provider initialized: from={from_email}")
    
    async def send_email(self, message: EmailMessage) -> tuple[bool, Optional[str]]:
        """Send email via SendGrid API"""
        try:
            # Create SendGrid message
            from_email_obj = Email(self.from_email, self.from_name)
            to_email_obj = To(message.to_email, message.to_name)
            content = Content("text/html", message.html_content)
            
            mail = Mail(
                from_email=from_email_obj,
                to_emails=to_email_obj,
                subject=message.subject,
                html_content=content
            )
            
            # Send email
            if settings.DRY_RUN:
                logger.info(f"[DRY RUN] Would send email to {message.to_email}: {message.subject}")
                return True, "dry-run-message-id"
            
            response = self.client.send(mail)
            message_id = response.headers.get("X-Message-Id", "unknown")
            
            logger.info(f"✅ Email sent via SendGrid to {message.to_email}: {message.subject} (ID: {message_id})")
            return True, message_id
            
        except Exception as e:
            logger.error(f"❌ SendGrid email failed to {message.to_email}: {str(e)}")
            return False, None


class SMTPProvider(EmailProvider):
    """SMTP email provider implementation (e.g., Gmail, custom SMTP)"""
    
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str,
        from_name: str,
        use_tls: bool = True
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.from_name = from_name
        self.use_tls = use_tls
        logger.info(f"SMTP provider initialized: {host}:{port}, from={from_email}")
    
    async def send_email(self, message: EmailMessage) -> tuple[bool, Optional[str]]:
        """Send email via SMTP"""
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = message.subject
            msg["From"] = formataddr((self.from_name, self.from_email))
            msg["To"] = formataddr((message.to_name or "", message.to_email))
            
            # Add plain text and HTML parts
            if message.text_content:
                part1 = MIMEText(message.text_content, "plain")
                msg.attach(part1)
            
            part2 = MIMEText(message.html_content, "html")
            msg.attach(part2)
            
            if settings.DRY_RUN:
                logger.info(f"[DRY RUN] Would send SMTP email to {message.to_email}: {message.subject}")
                return True, "dry-run-smtp-id"
            
            # Send email
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"✅ Email sent via SMTP to {message.to_email}: {message.subject}")
            return True, f"smtp-{message.to_email}"
            
        except Exception as e:
            logger.error(f"❌ SMTP email failed to {message.to_email}: {str(e)}")
            return False, None


def get_email_provider() -> EmailProvider:
    """
    Factory function to get configured email provider
    
    Returns:
        Configured EmailProvider instance
    
    Raises:
        ValueError: If configuration is invalid
    """
    if settings.EMAIL_PROVIDER == "sendgrid":
        if not settings.SENDGRID_API_KEY:
            raise ValueError("SENDGRID_API_KEY is required for SendGrid provider")
        return SendGridProvider(
            api_key=settings.SENDGRID_API_KEY,
            from_email=settings.SENDGRID_FROM_EMAIL,
            from_name=settings.SENDGRID_FROM_NAME
        )
    
    elif settings.EMAIL_PROVIDER == "smtp":
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD are required for SMTP provider")
        return SMTPProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            from_email=settings.SMTP_FROM_EMAIL,
            from_name=settings.SMTP_FROM_NAME,
            use_tls=settings.SMTP_USE_TLS
        )
    
    else:
        raise ValueError(f"Unknown email provider: {settings.EMAIL_PROVIDER}")
