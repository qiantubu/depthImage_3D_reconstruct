/** 3D Viewer - React Three Fiber canvas with point cloud, mesh, and wireframe rendering */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ViewMode, ReconstructResponse } from '../types';

interface Viewer3DProps {
  result: ReconstructResponse | null;
  viewMode: ViewMode;
  loading: boolean;
}

/** Parse OBJ string into geometry */
function parseOBJ(objData: string): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } | null {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const normalIndices: number[] = [];

  const lines = objData.split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v' && parts.length >= 4) {
      vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (parts[0] === 'vn' && parts.length >= 4) {
      normals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (parts[0] === 'f') {
      // Parse face: f v1//vn1 v2//vn2 v3//vn3
      const faceVerts: number[] = [];
      const faceNorms: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const idxParts = parts[i].split('/');
        faceVerts.push(parseInt(idxParts[0]) - 1);
        if (idxParts.length >= 3 && idxParts[2]) {
          faceNorms.push(parseInt(idxParts[2]) - 1);
        }
      }
      // Triangulate (fan)
      for (let i = 1; i < faceVerts.length - 1; i++) {
        indices.push(faceVerts[0], faceVerts[i], faceVerts[i + 1]);
        if (faceNorms.length > 0) {
          normalIndices.push(faceNorms[0], faceNorms[i], faceNorms[i + 1]);
        }
      }
    }
  }

  if (vertices.length === 0 || indices.length === 0) return null;

  // Build per-vertex normals from face normal indices if available
  let finalNormals: Float32Array;
  if (normalIndices.length === indices.length && normals.length > 0) {
    finalNormals = new Float32Array(vertices.length);
    for (let i = 0; i < indices.length; i++) {
      const vi = indices[i];
      const ni = normalIndices[i];
      finalNormals[vi * 3] = normals[ni * 3];
      finalNormals[vi * 3 + 1] = normals[ni * 3 + 1];
      finalNormals[vi * 3 + 2] = normals[ni * 3 + 2];
    }
  } else {
    // Compute flat normals
    const posArr = new Float32Array(vertices);
    finalNormals = new Float32Array(vertices.length);
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
      vA.fromArray(posArr, ia * 3);
      vB.fromArray(posArr, ib * 3);
      vC.fromArray(posArr, ic * 3);
      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab);
      finalNormals[ia * 3] += cb.x; finalNormals[ia * 3 + 1] += cb.y; finalNormals[ia * 3 + 2] += cb.z;
      finalNormals[ib * 3] += cb.x; finalNormals[ib * 3 + 1] += cb.y; finalNormals[ib * 3 + 2] += cb.z;
      finalNormals[ic * 3] += cb.x; finalNormals[ic * 3 + 1] += cb.y; finalNormals[ic * 3 + 2] += cb.z;
    }
  }

  return {
    positions: new Float32Array(vertices),
    normals: finalNormals,
    indices: new Uint32Array(indices),
  };
}

/** Loading spinner ring */
function LoadingRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 2;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[2, 0.05, 16, 100]} />
      <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.5} />
    </mesh>
  );
}

/** Point Cloud sub-component */
function PointCloudObject({ points, colors }: { points: number[][]; colors: number[][] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colorsArr = new Float32Array(colors.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i][0];
      positions[i * 3 + 1] = points[i][1];
      positions[i * 3 + 2] = points[i][2];
      colorsArr[i * 3] = colors[i][0];
      colorsArr[i * 3 + 1] = colors[i][1];
      colorsArr[i * 3 + 2] = colors[i][2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    return geo;
  }, [points, colors]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={1.5}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.85}
      />
    </points>
  );
}

/** Mesh sub-component */
function MeshObject({ objData, wireframe }: { objData: string; wireframe?: boolean }) {
  const geometry = useMemo(() => {
    const parsed = parseOBJ(objData);
    if (!parsed) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
    return geo;
  }, [objData]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      {wireframe ? (
        <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.6} />
      ) : (
        <meshStandardMaterial
          color="#8B5CF6"
          metalness={0.4}
          roughness={0.5}
          flatShading
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}

/** Center the camera on the geometry */
function AutoCenter({ result }: { result: ReconstructResponse }) {
  const center = useMemo(() => {
    if (result.pointcloud.points.length === 0) return [0, 0, 0] as [number, number, number];
    const pts = result.pointcloud.points;
    let sx = 0, sy = 0, sz = 0;
    const n = Math.min(pts.length, 10000);
    for (let i = 0; i < n; i++) {
      sx += pts[i][0]; sy += pts[i][1]; sz += pts[i][2];
    }
    return [sx / n, sy / n, sz / n] as [number, number, number];
  }, [result]);

  return (
    <OrbitControls
      target={center}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.8}
      zoomSpeed={1.2}
      minDistance={10}
      maxDistance={2000}
    />
  );
}

export default function Viewer3D({ result, viewMode, loading }: Viewer3DProps) {
  return (
    <div className="flex-1 relative bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e]">
      <Canvas
        camera={{ position: [0, 0, 500], fov: 50, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[500, 500, 500]} intensity={0.8} />
        <directionalLight position={[-300, -200, -400]} intensity={0.3} color="#6366F1" />

        {loading && <LoadingRing />}

        {result && (
          <>
            <AutoCenter result={result} />
            {(viewMode === 'pointcloud') && (
              <PointCloudObject
                points={result.pointcloud.points}
                colors={result.pointcloud.colors}
              />
            )}
            {(viewMode === 'mesh') && (
              <MeshObject objData={result.mesh.obj_data} />
            )}
            {(viewMode === 'wireframe') && (
              <MeshObject objData={result.mesh.obj_data} wireframe />
            )}
          </>
        )}

        {!result && !loading && (
          <OrbitControls enableDamping dampingFactor={0.1} />
        )}
      </Canvas>

      {/* Overlay controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-dark-900/60 backdrop-blur-sm 
        rounded-lg px-4 py-2 border border-white/5">
        <p className="text-[10px] text-slate-500 text-center">
          Left-drag: Rotate &nbsp;|&nbsp; Scroll: Zoom &nbsp;|&nbsp; Right-drag: Pan
        </p>
      </div>

      {/* Empty state */}
      {!result && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-dark-700/50 border border-white/5 flex items-center justify-center mx-auto">
              <span className="text-3xl opacity-30">🧊</span>
            </div>
            <p className="text-sm text-slate-500">Upload a depth image to begin</p>
            <p className="text-[10px] text-slate-600">3D reconstruction result will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
