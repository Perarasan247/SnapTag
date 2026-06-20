from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_conn
from deps import get_current_user

router = APIRouter()


def row_to_capture(row: dict) -> dict:
    gps = None
    if row.get("gps_lat") is not None:
        gps = {
            "latitude": row["gps_lat"],
            "longitude": row["gps_lng"],
            "altitude": row["gps_alt"],
        }
    return {
        "id": row["id"],
        "fileId": row["file_id"],
        "filename": row["filename"],
        "type": row["media_type"],
        "tag": row["tag"] or "",
        "notes": row["notes"] or "",
        "content": row.get("content") or "",
        "unit": row.get("unit") or "",
        "gps": gps,
        "s3DataKey": row["s3_data_key"],
        "s3MetadataKey": row["s3_metadata_key"],
        "fileSlug": row["file_slug"],
        "fileName": row["file_name"],
        "uploadStatus": row["upload_status"],
        "localUri": row["local_uri"],
        "capturedAt": row["captured_at"].isoformat() if row["captured_at"] else None,
        "uploadedAt": row["uploaded_at"].isoformat() if row["uploaded_at"] else None,
        "deviceId": row["device_id"],
    }


class SaveCaptureBody(BaseModel):
    id: str
    fileId: str
    filename: str
    type: str
    tag: Optional[str] = ""
    notes: Optional[str] = ""
    content: Optional[str] = ""
    unit: Optional[str] = ""
    gps: Optional[dict] = None
    s3DataKey: Optional[str] = None
    s3MetadataKey: Optional[str] = None
    fileSlug: Optional[str] = None
    fileName: Optional[str] = None
    uploadStatus: str = "local"
    localUri: Optional[str] = None
    capturedAt: str
    deviceId: Optional[str] = None


class UpdateCaptureBody(BaseModel):
    uploadStatus: Optional[str] = None
    uploadedAt: Optional[str] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    content: Optional[str] = None
    unit: Optional[str] = None


@router.get("")
def list_captures(file_id: str, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM captures WHERE file_id = %s AND user_id = %s ORDER BY captured_at DESC",
            (file_id, user["userId"])
        )
        return [row_to_capture(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.post("", status_code=201)
def save_capture(body: SaveCaptureBody, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        gps_lat = body.gps.get("latitude") if body.gps else None
        gps_lng = body.gps.get("longitude") if body.gps else None
        gps_alt = body.gps.get("altitude") if body.gps else None

        cur.execute("""
            INSERT INTO captures
              (id, file_id, user_id, filename, media_type, tag, notes, content, unit,
               gps_lat, gps_lng, gps_alt, s3_data_key, s3_metadata_key,
               file_slug, file_name, upload_status, local_uri, device_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            body.id, body.fileId, user["userId"], body.filename, body.type,
            body.tag, body.notes, body.content, body.unit,
            gps_lat, gps_lng, gps_alt,
            body.s3DataKey, body.s3MetadataKey, body.fileSlug, body.fileName,
            body.uploadStatus, body.localUri, body.deviceId
        ))
        # Auto-increment file capture count
        cur.execute(
            "UPDATE files SET capture_count = capture_count + 1, updated_at = NOW() WHERE id = %s AND user_id = %s",
            (body.fileId, user["userId"])
        )
        conn.commit()
        cur.execute("SELECT * FROM captures WHERE id = %s", (body.id,))
        return row_to_capture(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/{capture_id}")
def update_capture(capture_id: str, body: UpdateCaptureBody, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        sets, params = [], []
        if body.uploadStatus is not None:
            sets.append("upload_status = %s"); params.append(body.uploadStatus)
        if body.uploadedAt is not None:
            sets.append("uploaded_at = %s"); params.append(body.uploadedAt)
        if body.tag is not None:
            sets.append("tag = %s"); params.append(body.tag)
        if body.notes is not None:
            sets.append("notes = %s"); params.append(body.notes)
        if body.content is not None:
            sets.append("content = %s"); params.append(body.content)
        if body.unit is not None:
            sets.append("unit = %s"); params.append(body.unit)
        if sets:
            params.extend([capture_id, user["userId"]])
            cur.execute(
                f"UPDATE captures SET {', '.join(sets)} WHERE id = %s AND user_id = %s",
                params
            )
            conn.commit()
        cur.execute("SELECT * FROM captures WHERE id = %s AND user_id = %s", (capture_id, user["userId"]))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Capture not found")
        return row_to_capture(row)
    finally:
        cur.close()
        conn.close()


@router.delete("/{capture_id}")
def delete_capture(capture_id: str, user=Depends(get_current_user)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT file_id FROM captures WHERE id = %s AND user_id = %s", (capture_id, user["userId"]))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Capture not found")
        file_id = row["file_id"]
        cur.execute("DELETE FROM captures WHERE id = %s AND user_id = %s", (capture_id, user["userId"]))
        cur.execute(
            "UPDATE files SET capture_count = GREATEST(capture_count - 1, 0), updated_at = NOW() WHERE id = %s",
            (file_id,)
        )
        conn.commit()
        return {"ok": True}
    finally:
        cur.close()
        conn.close()
