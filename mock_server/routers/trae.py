"""Trae API Router

Mock endpoints for Trae API:
- GET /token-usage - Return token usage data
- GET /ai-suggestions - Return AI suggestions data
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from data_generators.trae_generator import TraeDataGenerator

router = APIRouter(tags=["Trae"])

# Initialize data generator
generator = TraeDataGenerator()


# Response Models
class TokenCount(BaseModel):
    input: int
    output: int
    total: int


class CostInfo(BaseModel):
    currency: str
    amount: float


class TokenMetadata(BaseModel):
    file_extension: str
    lines_of_code: int
    context_length: int


class TokenUsageResponse(BaseModel):
    id: str
    user_id: str
    session_id: str
    model: str
    timestamp: str
    tokens: TokenCount
    cost: CostInfo
    request_type: str
    language: str
    latency_ms: int
    status: str
    metadata: TokenMetadata


class ContextInfo(BaseModel):
    file_path: str
    line_start: int
    line_end: int
    language: str
    cursor_position: int


class SuggestionContent(BaseModel):
    original_code: str
    suggested_code: str
    explanation: str
    confidence_score: float


class UserFeedback(BaseModel):
    rating: Optional[int]
    comment: str


class SuggestionMetrics(BaseModel):
    time_to_accept_ms: Optional[int]
    edit_distance: int
    tokens_generated: int


class AISuggestionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    status: str
    created_at: str
    completed_at: Optional[str]
    model: str
    context: ContextInfo
    suggestion: SuggestionContent
    user_feedback: UserFeedback
    metrics: SuggestionMetrics


class TokenUsageSummary(BaseModel):
    """Summary of token usage statistics"""
    total_requests: int
    total_tokens_input: int
    total_tokens_output: int
    total_cost: float
    average_latency_ms: float
    success_rate: float


@router.get(
    "/token-usage",
    response_model=list[TokenUsageResponse],
    summary="Get token usage data",
    description="Get token usage records with optional filtering",
)
async def get_token_usage(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
    model: Optional[str] = Query(None, description="Filter by AI model"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get token usage records

    Args:
        user_id: Filter by user ID
        start_date: Filter records after this date
        end_date: Filter records before this date
        model: Filter by AI model name
        per_page: Number of results per page
        page: Current page number
    """
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None

    records = generator.generate_token_usage(
        count=per_page * 2,
        user_id=user_id,
        start_date=start,
        end_date=end,
    )

    # Filter by model if specified
    if model:
        records = [r for r in records if r["model"] == model]

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return records[start_idx:end_idx]


@router.get(
    "/token-usage/summary",
    response_model=TokenUsageSummary,
    summary="Get token usage summary",
    description="Get aggregated statistics for token usage",
)
async def get_token_usage_summary(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
):
    """Get token usage summary statistics

    Args:
        user_id: Filter by user ID
        start_date: Filter records after this date
        end_date: Filter records before this date
    """
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None

    records = generator.generate_token_usage(
        count=100,
        user_id=user_id,
        start_date=start,
        end_date=end,
    )

    total_requests = len(records)
    total_input = sum(r["tokens"]["input"] for r in records)
    total_output = sum(r["tokens"]["output"] for r in records)
    total_cost = sum(r["cost"]["amount"] for r in records)
    avg_latency = sum(r["latency_ms"] for r in records) / total_requests if total_requests > 0 else 0
    success_count = sum(1 for r in records if r["status"] == "success")
    success_rate = success_count / total_requests if total_requests > 0 else 0

    return {
        "total_requests": total_requests,
        "total_tokens_input": total_input,
        "total_tokens_output": total_output,
        "total_cost": round(total_cost, 6),
        "average_latency_ms": round(avg_latency, 2),
        "success_rate": round(success_rate, 4),
    }


@router.get(
    "/ai-suggestions",
    response_model=list[AISuggestionResponse],
    summary="Get AI suggestions",
    description="Get AI suggestion records with optional filtering",
)
async def get_ai_suggestions(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    suggestion_type: Optional[str] = Query(None, description="Filter by suggestion type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    """Get AI suggestion records

    Args:
        user_id: Filter by user ID
        suggestion_type: Filter by suggestion type
        status: Filter by status (accepted, rejected, pending, ignored)
        per_page: Number of results per page
        page: Current page number
    """
    suggestions = generator.generate_ai_suggestions(
        count=per_page * 2,
        user_id=user_id,
        suggestion_type=suggestion_type,
    )

    # Filter by status if specified
    if status:
        suggestions = [s for s in suggestions if s["status"] == status]

    # Simple pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return suggestions[start_idx:end_idx]


@router.get(
    "/ai-suggestions/{suggestion_id}",
    response_model=AISuggestionResponse,
    summary="Get AI suggestion details",
    description="Get details of a specific AI suggestion",
)
async def get_ai_suggestion(
    suggestion_id: str,
):
    """Get AI suggestion details

    Args:
        suggestion_id: The ID of the suggestion
    """
    suggestions = generator.generate_ai_suggestions(count=50)
    for sug in suggestions:
        if sug["id"] == suggestion_id:
            return sug

    # Return first suggestion if not found (mock behavior)
    return suggestions[0]


@router.get(
    "/ai-suggestions/stats",
    summary="Get AI suggestions statistics",
    description="Get aggregated statistics for AI suggestions",
)
async def get_ai_suggestions_stats(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
):
    """Get AI suggestions statistics

    Args:
        user_id: Filter by user ID
    """
    suggestions = generator.generate_ai_suggestions(count=100, user_id=user_id)

    # Calculate statistics
    total = len(suggestions)
    accepted = sum(1 for s in suggestions if s["status"] == "accepted")
    rejected = sum(1 for s in suggestions if s["status"] == "rejected")
    pending = sum(1 for s in suggestions if s["status"] == "pending")
    ignored = sum(1 for s in suggestions if s["status"] == "ignored")

    # By type
    by_type = {}
    for s in suggestions:
        t = s["type"]
        if t not in by_type:
            by_type[t] = {"total": 0, "accepted": 0}
        by_type[t]["total"] += 1
        if s["status"] == "accepted":
            by_type[t]["accepted"] += 1

    # Average confidence score
    avg_confidence = sum(s["suggestion"]["confidence_score"] for s in suggestions) / total if total > 0 else 0

    return {
        "total_suggestions": total,
        "by_status": {
            "accepted": accepted,
            "rejected": rejected,
            "pending": pending,
            "ignored": ignored,
        },
        "acceptance_rate": round(accepted / total, 4) if total > 0 else 0,
        "by_type": by_type,
        "average_confidence": round(avg_confidence, 4),
    }
