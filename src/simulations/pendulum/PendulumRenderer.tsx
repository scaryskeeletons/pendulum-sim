/**
 * PendulumRenderer
 * Reusable 3D renderer for any pendulum simulation
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import type { PhysicsState, Vector3 } from '../../core/types';
import { useThemeStore, useSimulationStore } from '../../core/stores';
import { Trail } from '../../core/components';

interface PendulumRendererProps {
  state: PhysicsState | null;
  pivotPosition?: Vector3;
  massRadius?: number;
  rodRadius?: number;
  useGlowEffect?: boolean;
}

export function PendulumRenderer({
  state,
  pivotPosition = { x: 0, y: 0, z: 0 },
  massRadius = 0.15,
  rodRadius = 0.03,
  useGlowEffect = true,
}: PendulumRendererProps) {
  const colors = useThemeStore((s) => s.colors);
  const { trails, showTrails } = useSimulationStore();

  if (!state) return null;

  const { positions } = state;

  // Build rod segments
  const rods: { start: Vector3; end: Vector3; length: number }[] = [];
  let prevPos = pivotPosition;

  for (const pos of positions) {
    const dx = pos.x - prevPos.x;
    const dy = pos.y - prevPos.y;
    const dz = pos.z - prevPos.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    rods.push({ start: prevPos, end: pos, length });
    prevPos = pos;
  }

  return (
    <group>
      {/* Pivot point */}
      <Sphere position={[pivotPosition.x, pivotPosition.y, pivotPosition.z]} args={[0.08, 16, 16]}>
        <meshStandardMaterial
          color={colors.pivot}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Rods */}
      {rods.map((rod, i) => (
        <Rod
          key={i}
          start={rod.start}
          end={rod.end}
          radius={rodRadius}
          color={colors.rod}
        />
      ))}

      {/* Masses */}
      {positions.map((pos, i) => (
        <Mass
          key={i}
          position={pos}
          radius={massRadius}
          color={colors.mass}
          useGlow={useGlowEffect}
          index={i}
        />
      ))}

      {/* Trails - using optimized GPU-based Line rendering */}
      {showTrails &&
        trails.map((trail, i) => (
          <Trail
            key={i}
            points={trail}
            color={i === positions.length - 1 ? colors.trail : colors.secondary}
            lineWidth={3}
            maxDisplayPoints={500}
          />
        ))}
    </group>
  );
}

interface RodProps {
  start: Vector3;
  end: Vector3;
  radius: number;
  color: string;
}

// Reusable Three.js objects to avoid allocation every frame
const _direction = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quaternion = new THREE.Quaternion();
const _euler = new THREE.Euler();

function Rod({ start, end, radius, color }: RodProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate position and rotation without creating new objects
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Position at midpoint
  const position: [number, number, number] = [
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2,
  ];

  // Calculate rotation using reusable objects
  _direction.set(dx, dy, dz).normalize();
  _up.set(0, 1, 0);
  _quaternion.setFromUnitVectors(_up, _direction);
  _euler.setFromQuaternion(_quaternion);

  const rotation: [number, number, number] = [_euler.x, _euler.y, _euler.z];

  return (
    <Cylinder
      ref={meshRef}
      position={position}
      rotation={rotation}
      args={[radius, radius, length, 8]}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.3}
      />
    </Cylinder>
  );
}

interface MassProps {
  position: Vector3;
  radius: number;
  color: string;
  useGlow: boolean;
  index: number;
}

function Mass({ position, radius, color, useGlow, index }: MassProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle animation
  useFrame((state) => {
    if (meshRef.current && useGlow) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  return (
    <Sphere
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      args={[radius, 32, 32]}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={useGlow ? 0.2 : 0}
        metalness={0.3}
        roughness={0.4}
      />
    </Sphere>
  );
}
