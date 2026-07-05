import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const GlowingCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.9}
          wireframe={true}
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      
      {/* Inner glowing sphere */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <MeshDistortMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={1}
          speed={3}
          distort={0.4}
          radius={1}
          transparent={true}
          opacity={0.6}
        />
      </mesh>
    </Float>
  );
};

export const ComplianceShield3D: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10 opacity-60">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#06b6d4" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
        
        <GlowingCore />
        
        <Sparkles 
          count={100} 
          scale={10} 
          size={4} 
          speed={0.4} 
          opacity={0.3} 
          color="#06b6d4" 
        />
        <Sparkles 
          count={50} 
          scale={8} 
          size={6} 
          speed={0.2} 
          opacity={0.2} 
          color="#3b82f6" 
        />
      </Canvas>
    </div>
  );
};
