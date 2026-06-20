import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_conn
from deps import get_current_user

router = APIRouter()


def row_to_file(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"],
        "checklistTemplateIds": json.loads(row["checklist_template_ids"]) if row["checklist_template_ids"] else [],
        "captureCount": row["capture_count"],
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
        "deletedAt": row["deleted_at"].isoformat() if row.get("deleted_at") else None,
    }


class CreateFileBody(BaseModel):
    id: str
    name: str
    slug: str
    checklistTemplateIds: List[str] = []
    createdAt: str


class UpdateFileBody(BaseModel):
    checklistTemplateIds: Optional[List[str]] = None


@router.get("")
def list_files(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM files WHERE user_id = %s AND deleted_at IS NULL ORDER BY created_at DESC",
            (user["userId"],)
        )
        return [row_to_file(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/trash")
def list_trash(user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM files WHERE user_id = %s AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
            (user["userId"],)
        )
        return [row_to_file(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.post("", status_code=201)
def create_file(body: CreateFileBody, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """INSERT INTO files (id, user_id, name, slug, checklist_template_ids, capture_count)
               VALUES (%s, %s, %s, %s, %s, 0)""",
            (body.id, user["userId"], body.name, body.slug,
             json.dumps(body.checklistTemplateIds))
        )
        conn.commit()
        cur.execute("SELECT * FROM files WHERE id = %s", (body.id,))
        return row_to_file(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/{file_id}")
def update_file(file_id: str, body: UpdateFileBody, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        if body.checklistTemplateIds is not None:
            cur.execute(
                "UPDATE files SET checklist_template_ids = %s, updated_at = NOW() WHERE id = %s AND user_id = %s",
                (json.dumps(body.checklistTemplateIds), file_id, user["userId"])
            )
            conn.commit()
        cur.execute("SELECT * FROM files WHERE id = %s AND user_id = %s", (file_id, user["userId"]))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "File not found")
        return row_to_file(row)
    finally:
        cur.close()
        conn.close()


@router.delete("/{file_id}")
def soft_delete_file(file_id: str, user=Depends(get_current_user)):
    """Move to recycle bin (soft delete)."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE files SET deleted_at = NOW() WHERE id = %s AND user_id = %s AND deleted_at IS NULL",
            (file_id, user["userId"])
        )
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()


@router.post("/{file_id}/restore")
def restore_file(file_id: str, user=Depends(get_current_user)):
    """Restore from recycle bin."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE files SET deleted_at = NULL WHERE id = %s AND user_id = %s",
            (file_id, user["userId"])
        )
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()


@router.delete("/{file_id}/permanent")
def permanent_delete_file(file_id: str, user=Depends(get_current_user)):
    """Hard delete — only works on already-trashed files."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM files WHERE id = %s AND user_id = %s AND deleted_at IS NOT NULL",
            (file_id, user["userId"])
        )
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()
