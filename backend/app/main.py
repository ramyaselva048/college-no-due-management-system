from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.routers import (
    auth, student, due_records, no_due_requests,
    no_due_approvals, certificates, notifications, admin, staff
)
from backend.app.seed import seed_initial_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("college_nodue")

app = FastAPI(
    title="College No Due Management System API",
    description="Centralized REST API for managing student clearance workflows across departments, due records, digital approvals, and authenticated PDF certificates.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the system administrator."}
    )

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "College No Due API",
        "database": "connected"
    }

# Include all modular routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(student.router, prefix="/api")
app.include_router(due_records.router, prefix="/api")
app.include_router(no_due_requests.router, prefix="/api")
app.include_router(no_due_approvals.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(staff.router, prefix="/api")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database tables and schema...")
    # Initialize tables if not existing
    Base.metadata.create_all(bind=engine)
    # Seed initial departments, courses, due categories and test accounts if empty
    seed_initial_data()
    logger.info("Startup complete. System ready.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8001, reload=True)
