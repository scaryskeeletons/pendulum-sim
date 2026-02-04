/**
 * SimulationCanvas
 * Main 3D canvas wrapper with scene setup, lighting, and post-processing
 *
 * Memory optimizations:
 * - Configurable pixel ratio for lower memory on weak devices
 * - Post-processing can be disabled
 * - Shadows can be disabled
 * - Resource cleanup on unmount
 */

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Stats, Environment, PerformanceMonitor, Text } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { useThemeStore, useSimulationStore } from '../stores';
import type { Vector3 } from '../types';
import * as THREE from 'three';

// Memory stats collector for Three.js resources
function ThreeMemoryCollector() {
  const { gl } = useThree();

  useEffect(() => {
    const interval = setInterval(() => {
      const updateFn = (window as unknown as { __memoryDebugUpdate?: (stats: Record<string, number>) => void }).__memoryDebugUpdate;
      if (updateFn) {
        const info = gl.info;
        updateFn({
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          programs: info.programs?.length ?? 0,
          triangles: info.render.triangles,
          points: info.render.points,
          lines: info.render.lines,
          calls: info.render.calls,
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gl]);

  return null;
}

// Resource cleanup on unmount
function ResourceCleanup() {
  const { gl, scene } = useThree();

  useEffect(() => {
    return () => {
      // Dispose of all geometries and materials on unmount
      scene.traverse((object) => {
        if ('geometry' in object && object.geometry) {
          (object.geometry as { dispose: () => void }).dispose();
        }
        if ('material' in object && object.material) {
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else if (material && typeof material === 'object' && 'dispose' in material) {
            (material as { dispose: () => void }).dispose();
          }
        }
      });

      // Clear render info
      gl.info.reset();

      console.log('Three.js resources cleaned up');
    };
  }, [gl, scene]);

  return null;
}

interface SimulationCanvasProps {
  children: ReactNode;
  cameraPosition?: Vector3;
  cameraTarget?: Vector3;
  fov?: number;
  enablePostProcessing?: boolean;
  enableEnvironment?: boolean;
  lowPowerMode?: boolean;
}

// Set scene background color based on theme
function SceneBackground() {
  const { scene } = useThree();
  const bgColor = useThemeStore((s) => s.colors.background);

  useEffect(() => {
    scene.background = new THREE.Color(bgColor);
  }, [scene, bgColor]);

  return null;
}

// Watermark text in 3D space
function Watermark() {
  const textColor = useThemeStore((s) => s.colors.textMuted);

  return (
    <Text
      position={[0, -8, -15]}
      fontSize={2}
      color={textColor}
      fillOpacity={0.08}
      anchorX="center"
      anchorY="middle"
      font={undefined}
    >
      AWAWAWAWAW
    </Text>
  );
}

function SceneSetup({
  cameraTarget,
  enablePostProcessing,
  enableEnvironment,
  lowPowerMode,
}: {
  cameraTarget: Vector3;
  enablePostProcessing: boolean;
  enableEnvironment: boolean;
  lowPowerMode: boolean;
}) {
  const theme = useThemeStore((s) => s.currentTheme);
  const showGrid = useSimulationStore((s) => s.showGrid);
  const showStats = useSimulationStore((s) => s.showStats);

  // Auto-downgrade on performance issues
  const [degraded, setDegraded] = useState(false);

  const shouldEnablePost = enablePostProcessing && !lowPowerMode && !degraded;

  return (
    <>
      {/* Scene background color */}
      <SceneBackground />

      {/* Watermark */}
      <Watermark />

      {/* Performance monitor - auto-downgrades quality if FPS drops */}
      <PerformanceMonitor
        onDecline={() => {
          console.log('Performance declined - disabling effects');
          setDegraded(true);
        }}
        onIncline={() => {
          // Don't auto-upgrade to prevent flapping
        }}
      />

      {/* Controls */}
      <OrbitControls
        target={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={50}
      />

      {/* Lighting - simplified for low power */}
      <ambientLight
        intensity={lowPowerMode ? 0.6 : (theme.ambient?.intensity ?? 0.4)}
        color={theme.ambient?.color ?? '#ffffff'}
      />
      {!lowPowerMode && (
        <>
          <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow={!lowPowerMode} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        </>
      )}
      {lowPowerMode && (
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
      )}

      {/* Environment - disabled in low power */}
      {enableEnvironment && !lowPowerMode && <Environment preset="night" />}

      {/* Grid - smaller in low power mode */}
      {showGrid && (
        <Grid
          args={lowPowerMode ? [10, 10] : [20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor={theme.colors.grid}
          sectionSize={2}
          sectionThickness={1}
          sectionColor={theme.colors.axis}
          fadeDistance={lowPowerMode ? 15 : 30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={!lowPowerMode}
        />
      )}

      {/* Post-processing - disabled in low power mode */}
      {shouldEnablePost && theme.bloom && theme.bloom.intensity > 0 && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={theme.bloom.intensity * 0.5} // Reduced intensity
            luminanceThreshold={theme.bloom.luminanceThreshold}
            luminanceSmoothing={theme.bloom.luminanceSmoothing}
            mipmapBlur
          />
          <Vignette offset={0.3} darkness={0.5} />
        </EffectComposer>
      )}

      {/* Stats */}
      {showStats && <Stats />}
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
  );
}

export function SimulationCanvas({
  children,
  cameraPosition = { x: 0, y: 0, z: 10 },
  cameraTarget = { x: 0, y: 0, z: 0 },
  fov = 50,
  enablePostProcessing = true,
  enableEnvironment = false,
  lowPowerMode = false,
}: SimulationCanvasProps) {
  const theme = useThemeStore((s) => s.currentTheme);

  // Detect if we should enable low power mode automatically
  const [autoLowPower, setAutoLowPower] = useState(false);

  useEffect(() => {
    // Check for low-end device indicators
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;

    if ((memory && memory <= 4) || (cores && cores <= 4)) {
      console.log('Low-end device detected, enabling low power mode');
      setAutoLowPower(true);
    }
  }, []);

  const isLowPower = lowPowerMode || autoLowPower;

  return (
    <div className="simulation-canvas" style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [cameraPosition.x, cameraPosition.y, cameraPosition.z],
          fov,
          near: 0.1,
          far: isLowPower ? 100 : 1000,
        }}
        style={{ background: theme.colors.background }}
        shadows={!isLowPower}
        dpr={isLowPower ? 1 : Math.min(window.devicePixelRatio, 2)} // Limit pixel ratio
        gl={{
          antialias: !isLowPower,
          alpha: false,
          powerPreference: isLowPower ? 'low-power' : 'high-performance',
          // Reduce render buffer size for memory savings
          preserveDrawingBuffer: false,
        }}
        frameloop={isLowPower ? 'demand' : 'always'}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneSetup
            cameraTarget={cameraTarget}
            enablePostProcessing={enablePostProcessing}
            enableEnvironment={enableEnvironment}
            lowPowerMode={isLowPower}
          />
          <ThreeMemoryCollector />
          <ResourceCleanup />
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
