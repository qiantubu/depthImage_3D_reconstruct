"""FastAPI application entry point with CORS, routes, and file storage."""

import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from depth_processor import load_depth, resize_depth
from reconstructor import process_pipeline
from exporter import export_ply, export_obj

# Storage for generated files (keyed by job ID)
job_store: dict[str, dict] = {}

app = FastAPI(title="Depth-to-3D Reconstructor", version="1.0.0")

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/reconstruct")
async def reconstruct(
    file: UploadFile = File(...),
    voxel_size: float = Form(2.0),
    poisson_depth: int = Form(8),
):
    """
    Reconstruct 3D mesh from an uploaded depth image.
    
    Args:
        file: Uploaded depth image (PNG/JPG).
        voxel_size: Voxel size for downsampling (default 2.0).
        poisson_depth: Depth for Poisson reconstruction (default 8).
    
    Returns:
        JSON with point cloud data, mesh OBJ data, and statistics.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".bmp"):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {ext}. Please upload PNG or JPG."
        )
    
    # Read file bytes
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    try:
        # Load and preprocess depth map
        depth = load_depth(image_bytes)
        depth = resize_depth(depth, max_width=640, max_height=480)
        
        # Run reconstruction pipeline
        result = process_pipeline(
            depth,
            voxel_size=voxel_size,
            poisson_depth=poisson_depth,
        )
        
        # Store result with a job ID for later download
        job_id = str(uuid.uuid4())[:8]
        job_store[job_id] = result
        
        return {
            "success": True,
            "job_id": job_id,
            "pointcloud": result["pointcloud"],
            "mesh": result["mesh"],
            "stats": result["stats"],
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconstruction failed: {str(e)}")


@app.get("/api/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str):
    """
    Download reconstructed files.
    
    Args:
        job_id: Job identifier from reconstruction response.
        file_type: Either 'ply' for point cloud or 'obj' for mesh.
    
    Returns:
        Plain text file download response.
    """
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    result = job_store[job_id]
    
    if file_type == "ply":
        content = export_ply(
            result["pointcloud"]["points"],
            result["pointcloud"]["colors"],
        )
        media_type = "text/plain"
        filename = f"pointcloud_{job_id}.ply"
    elif file_type == "obj":
        content = export_obj(result["mesh"]["obj_data"])
        media_type = "text/plain"
        filename = f"mesh_{job_id}.obj"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type. Use 'ply' or 'obj'.")
    
    return PlainTextResponse(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
