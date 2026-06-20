import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import init_db
from routers import auth, files, captures, checklists


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SnapTag API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Chrome Private Network Access — lets localhost pages call LAN IPs (192.168.x.x)
@app.middleware("http")
async def private_network_access(request: Request, call_next):
    if request.method == "OPTIONS":
        res = JSONResponse(content={}, status_code=200)
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Methods"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "*"
        res.headers["Access-Control-Allow-Private-Network"] = "true"
        return res
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


app.include_router(auth.router,       prefix="/auth")
app.include_router(files.router,      prefix="/files")
app.include_router(captures.router,   prefix="/captures")
app.include_router(checklists.router, prefix="/checklists")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 3001)), reload=False)
