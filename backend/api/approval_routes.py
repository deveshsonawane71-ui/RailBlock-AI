"""
Approval Routes — API endpoints for the human-in-the-loop approval workflow.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api", tags=["approvals"])

_state = {}


def init_state(state: dict):
    global _state
    _state = state


class ApprovalAction(BaseModel):
    approved_by: str = "Section Controller"
    comment: Optional[str] = None


class RejectAction(BaseModel):
    rejected_by: str = "Section Controller"
    reason: str = "Schedule conflict"


class ModifyAction(BaseModel):
    new_start_time: Optional[str] = None
    new_end_time: Optional[str] = None
    modified_by: str = "Section Controller"
    comment: Optional[str] = None


@router.get("/approvals/pending")
def get_pending_approvals():
    """List all blocks awaiting approval."""
    current = _state.get("current_schedule")
    if not current:
        return []

    pending = [b.model_dump() for b in current.blocks if b.status == "Proposed"]
    return pending


@router.get("/approvals/history")
def get_approval_history():
    """List all approved/rejected blocks."""
    current = _state.get("current_schedule")
    if not current:
        return []

    history = [
        b.model_dump() for b in current.blocks
        if b.status in ("Approved", "Rejected")
    ]
    return history


@router.post("/approvals/{block_id}/approve")
def approve_block(block_id: str, action: ApprovalAction = ApprovalAction()):
    """Approve a proposed block."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No schedule available."}

    for block in current.blocks:
        if block.block_id == block_id:
            block.status = "Approved"
            block.approved_by = action.approved_by
            block.approved_at = datetime.now().isoformat()
            return {"status": "approved", "block": block.model_dump()}

    return {"error": f"Block {block_id} not found."}


@router.post("/approvals/{block_id}/reject")
def reject_block(block_id: str, action: RejectAction = RejectAction()):
    """Reject a proposed block with reason."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No schedule available."}

    for block in current.blocks:
        if block.block_id == block_id:
            block.status = "Rejected"
            block.rejection_reason = action.reason
            return {"status": "rejected", "block": block.model_dump()}

    return {"error": f"Block {block_id} not found."}


@router.post("/approvals/{block_id}/modify")
def modify_block(block_id: str, action: ModifyAction = ModifyAction()):
    """Modify a block's timing."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No schedule available."}

    for block in current.blocks:
        if block.block_id == block_id:
            if action.new_start_time:
                block.start_time = action.new_start_time
            if action.new_end_time:
                block.end_time = action.new_end_time
                # Recalculate duration
                try:
                    start = datetime.fromisoformat(block.start_time)
                    end = datetime.fromisoformat(action.new_end_time)
                    block.duration_min = int((end - start).total_seconds() / 60)
                except (ValueError, TypeError):
                    pass
            block.status = "Proposed"  # Back to proposed after modification
            return {"status": "modified", "block": block.model_dump()}

    return {"error": f"Block {block_id} not found."}


@router.post("/approvals/approve-all")
def approve_all(action: ApprovalAction = ApprovalAction()):
    """Approve all pending blocks at once."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No schedule available."}

    count = 0
    for block in current.blocks:
        if block.status == "Proposed":
            block.status = "Approved"
            block.approved_by = action.approved_by
            block.approved_at = datetime.now().isoformat()
            count += 1

    return {"status": "approved", "count": count}
