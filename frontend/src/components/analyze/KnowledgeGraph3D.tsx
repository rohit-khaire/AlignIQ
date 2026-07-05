import React, { useMemo, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Sphere, Line, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface GraphProps {
  report: any[];
}

export const KnowledgeGraph3D: React.FC<GraphProps> = ({ report }) => {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative">
      <div className="absolute top-4 left-4 z-10 bg-black/60 p-4 rounded-xl border border-white/10 backdrop-blur-md">
        <h3 className="text-white font-bold mb-2">3D Policy Knowledge Graph</h3>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
            <span className="text-zinc-300">Master Policy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
            <span className="text-zinc-300">Company Policy (Evidence)</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-4 h-0.5 bg-emerald-400"></div>
            <span className="text-zinc-300">Compliant Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-rose-400"></div>
            <span className="text-zinc-300">Non-Compliant Connection</span>
          </div>
        </div>
      </div>
      
      <Canvas camera={{ position: [0, 25, 40], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxDistance={100} />
        <GraphScene report={report} />
      </Canvas>
    </div>
  );
};

const GraphScene = ({ report }: { report: any[] }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Parse report data into nodes and edges
  const { masterNodes, satelliteNodes, edges } = useMemo(() => {
    const mNodes: any[] = [];
    const sNodes: any[] = [];
    const eds: any[] = [];

    const masterRadius = Math.max(15, report.length * 3);

    report.forEach((masterPol, mIndex) => {
      // Calculate Master Node position (circle in XZ plane)
      const mAngle = (mIndex / report.length) * Math.PI * 2;
      const mx = Math.cos(mAngle) * masterRadius;
      const mz = Math.sin(mAngle) * masterRadius;
      const my = (Math.random() - 0.5) * 10; // add some Y variation

      const mNodeId = `master_${masterPol.policy_id}`;
      mNodes.push({
        id: mNodeId,
        title: masterPol.policy_title,
        status: masterPol.overall_status,
        score: masterPol.summary?.compliance_percentage,
        position: [mx, my, mz],
      });

      // Extract unique satellites for this master policy
      const satellitesMap = new Map<string, any>();
      
      if (masterPol.requirements) {
        masterPol.requirements.forEach((req: any) => {
          if (req.supporting_evidence) {
            req.supporting_evidence.forEach((ev: any) => {
              const satId = `sat_${ev.company_policy_id || ev.company_policy_title}`;
              if (!satellitesMap.has(satId)) {
                satellitesMap.set(satId, {
                  id: satId,
                  title: ev.company_policy_title || ev.title,
                  statuses: [req.status]
                });
              } else {
                satellitesMap.get(satId).statuses.push(req.status);
              }
            });
          }
        });
      }

      const satellites = Array.from(satellitesMap.values());
      const satOrbitRadius = Math.min(8, Math.max(3, satellites.length * 1.5));

      satellites.forEach((sat, sIndex) => {
        // Calculate satellite position relative to master node
        // Create an orbit inclined randomly
        const sAngle = (sIndex / satellites.length) * Math.PI * 2;
        const sx = mx + Math.cos(sAngle) * satOrbitRadius;
        const sz = mz + Math.sin(sAngle) * satOrbitRadius;
        const sy = my + (Math.sin(sAngle * 2) * 2); // wobbly orbit

        sNodes.push({
          ...sat,
          position: [sx, sy, sz],
          masterPosition: [mx, my, mz]
        });

        // Determine edge color (if ANY requirement was Satisfied with this evidence, green. else red/amber)
        const isSatisfied = sat.statuses.includes('Satisfied');
        const isPartial = sat.statuses.includes('Partially Satisfied');
        
        eds.push({
          start: [mx, my, mz],
          end: [sx, sy, sz],
          color: isSatisfied ? '#00ff00' : isPartial ? '#fbbf24' : '#ff0000'
        });
      });
    });

    return { masterNodes: mNodes, satelliteNodes: sNodes, edges: eds };
  }, [report]);

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((edge, idx) => (
        <Line 
          key={`edge_${idx}`} 
          points={[edge.start as [number,number,number], edge.end as [number,number,number]]} 
          color={edge.color} 
          lineWidth={3}
          transparent={false}
          opacity={1}
        />
      ))}

      {/* Master Nodes */}
      {masterNodes.map((node) => (
        <Node 
          key={node.id} 
          position={node.position as [number,number,number]} 
          color="#22d3ee" 
          size={1.5} 
          label={node.title} 
          details={`Score: ${node.score}%\nStatus: ${node.status}`}
          glowColor="#0891b2"
        />
      ))}

      {/* Satellite Nodes */}
      {satelliteNodes.map((node, idx) => (
        <Node 
          key={`${node.id}_${idx}`} 
          position={node.position as [number,number,number]} 
          color="#c084fc" 
          size={0.6} 
          label={node.title}
          glowColor="#9333ea"
        />
      ))}
    </group>
  );
};

const Node = ({ position, color, size, label, details, glowColor }: any) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <Sphere 
        args={[size, 32, 32]} 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        <meshStandardMaterial 
          color={color} 
          emissive={glowColor}
          emissiveIntensity={hovered ? 2 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Subtle outer glow sphere */}
      <Sphere args={[size * 1.3, 16, 16]}>
        <meshBasicMaterial color={glowColor} transparent opacity={0.15} />
      </Sphere>

      {hovered && (
        <Html style={{ pointerEvents: 'none' }} distanceFactor={25} center zIndexRange={[100, 0]}>
          <div className="bg-zinc-900/95 border border-white/20 p-3 rounded-lg shadow-2xl pointer-events-none w-max max-w-[250px] backdrop-blur-md">
            <p className="text-white font-bold text-sm leading-tight mb-1">{label}</p>
            {details && (
              <p className="text-zinc-400 text-xs whitespace-pre-wrap">{details}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
