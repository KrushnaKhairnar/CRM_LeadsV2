from fastapi import APIRouter
from app.api.routes import auth, users, leads, notifications, analytics, views, achievements, invoices, admin
from app.api.routes import products

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(views.router, prefix="/views", tags=["views"])
api_router.include_router(achievements.router, prefix="/achievements", tags=["achievements"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
