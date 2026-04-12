"""
User feedback — delivered to FEEDBACK_INBOX_EMAIL when email is configured,
always logged server-side.
"""

import logging
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.core.email import send_feedback_inbox_email
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Feedback"])


class FeedbackSubmit(BaseModel):
    type: Literal["idea", "bug", "other"]
    message: str = Field(..., min_length=1, max_length=8000)


class FeedbackResponse(BaseModel):
    ok: bool = True
    email_sent: bool = False


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    body: FeedbackSubmit,
    current_user: User = Depends(get_current_user),
):
    submitter = current_user.email
    logger.info(
        "Feedback: type=%s user=%s message_preview=%s",
        body.type,
        submitter,
        body.message[:500].replace("\n", " "),
    )
    sent = send_feedback_inbox_email(
        submitter_email=submitter,
        feedback_type=body.type,
        message=body.message.strip(),
    )
    return FeedbackResponse(ok=True, email_sent=sent)
