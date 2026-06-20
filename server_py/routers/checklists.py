import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_conn
from deps import get_current_user

router = APIRouter()


def row_to_checklist(row: dict) -> dict:
    return {
        "fileId": row["file_id"],
        "templateIds": json.loads(row["template_ids"]) if row["template_ids"] else [],
        "customItems": json.loads(row["custom_items"]) if row["custom_items"] else [],
        "progress": json.loads(row["progress_data"]) if row["progress_data"] else {},
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
    }


class ChecklistBody(BaseModel):
    templateIds: list = []
    customItems: list = []
    progress: dict = {}
    completedAt: Optional[str] = None


@router.get("/{file_id}")
def get_checklist(file_id: str, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM checklists WHERE file_id = %s AND user_id = %s",
            (file_id, user["userId"])
        )
        row = cur.fetchone()
        return row_to_checklist(row) if row else None
    finally:
        cur.close()
        conn.close()


@router.put("/{file_id}")
def upsert_checklist(file_id: str, body: ChecklistBody, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        completed = body.completedAt if body.completedAt else None
        cur.execute("""
            INSERT INTO checklists (file_id, user_id, template_ids, custom_items, progress_data, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
              template_ids  = VALUES(template_ids),
              custom_items  = VALUES(custom_items),
              progress_data = VALUES(progress_data),
              completed_at  = VALUES(completed_at)
        """, (
            file_id, user["userId"],
            json.dumps(body.templateIds),
            json.dumps(body.customItems),
            json.dumps(body.progress),
            completed
        ))
        conn.commit()
        cur.execute("SELECT * FROM checklists WHERE file_id = %s", (file_id,))
        return row_to_checklist(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        cur.close()
        conn.close()
