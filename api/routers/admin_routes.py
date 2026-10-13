"""Admin: registration approval, org/user management, subscriptions."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from api.auth import public_user, require_admin
from api.database import db
from api.schemas import (
    ApproveUserRequest,
    CreateOrgRequest,
    MessageResponse,
    OrgResponse,
    SubscriptionRequest,
    UpdateUserRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users/pending")
def list_pending_users(_: dict = Depends(require_admin)):
    users = db.list_users(status="pending")
    return [public_user(u) for u in users]


@router.get("/users")
def list_users(
    status: Optional[str] = None,
    org_id: Optional[int] = None,
    _: dict = Depends(require_admin),
):
    return [public_user(u) for u in db.list_users(status=status, org_id=org_id)]


@router.post("/users/{user_id}/approval", response_model=MessageResponse)
def approve_user(
    user_id: int,
    body: ApproveUserRequest,
    _: dict = Depends(require_admin),
):
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")

    fields = {"status": body.status}
    if body.org_id is not None:
        if not db.get_organization(body.org_id):
            raise HTTPException(status_code=404, detail="Organization not found")
        fields["org_id"] = body.org_id
    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="role must be 'user' or 'admin'")
        fields["role"] = body.role

    db.update_user(user_id, **fields)
    return MessageResponse(message=f"User {user_id} set to status '{body.status}'")


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    _: dict = Depends(require_admin),
):
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    fields = body.model_dump(exclude_unset=True)
    if "role" in fields and fields["role"] not in ("user", "admin", None):
        raise HTTPException(status_code=400, detail="Invalid role")
    if "status" in fields and fields["status"] not in (
        "pending",
        "approved",
        "rejected",
        None,
    ):
        raise HTTPException(status_code=400, detail="Invalid status")
    if fields.get("org_id") is not None and not db.get_organization(fields["org_id"]):
        raise HTTPException(status_code=404, detail="Organization not found")

    updated = db.update_user(user_id, **fields)
    return public_user(updated)


@router.post("/organizations", response_model=OrgResponse, status_code=201)
def create_org(body: CreateOrgRequest, _: dict = Depends(require_admin)):
    try:
        org = db.create_organization(body.name.strip())
    except Exception as exc:
        raise HTTPException(status_code=409, detail=f"Could not create org: {exc}") from exc
    return OrgResponse(**org)


@router.get("/organizations", response_model=list[OrgResponse])
def list_orgs(_: dict = Depends(require_admin)):
    return [OrgResponse(**o) for o in db.list_organizations()]


@router.post("/organizations/{org_id}/subscription", response_model=OrgResponse)
def set_subscription(
    org_id: int,
    body: SubscriptionRequest,
    _: dict = Depends(require_admin),
):
    if body.status not in ("active", "inactive", "expired"):
        raise HTTPException(
            status_code=400,
            detail="status must be active | inactive | expired",
        )
    org = db.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    updated = db.update_subscription(org_id, body.status, body.expires_at)
    return OrgResponse(**updated)


@router.get("/organizations/{org_id}", response_model=OrgResponse)
def get_org(org_id: int, _: dict = Depends(require_admin)):
    org = db.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgResponse(**org)
