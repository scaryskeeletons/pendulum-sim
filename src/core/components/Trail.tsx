/**
 * Trail
 * Memory-safe trail rendering using basic Three.js Line
 *
 * CRITICAL FIX: drei's Line component leaks memory because it creates new
 * LineGeometry on every props change without disposing the old one.
 * This implementation uses pre-allocated buffers that are updated in place.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrailPoint } from '../types';

interface TrailProps {
  points: TrailPoint[];
  color: string;
  lineWidth?: number;
  opacity?: number;
  maxDisplayPoints?: number;
}

/**
 * Memory-safe trail using pre-allocated BufferGeometry
 * Updates buffers in place - NO memory allocation after initialization
 */
export function Trail({
  points,
  color,
  opacity = 0.7,
  maxDisplayPoints = 300,
}: TrailProps) {
  const meshRef = useRef<THREE.Line>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const positionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const colorAttrRef = useRef<THREE.BufferAttribute | null>(null);

  // Pre-allocate buffers ONCE
  const maxPoints = maxDisplayPoints;
  const positionBuffer = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints]);
  const colorBuffer = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints]);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  // Initialize geometry and attributes once
  useEffect(() => {
    const geometry = new THREE.BufferGeometry();

    const posAttr = new THREE.BufferAttribute(positionBuffer, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);

    const colAttr = new THREE.BufferAttribute(colorBuffer, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('color', colAttr);

    geometry.setDrawRange(0, 0);

    geometryRef.current = geometry;
    positionAttrRef.current = posAttr;
    colorAttrRef.current = colAttr;

    if (meshRef.current) {
      meshRef.current.geometry = geometry;
    }

    // Cleanup on unmount
    return () => {
      geometry.dispose();
      geometryRef.current = null;
      positionAttrRef.current = null;
      colorAttrRef.current = null;
    };
  }, [positionBuffer, colorBuffer]);

  // Update buffers every frame (no allocation)
  useFrame(() => {
    if (!positionAttrRef.current || !colorAttrRef.current || !geometryRef.current) return;
    if (points.length < 2) {
      geometryRef.current.setDrawRange(0, 0);
      return;
    }

    // Downsample if needed
    let step = 1;
    if (points.length > maxPoints) {
      step = Math.ceil(points.length / maxPoints);
    }

    let idx = 0;
    for (let i = 0; i < points.length && idx < maxPoints; i += step) {
      const p = points[i];
      positionBuffer[idx * 3] = p.position.x;
      positionBuffer[idx * 3 + 1] = p.position.y;
      positionBuffer[idx * 3 + 2] = p.position.z;

      // Fade effect: darker at start, brighter at end
      const t = i / points.length;
      colorBuffer[idx * 3] = colorObj.r * (0.3 + t * 0.7);
      colorBuffer[idx * 3 + 1] = colorObj.g * (0.3 + t * 0.7);
      colorBuffer[idx * 3 + 2] = colorObj.b * (0.3 + t * 0.7);

      idx++;
    }

    // Always include last point
    if (points.length > 1 && idx < maxPoints) {
      const last = points[points.length - 1];
      positionBuffer[idx * 3] = last.position.x;
      positionBuffer[idx * 3 + 1] = last.position.y;
      positionBuffer[idx * 3 + 2] = last.position.z;
      colorBuffer[idx * 3] = colorObj.r;
      colorBuffer[idx * 3 + 1] = colorObj.g;
      colorBuffer[idx * 3 + 2] = colorObj.b;
      idx++;
    }

    positionAttrRef.current.needsUpdate = true;
    colorAttrRef.current.needsUpdate = true;
    geometryRef.current.setDrawRange(0, idx);
  });

  // Update color when it changes
  useEffect(() => {
    colorObj.set(color);
  }, [color, colorObj]);

  // Create material once
  const material = useMemo(() => new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: opacity,
  }), [opacity]);

  // Update opacity when it changes
  useEffect(() => {
    material.opacity = opacity;
  }, [opacity, material]);

  // Cleanup material
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Create the Line object ONCE
  const lineObject = useMemo(() => {
    const line = new THREE.Line();
    return line;
  }, []);

  // Attach geometry when ready
  useEffect(() => {
    if (geometryRef.current && lineObject) {
      lineObject.geometry = geometryRef.current;
      lineObject.material = material;
    }
  }, [lineObject, material]);

  // Note: geometry and material cleanup is handled by their own useEffect hooks above
  // Do NOT create new BufferGeometry/LineBasicMaterial here - that would leak memory

  return <primitive object={lineObject} ref={meshRef} />;
}

/**
 * TubeTrail - backwards compatibility
 * @deprecated Use Trail instead
 */
export function TubeTrail({
  points,
  color,
}: {
  points: TrailPoint[];
  color: string;
  radius?: number;
}) {
  return (
    <Trail
      points={points}
      color={color}
      opacity={0.7}
    />
  );
}
