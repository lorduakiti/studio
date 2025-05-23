'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const NeuralNetworkAnimation = () => {
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number>(null);
  const nodesArrayRef = useRef<THREE.Mesh[]>([]);
  const connectionsArrayRef = useRef<THREE.Line[]>([]);
  const [nodes, setNodes] = useState(42);
  const [connections, setConnections] = useState(0);
  const [activationSpeed, setActivationSpeed] = useState(50);
  const [rotationSpeed, setRotationSpeed] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [autoCreateNodes, setAutoCreateNodes] = useState(false);
  const [elementNodeId, setElementNodeId] = useState<number | null>(null);
  const [clickedNodes, setClickedNodes] = useState<Set<number>>(new Set());

  const getConnectionColor = useCallback((connectionCount: number) => {
    const maxConnections = 100;
    const clampedConnections = Math.min(connectionCount, maxConnections);
    const hue = 240 - (clampedConnections / maxConnections) * 240;
    return `hsl(${hue}, 100%, 50%)`;
  }, []);

  const updateCameraPosition = useCallback((zoom) => {
    if (cameraRef.current) {
      const maxZoom = 10;
      const zoomFactor = 1 + (zoom / 100) * (maxZoom - 1);
      cameraRef.current.position.z = maxZoom / zoomFactor;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const clearScene = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.children.forEach((child) => {
        if ((child as THREE.Mesh)?.geometry) {
          ((child as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
        }
        if ((child as THREE.Line)?.geometry) {
          ((child as THREE.Line).geometry as THREE.BufferGeometry).dispose();
        }
        if ((child as THREE.Mesh)?.material) {
          if (Array.isArray(((child as THREE.Mesh).material as THREE.Material))) {
            ((child as THREE.Mesh).material as THREE.Material[]).forEach(material => material.dispose());
          } else {
            (((child as THREE.Mesh).material as THREE.Material)).dispose();
          }
        }
        if ((child as THREE.Line)?.material) {
          (((child as THREE.Line).material as THREE.Material)).dispose();
        }
        sceneRef.current.remove(child);
      });
    }
    nodesArrayRef.current = [];
    connectionsArrayRef.current = [];
    setClickedNodes(new Set());
  }, []);

  const initializeNetwork = useCallback(() => {
    clearScene();

    const width = window.innerWidth;
    const height = window.innerHeight;

    let camera: THREE.PerspectiveCamera;
    if (!cameraRef.current) {
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      cameraRef.current = camera;
    } else {
      camera = cameraRef.current;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(renderer.domElement);
    }

    const scene = sceneRef.current;
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const nodesArray: THREE.Mesh[] = [];
    let nextNodeId = 0;

    for (let i = 0; i < nodes; i++) {
      const connectionCount = connectionsArrayRef.current.filter(conn => {
        return conn.geometry.attributes.position.array.includes(i);
      }).length;

      const material = new THREE.MeshBasicMaterial({ color: getConnectionColor(connectionCount) });
      const node = new THREE.Mesh(geometry, material);
      node.position.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      (node as any).userData = { id: nextNodeId++ };
      scene.add(node);
      nodesArray.push(node);
    }

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x7DF9FF });
    const connectionsArray: THREE.Line[] = [];

    for (let i = 0; i < connections; i++) {
      if (nodesArray.length < 2) break;

      const startNodeIndex = Math.floor(Math.random() * nodesArray.length);
      const endNodeIndex = Math.floor(Math.random() * nodesArray.length);

      if (startNodeIndex === endNodeIndex) continue;

      const startNode = nodesArray[startNodeIndex];
      const endNode = nodesArray[endNodeIndex];

      const points = [startNode.position, endNode.position];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
      connectionsArray.push(line);
    }

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    updateCameraPosition(zoomLevel);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    orbitControlsRef.current = orbitControls;
    nodesArrayRef.current = nodesArray;
    connectionsArrayRef.current = connectionsArray;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(nodesArrayRef.current);

      if (intersects.length > 0) {
        const intersectedNode = intersects[0].object as THREE.Mesh;
        const nodeId = (intersectedNode as any).userData.id;
        setElementNodeId(nodeId);

        if (!clickedNodes.has(nodeId)) {
          intersectedNode.material = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
        }
      } else {
        nodesArrayRef.current.forEach(node => {
          const nodeId = (node as any).userData.id;
          if (!clickedNodes.has(nodeId)) {
            const connectionCount = connectionsArrayRef.current.filter(conn => {
              const positions = conn.geometry.attributes.position.array;
              return positions && positions.includes(node.position.x);
            }).length;
            (node.material as THREE.MeshBasicMaterial).color.set(getConnectionColor(connectionCount));
          }
        });
        setElementNodeId(null);
      }
    };

    const onNodeClick = (event: MouseEvent) => {
      event.preventDefault();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(nodesArrayRef.current);

      if (intersects.length > 0) {
        const intersectedNode = intersects[0].object as THREE.Mesh;
        const nodeId = (intersectedNode as any).userData.id;

        setClickedNodes(prevClickedNodes => {
          const newClickedNodes = new Set(prevClickedNodes);
          if (newClickedNodes.has(nodeId)) {
            newClickedNodes.delete(nodeId);
            const connectionCount = connectionsArrayRef.current.filter(conn => {
              const positions = conn.geometry.attributes.position.array;
              return positions && positions.includes(intersectedNode.position.x);
            }).length;
            intersectedNode.material = new THREE.MeshBasicMaterial({ color: getConnectionColor(connectionCount) });
          } else {
            newClickedNodes.add(nodeId);
            intersectedNode.material = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
          }
          return newClickedNodes;
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('click', onNodeClick, false);

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const rotationSpeedFactor = (rotationSpeed / 100) * 0.05;
      if (sceneRef.current) {
        sceneRef.current.rotation.x += rotationSpeedFactor;
        sceneRef.current.rotation.y += rotationSpeedFactor;
      }

      orbitControlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove, false);
      window.removeEventListener('click', onNodeClick, false);
      cancelAnimationFrame(animationFrameIdRef.current);
      renderer.dispose();

      clearScene();
    };
  }, [nodes, connections, activationSpeed, rotationSpeed, zoomLevel, getConnectionColor, updateCameraPosition, clearScene, clickedNodes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      updateCameraPosition(zoomLevel);
      return initializeNetwork();
    }
  }, [initializeNetwork, updateCameraPosition, zoomLevel]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoCreateNodes) {
      intervalId = setInterval(() => {
        setNodes(prevNodes => prevNodes + 1);
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [autoCreateNodes]);

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#000', color: 'white' }}>
        <div id="canvas-container" style={{ width: '100%', height: '100%' }} />

        <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#fff' }}>
          {elementNodeId !== null && <p>Node ID: {elementNodeId}</p>}
        </div>

        <div style={{ position: 'absolute', top: '20px', right: '20px', width: '300px', color: '#fff' }}>
          <Card style={{ backgroundColor: '#1e1e1e', color: 'white' }}>
            <CardHeader style={{ color: 'white' }}>
              <CardTitle style={{ color: 'white' }}>Animation Controls</CardTitle>
              <CardDescription style={{ color: 'white' }}>Control the animation playback.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="activationSpeed" style={{ color: 'white' }}>Activation Speed: <span style={{ color: 'gray' }}>{activationSpeed}</span></Label>
                <Slider
                  id="activationSpeed"
                  defaultValue={[activationSpeed]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setActivationSpeed(value[0])}
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="rotationSpeed" style={{ color: 'white' }}>Rotation Speed: <span style={{ color: 'gray' }}>{rotationSpeed}</span></Label>
                <Slider
                  id="rotationSpeed"
                  defaultValue={[rotationSpeed]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setRotationSpeed(value[0])}
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="zoomLevel" style={{ color: 'white' }}>Zoom Level: <span style={{ color: 'gray' }}>{zoomLevel}</span></Label>
                <Slider
                  id="zoomLevel"
                  defaultValue={[zoomLevel]}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    setZoomLevel(value[0]);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '300px', color: '#fff' }}>
          <Card style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>
            <CardHeader style={{ color: 'white' }}>
              <CardTitle style={{ color: 'white' }}>Network Controls</CardTitle>
              <CardDescription style={{ color: 'white' }}>Control the network structure.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="nodes" style={{ color: 'gray' }}>Nodes</Label>
                <input
                  type="number"
                  id="nodes"
                  value={nodes}
                  onChange={(e) => setNodes(Number(e.target.value))}
                  style={{ color: 'black' }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="connections" style={{ color: 'gray' }}>Connections</Label>
                <input
                  type="number"
                  id="connections"
                  value={connections}
                  onChange={(e) => setConnections(Number(e.target.value))}
                  style={{ color: 'black' }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="autoCreateNodes" style={{ color: 'gray' }}>Auto Create Nodes</Label>
                <input
                  type="checkbox"
                  id="autoCreateNodes"
                  checked={autoCreateNodes}
                  onChange={(e) => setAutoCreateNodes(e.target.checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default function Page() {
  return (
    <>
      <NeuralNetworkAnimation />
    </>
  );
}
