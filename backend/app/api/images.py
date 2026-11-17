"""
Endpoints para manejo de imágenes con Cloudinary
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import get_settings
import traceback

router = APIRouter(prefix="/api", tags=["images"])


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Sube una imagen a Cloudinary y devuelve la URL optimizada.
    """
    settings = get_settings()

    if not settings.cloudinary_cloud_name:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary no está configurado. Añade las variables de entorno.",
        )

    # Validar tamaño (máx 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede pesar más de 10MB")

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
        )

        result = cloudinary.uploader.upload(
            contents,
            folder="inveneasy",
            resource_type="auto",
        )

        return {
            "image_url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")


@router.delete("/delete-image/{public_id:path}")
async def delete_image(public_id: str):
    """Elimina una imagen de Cloudinary por su public_id"""
    settings = get_settings()

    if not settings.cloudinary_cloud_name:
        raise HTTPException(status_code=503, detail="Cloudinary no está configurado")

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
        )

        result = cloudinary.uploader.destroy(public_id)
        return {"result": result.get("result", "not found")}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al eliminar imagen: {str(e)}")
