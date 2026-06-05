/** Custom hook for managing reconstruction state and API calls */

import { useState, useCallback } from 'react';
import type { ReconstructResponse, ReconstructParams, ViewMode } from '../types';
import { reconstruct, getDownloadUrl } from '../services/api';

interface UseReconstructReturn {
  /** Current reconstruction result */
  result: ReconstructResponse | null;
  /** Whether a reconstruction is in progress */
  loading: boolean;
  /** Error message if reconstruction failed */
  error: string | null;
  /** Current view mode for the 3D viewer */
  viewMode: ViewMode;
  /** Uploaded file reference */
  uploadedFile: File | null;
  /** Data URL for the uploaded image preview */
  imagePreview: string | null;
  /** Trigger reconstruction with the given file and params */
  startReconstruction: (file: File, params: ReconstructParams) => Promise<void>;
  /** Set the view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Set the uploaded file and generate preview */
  setUploadedFile: (file: File | null) => void;
  /** Get download link for PLY or OBJ */
  getDownload: (fileType: 'ply' | 'obj') => string | null;
  /** Reset all state */
  reset: () => void;
}

export function useReconstruct(): UseReconstructReturn {
  const [result, setResult] = useState<ReconstructResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pointcloud');
  const [uploadedFile, setUploadedFileState] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const setUploadedFile = useCallback((file: File | null) => {
    setUploadedFileState(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, []);

  const startReconstruction = useCallback(async (file: File, params: ReconstructParams) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await reconstruct(file, params);
      setResult(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reconstruction failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDownload = useCallback((fileType: 'ply' | 'obj'): string | null => {
    if (!result?.job_id) return null;
    return getDownloadUrl(result.job_id, fileType);
  }, [result]);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
    setError(null);
    setViewMode('pointcloud');
    setUploadedFileState(null);
    setImagePreview(null);
  }, []);

  return {
    result,
    loading,
    error,
    viewMode,
    uploadedFile,
    imagePreview,
    startReconstruction,
    setViewMode,
    setUploadedFile,
    getDownload,
    reset,
  };
}
