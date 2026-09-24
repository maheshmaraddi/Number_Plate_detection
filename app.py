import os
from io import BytesIO
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


app = FastAPI(
    title="License Plate Detector",
    description="License plate detection using FastAPI and Ultralytics.",
    version="1.0.0",
)


app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)


templates = Jinja2Templates(
    directory=BASE_DIR / "templates"
)


PREDICTION_URL = os.getenv(
    "ULTRALYTICS_PREDICTION_URL",
    "https://predict-6ab4c7438c172e4c03b19e78-dproatj77a-el.a.run.app/predict",
)

API_KEY = os.getenv(
    "ULTRALYTICS_API_KEY",
    "",
).strip()


MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "app_name": "PlateVision AI",
        },
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "api_key_configured": bool(API_KEY),
        "prediction_url": PREDICTION_URL,
    }


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.70),
    imgsz: int = Form(640),
):
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "ULTRALYTICS_API_KEY is missing. "
                "Add it to the .env file."
            ),
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPG, PNG and WEBP images are supported.",
        )

    if not 0 <= conf <= 1:
        raise HTTPException(
            status_code=422,
            detail="Confidence must be between 0 and 1.",
        )

    if not 0 <= iou <= 1:
        raise HTTPException(
            status_code=422,
            detail="IoU must be between 0 and 1.",
        )

    if not 32 <= imgsz <= 2048:
        raise HTTPException(
            status_code=422,
            detail="Image size must be between 32 and 2048.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must be 10 MB or smaller.",
        )

    request_files = {
        "file": (
            file.filename or "image.jpg",
            BytesIO(image_bytes),
            file.content_type or "image/jpeg",
        )
    }

    request_data = {
        "conf": str(conf),
        "iou": str(iou),
        "imgsz": str(imgsz),
    }

    request_headers = {
        "Authorization": f"Bearer {API_KEY}",
    }

    try:
        timeout = httpx.Timeout(
            connect=30.0,
            read=120.0,
            write=30.0,
            pool=30.0,
        )

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                PREDICTION_URL,
                headers=request_headers,
                data=request_data,
                files=request_files,
            )

    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=504,
            detail="The inference server timed out.",
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to the inference server: {error}",
        ) from error

    if response.is_error:
        try:
            remote_error = response.json()
        except ValueError:
            remote_error = response.text[:1000]

        raise HTTPException(
            status_code=response.status_code,
            detail={
                "message": "Ultralytics prediction failed.",
                "remote_error": remote_error,
            },
        )

    try:
        return response.json()

    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail="The inference server returned a non-JSON response.",
        ) from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )