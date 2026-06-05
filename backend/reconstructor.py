"""Core 3D reconstruction pipeline: point cloud generation, normals, Poisson mesh."""

import time
import numpy as np
import open3d as o3d


def depth_to_pointcloud(
    depth: np.ndarray,
    depth_scale: float = 500.0,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert a depth map to a 3D point cloud with colors.
    
    Mapping: (u, v, depth) -> (u - w/2, v - h/2, depth * scale)
    Colors: Apply a heatmap colormap based on depth value.
    
    Args:
        depth: HxW normalized depth map, values in [0, 1].
        depth_scale: Scale factor for depth values.
    
    Returns:
        Tuple of (points[N,3], colors[N,3]) as float64 arrays.
    """
    h, w = depth.shape
    
    # Create pixel coordinate grids
    u_coords, v_coords = np.meshgrid(np.arange(w), np.arange(h))
    
    # Flatten
    u = u_coords.ravel().astype(np.float64)
    v = v_coords.ravel().astype(np.float64)
    d = depth.ravel()
    
    # Map to 3D: center the x,y coordinates
    x = u - w / 2.0
    y = v - h / 2.0
    z = d * depth_scale
    
    # Stack into Nx3
    points = np.column_stack([x, y, z])
    
    # Generate heatmap colors based on depth
    # Map depth [0, 1] to a colormap (blue -> cyan -> green -> yellow -> red)
    normalized_depth = d  # Already in [0, 1]
    colors = _depth_colormap(normalized_depth)
    
    return points, colors


def _depth_colormap(values: np.ndarray) -> np.ndarray:
    """
    Map scalar values in [0, 1] to RGB heatmap colors.
    
    Args:
        values: 1D array of values in [0, 1].
    
    Returns:
        Nx3 float64 array of RGB colors in [0, 1].
    """
    n = len(values)
    colors = np.zeros((n, 3), dtype=np.float64)
    
    # Piecewise linear colormap: blue -> cyan -> green -> yellow -> red
    v = np.clip(values, 0, 1)
    
    # Blue to cyan (0 -> 0.25)
    mask = v <= 0.25
    t = v[mask] / 0.25
    colors[mask, 0] = 0.0
    colors[mask, 1] = t
    colors[mask, 2] = 1.0
    
    # Cyan to green (0.25 -> 0.5)
    mask = (v > 0.25) & (v <= 0.5)
    t = (v[mask] - 0.25) / 0.25
    colors[mask, 0] = 0.0
    colors[mask, 1] = 1.0
    colors[mask, 2] = 1.0 - t
    
    # Green to yellow (0.5 -> 0.75)
    mask = (v > 0.5) & (v <= 0.75)
    t = (v[mask] - 0.5) / 0.25
    colors[mask, 0] = t
    colors[mask, 1] = 1.0
    colors[mask, 2] = 0.0
    
    # Yellow to red (0.75 -> 1.0)
    mask = v > 0.75
    t = (v[mask] - 0.75) / 0.25
    colors[mask, 0] = 1.0
    colors[mask, 1] = 1.0 - t
    colors[mask, 2] = 0.0
    
    return colors


def process_pipeline(
    depth: np.ndarray,
    voxel_size: float = 2.0,
    poisson_depth: int = 8,
) -> dict:
    """
    Complete reconstruction pipeline:
    depth -> pointcloud -> downsample -> remove outliers -> normals -> Poisson mesh
    
    Args:
        depth: HxW normalized depth map.
        voxel_size: Voxel size for downsampling.
        poisson_depth: Depth parameter for Poisson reconstruction.
    
    Returns:
        Dictionary containing point cloud data, OBJ mesh string, and statistics.
    """
    timings = {}
    
    # Step 1: Generate point cloud
    t0 = time.time()
    points, colors = depth_to_pointcloud(depth, depth_scale=500.0)
    raw_point_count = len(points)
    timings["pointcloud_ms"] = int((time.time() - t0) * 1000)
    
    # Create Open3D point cloud
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.colors = o3d.utility.Vector3dVector(colors)
    
    # Step 2: Voxel downsample
    t0 = time.time()
    pcd_down = pcd.voxel_down_sample(voxel_size=voxel_size)
    
    # Step 3: Remove statistical outliers
    pcd_filtered, _ = pcd_down.remove_statistical_outlier(
        nb_neighbors=20, std_ratio=2.0
    )
    filtered_point_count = len(pcd_filtered.points)
    timings["normal_ms"] = int((time.time() - t0) * 1000)
    
    # Step 4: Estimate normals
    t0 = time.time()
    pcd_filtered.estimate_normals(
        search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=5.0, max_nn=30)
    )
    # Note: Skipping normal orientation due to Open3D 0.18 segfault on Windows
    # Poisson reconstruction handles normal orientation internally
    normal_time = int((time.time() - t0) * 1000)
    timings["normal_ms"] = timings["normal_ms"] + normal_time
    
    # Step 5: Poisson surface reconstruction
    t0 = time.time()
    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
        pcd_filtered, depth=poisson_depth
    )
    
    # Remove low-density vertices (clean up the mesh)
    if len(densities) > 0:
        density_threshold = np.quantile(densities, 0.1)
        vertices_to_remove = densities < density_threshold
        mesh.remove_vertices_by_mask(vertices_to_remove)
    
    mesh.compute_vertex_normals()
    timings["poisson_ms"] = int((time.time() - t0) * 1000)
    
    # Get filtered point cloud data for visualization
    filtered_points = np.asarray(pcd_filtered.points).tolist()
    filtered_colors = np.asarray(pcd_filtered.colors).tolist()
    
    # Convert mesh to OBJ string
    obj_data = _mesh_to_obj(mesh)
    
    # Stats
    h, w = depth.shape
    timings["total_ms"] = sum(timings.values())
    
    stats = {
        "depth_size": [h, w],
        "raw_points": raw_point_count,
        "filtered_points": filtered_point_count,
        "mesh_faces": len(mesh.triangles),
        "timing": timings,
    }
    
    result = {
        "pointcloud": {
            "points": filtered_points,
            "colors": filtered_colors,
            "vertex_count": filtered_point_count,
        },
        "mesh": {
            "obj_data": obj_data,
            "face_count": len(mesh.triangles),
            "vertex_count": len(mesh.vertices),
        },
        "stats": stats,
    }
    
    return result


def _mesh_to_obj(mesh: o3d.geometry.TriangleMesh) -> str:
    """
    Convert an Open3D TriangleMesh to OBJ format string.
    
    Args:
        mesh: Open3D TriangleMesh object.
    
    Returns:
        OBJ format string.
    """
    lines = ["# Generated by Depth-to-3D Reconstructor\n"]
    
    vertices = np.asarray(mesh.vertices)
    triangles = np.asarray(mesh.triangles)
    normals = np.asarray(mesh.vertex_normals)
    
    # Write vertices
    for v in vertices:
        lines.append(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
    
    # Write vertex normals
    for n in normals:
        lines.append(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")
    
    # Write faces (OBJ is 1-indexed)
    for f in triangles:
        i1, i2, i3 = f[0] + 1, f[1] + 1, f[2] + 1
        lines.append(f"f {i1}//{i1} {i2}//{i2} {i3}//{i3}\n")
    
    return "".join(lines)
