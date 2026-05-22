'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface HolographicCoreProps {
  isSpeaking: boolean;
}

const INTERLAND_MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

export default function HolographicCore({ isSpeaking }: HolographicCoreProps) {
  const avatarRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const headBonesRef = useRef<THREE.Bone[]>([]);
  const { scene, animations } = useGLTF(INTERLAND_MODEL_URL);

  const avatarModel = useMemo(() => {
    // Skinned meshes need SkeletonUtils clone to preserve bone bindings (prevents detached hands/limbs).
    const model = skeletonClone(scene);
    // Use a stable transform tuned for RobotExpressive to avoid bad bbox-based auto-fit jumps.
    model.scale.setScalar(1.08);
    model.position.set(0, -1.4, 0);

    headBonesRef.current = [];
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }

      if (obj instanceof THREE.Bone && obj.name.toLowerCase().includes('head')) {
        headBonesRef.current.push(obj);
      }
    });

    return model;
  }, [scene]);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(avatarModel);
    mixerRef.current = mixer;

    const preferredClipName = ['Idle', 'Standing'];
    const selectedClip = preferredClipName
      .map((name) => animations.find((clip) => clip.name === name))
      .find((clip) => clip !== undefined) ?? animations[0];

    if (selectedClip) {
      const action = mixer.clipAction(selectedClip, avatarModel);
      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.fadeIn(0.25);
      action.play();
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [animations, avatarModel]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (avatarRef.current) {
      avatarRef.current.position.y = -0.22 + Math.sin(t * (isSpeaking ? 2.0 : 1.2)) * (isSpeaking ? 0.04 : 0.025);
      avatarRef.current.rotation.y = Math.sin(t * 0.55) * 0.14;
      avatarRef.current.rotation.x = Math.sin(t * 0.8) * 0.02;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (isSpeaking ? 0.95 : 0.35);
    }

    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const lookYaw = Math.sin(t * 0.6) * 0.12;
    const lookPitch = Math.sin(t * 0.95) * 0.04;
    const lookOffset = new THREE.Quaternion().setFromEuler(new THREE.Euler(lookPitch, lookYaw, 0, 'XYZ'));
    for (const bone of headBonesRef.current) {
      bone.quaternion.multiply(lookOffset);
    }
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4.2, 5.4, 4.4]} intensity={1.35} color="#FFD4B7" />
      <pointLight position={[-4, 2.2, -2.5]} intensity={0.75} color="#8AB58A" />

      <Float speed={isSpeaking ? 1.9 : 1.2} rotationIntensity={0.15} floatIntensity={0.5}>
        <group ref={avatarRef}>
          <primitive object={avatarModel} />

          <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.66, -0.1]}>
            <torusGeometry args={[1.06, 0.035, 14, 120]} />
            <meshStandardMaterial color="#FFC299" emissive="#FFC299" emissiveIntensity={0.46} transparent opacity={0.9} roughness={0.2} metalness={0.56} />
          </mesh>
        </group>
      </Float>
    </>
  );
}

useGLTF.preload(INTERLAND_MODEL_URL);
