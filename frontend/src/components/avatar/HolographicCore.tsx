'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';

interface HolographicCoreProps {
  isSpeaking: boolean;
}

export default function HolographicCore({ isSpeaking }: HolographicCoreProps) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (outerRingRef.current) {
      outerRingRef.current.rotation.x += delta * (isSpeaking ? 0.8 : 0.2);
      outerRingRef.current.rotation.y += delta * (isSpeaking ? 0.4 : 0.1);
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x -= delta * (isSpeaking ? 0.6 : 0.15);
      innerRingRef.current.rotation.z += delta * (isSpeaking ? 0.9 : 0.25);
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * (isSpeaking ? 1.0 : 0.1);
    }
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#FFC299" />
      <pointLight position={[-10, -10, -5]} intensity={1.0} color="#7A9E7A" />

      <Float speed={isSpeaking ? 4 : 2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Central Morphing Core */}
        <Sphere ref={coreRef} args={[1.2, 64, 64]} scale={isSpeaking ? 1.05 : 1}>
          <MeshDistortMaterial
            color={isSpeaking ? "#FF8C42" : "#9896B0"}
            attach="material"
            distort={isSpeaking ? 0.6 : 0.2}
            speed={isSpeaking ? 4 : 1.5}
            roughness={0.1}
            metalness={0.8}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={isSpeaking ? "#FF8C42" : "#5A576E"}
            emissiveIntensity={isSpeaking ? 0.5 : 0.2}
          />
        </Sphere>

        {/* Outer Tech Ring */}
        <Torus ref={outerRingRef} args={[2.0, 0.05, 16, 100]}>
          <meshStandardMaterial color="#FFC299" metalness={0.9} roughness={0.1} emissive="#FFC299" emissiveIntensity={0.2} />
        </Torus>

        {/* Inner Tech Ring */}
        <Torus ref={innerRingRef} args={[1.6, 0.03, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#7A9E7A" metalness={0.9} roughness={0.1} emissive="#7A9E7A" emissiveIntensity={0.4} />
        </Torus>
      </Float>
    </>
  );
}
