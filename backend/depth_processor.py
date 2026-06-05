"""Depth map loading and preprocessing module."""

import cv2
import numpy as np


def load_depth(image_bytes: bytes) -> np.ndarray:
    """
    Load a depth image from bytes, convert to grayscale, and normalize to [0, 1].
    
    Args:
        image_bytes: Raw bytes of the uploaded image file.
    
    Returns:
        Normalized depth map as HxW float64 array in range [0, 1].
    """
    # Decode image from memory buffer
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image. Ensure it is a valid PNG or JPG.")
    
    # Convert to grayscale if needed
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.astype(np.uint8)
    
    # Normalize to [0, 1]
    depth = gray.astype(np.float64) / 255.0
    return depth


def resize_depth(depth: np.ndarray, max_width: int = 640, max_height: int = 480) -> np.ndarray:
    """
    Resize depth map if it exceeds maximum dimensions.
    
    Args:
        depth: HxW depth map.
        max_width: Maximum allowed width.
        max_height: Maximum allowed height.
    
    Returns:
        Resized depth map (or original if within limits).
    """
    h, w = depth.shape
    if w <= max_width and h <= max_height:
        return depth
    
    # Compute scale factor
    scale = min(max_width / w, max_height / h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(depth, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized
