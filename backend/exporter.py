"""Export modules for point cloud (PLY) and mesh (OBJ) files."""

import numpy as np
import open3d as o3d


def export_ply(points: list, colors: list) -> str:
    """
    Export point cloud data as a PLY format string.
    
    Args:
        points: List of [x, y, z] point coordinates.
        colors: List of [r, g, b] color values in [0, 1].
    
    Returns:
        PLY format string.
    """
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(np.array(points))
    pcd.colors = o3d.utility.Vector3dVector(np.array(colors))
    
    # Use Open3D's built-in PLY export
    ply_str = o3d.io.write_point_cloud_to_string(pcd)
    return ply_str


def export_obj(obj_data: str) -> str:
    """
    Return the OBJ mesh data as-is (already in OBJ format from reconstructor).
    
    Args:
        obj_data: OBJ format string from the reconstruction pipeline.
    
    Returns:
        OBJ format string.
    """
    return obj_data
