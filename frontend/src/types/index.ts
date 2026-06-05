/** TypeScript type definitions for the Depth-to-3D application */

export interface ReconstructResponse {
  success: boolean;
  job_id: string;
  pointcloud: {
    points: number[][];     // [[x,y,z], ...]
    colors: number[][];     // [[r,g,b], ...]
    vertex_count: number;
  };
  mesh: {
    obj_data: string;       // OBJ format string
    face_count: number;
    vertex_count: number;
  };
  stats: {
    depth_size: [number, number];
    raw_points: number;
    filtered_points: number;
    mesh_faces: number;
    timing: {
      pointcloud_ms: number;
      normal_ms: number;
      poisson_ms: number;
      total_ms: number;
    };
  };
}

export type ViewMode = 'pointcloud' | 'mesh' | 'wireframe';

export interface ReconstructParams {
  voxel_size: number;
  poisson_depth: number;
}
