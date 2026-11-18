"""
InvenEasy API - Punto de entrada principal
"""
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import health, images

# Consolas de Windows (cp1252) no soportan emojis: forzar UTF-8 sin romper si falla
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend de InvenEasy - App de orden y crecimiento personal",
)

# CORS - permitir frontend en desarrollo y producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:4173",  # Vite preview
        "capacitor://localhost",  # Capacitor Android (androidScheme: capacitor)
        "http://localhost",       # Capacitor fallback
        "https://localhost",      # Capacitor Android (androidScheme: https)
        "https://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(health.router)
app.include_router(images.router)


@app.on_event("startup")
async def startup_event():
    print(f"🚀 {settings.app_name} iniciado")
    print(f"📡 Supabase: {'✅ Configurado' if settings.supabase_url else '❌ Sin configurar'}")
    print(f"☁️  Cloudinary: {'✅ Configurado' if settings.cloudinary_cloud_name else '❌ Sin configurar'}")
