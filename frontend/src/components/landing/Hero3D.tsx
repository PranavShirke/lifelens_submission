'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere() {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      sphereRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <Sphere ref={sphereRef} args={[1, 64, 64]} scale={2.8}>
        <MeshDistortMaterial
          color="#f472b6"
          attach="material"
          distort={0.4}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </Sphere>
      {/* Secondary companion sphere */}
      <Sphere args={[0.5, 32, 32]} scale={1.2} position={[2.5, 1.5, -2]}>
        <MeshDistortMaterial
          color="#818cf8"
          attach="material"
          distort={0.6}
          speed={2}
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.8}
        />
      </Sphere>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 opacity-70 pointer-events-none mix-blend-multiply">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} color="#818cf8" />
        <directionalLight position={[-10, 10, -10]} intensity={2} color="#fbcfe8" />
        <AnimatedSphere />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
