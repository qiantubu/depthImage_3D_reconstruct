/** API service layer for communicating with the backend */

import axios from 'axios';
import type { ReconstructResponse, ReconstructParams } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for reconstruction
});

/**
 * Upload a depth image and trigger 3D reconstruction.
 */
export async function reconstruct(
  file: File,
  params: ReconstructParams
): Promise<ReconstructResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('voxel_size', params.voxel_size.toString());
  formData.append('poisson_depth', params.poisson_depth.toString());

  const response = await api.post<ReconstructResponse>('/reconstruct', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

/**
 * Get download URL for reconstructed files.
 */
export function getDownloadUrl(jobId: string, fileType: 'ply' | 'obj'): string {
  return `/api/download/${jobId}/${fileType}`;
}

/**
 * Check backend health.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data.status === 'ok';
  } catch {
    return false;
  }
}
