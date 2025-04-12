"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const gradientColors = [
  0x0000FF, // Blue
  0x00FF00, // Green
  0xFFFF00, // Yellow
  0xFF0000  // Red
];

const NeuralNetworkAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [numNodes, setNumNodes] = useState(50);
  const [numConnections, setNumConnections] = useState(100);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number>(0);
  const nodesRef = useRef<THREE.Mesh[]>([]);
  const connectionsRef = useRef<THREE.Line[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x121212, 1);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Initialize nodes and connections
    initializeNetwork(numNodes, numConnections);

    const animate = () => {
      if (!isPlaying) return;

      controls.update();

      // Simulate node activation (example)
      nodesRef.current.forEach((node, index) => {
        const activation = Math.sin(Date.now() * 0.001 * animationSpeed + index);
        // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
        if (node.material instanceof THREE.MeshBasicMaterial) {
          node.material.color.set(getColorForActivation(activation));
        }
      });

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [animationSpeed, isPlaying, numConnections, numNodes]);

  useEffect(() => {
    if (sceneRef.current) {
      // Re-initialize network when numNodes or numConnections change
      clearNetwork();
      initializeNetwork(numNodes, numConnections);
    }
  }, [numNodes, numConnections]);

  const initializeNetwork = (nodes: number, connections: number) => {
    if (!sceneRef.current) return;

    const nodesArray: THREE.Mesh[] = [];
    const connectionsArray: THREE.Line[] = [];

    for (let i = 0; i < nodes; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x7DF9FF });
      const node = new THREE.Mesh(geometry, material);
      node.position.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      sceneRef.current.add(node);
      nodesArray.push(node);
    }

    for (let i = 0; i < connections; i++) {
      const startNode = nodesArray[Math.floor(Math.random() * nodesArray.length)];
      const endNode = nodesArray[Math.floor(Math.random() * nodesArray.length)];

      const material = new THREE.LineBasicMaterial({ color: 0xAAAAAA });
      const geometry = new THREE.BufferGeometry().setFromPoints([startNode.position.clone(), endNode.position.clone()]);
      const line = new THREE.Line(geometry, material);
      sceneRef.current.add(line);
      connectionsArray.push(line);
    }

    nodesRef.current = nodesArray;
    connectionsRef.current = connectionsArray;
  };

  const clearNetwork = () => {
    if (!sceneRef.current) return;

    nodesRef.current.forEach(node => {
      sceneRef.current?.remove(node);
      // @ts-expect-error - Property 'geometry' does not exist on type 'Object3D<Event>'.
      node.geometry.dispose();
      // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
      if (node.material instanceof THREE.Material) {
        // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
        node.material.dispose();
      }
    });

    connectionsRef.current.forEach(connection => {
      sceneRef.current?.remove(connection);
      // @ts-expect-error - Property 'geometry' does not exist on type 'Object3D<Event>'.
      connection.geometry.dispose();
      // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
      if (connection.material instanceof THREE.Material) {
        // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
        connection.material.dispose();
      }
    });

    nodesRef.current = [];
    connectionsRef.current = [];
  };

  const getColorForActivation = (activation: number): THREE.Color => {
    const scaledActivation = (activation + 1) / 2; // Scale from -1 to 1, to 0 to 1
    const colorIndex = Math.floor(scaledActivation * (gradientColors.length - 1));
    const startColor = new THREE.Color(gradientColors[colorIndex]);
    const endColor = new THREE.Color(gradientColors[colorIndex + 1] || gradientColors[colorIndex]);
    const colorWeight = scaledActivation * (gradientColors.length - 1) - colorIndex;
    const finalColor = startColor.lerp(endColor, colorWeight);
    return finalColor;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white">
      <h1 className="text-3xl font-bold mb-4">Synaptic Canvas</h1>
      <canvas ref={canvasRef} className="w-3/4 h-[600px] rounded-lg shadow-lg" />
      <div className="flex flex-col md:flex-row items-center justify-center mt-4 gap-4">
         <Card className="w-full max-w-sm bg-[#242424] border-none shadow-md">
          <CardHeader>
            <CardTitle>Network Configuration</CardTitle>
            <CardDescription>Adjust the network structure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="numNodes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nodes</label>
              <Input
                type="number"
                id="numNodes"
                value={numNodes}
                onChange={(e) => setNumNodes(parseInt(e.target.value))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-20 text-black"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="numConnections" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Connections</label>
              <Input
                type="number"
                id="numConnections"
                value={numConnections}
                onChange={(e) => setNumConnections(parseInt(e.target.value))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-20 text-black"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full max-w-sm bg-[#242424] border-none shadow-md">
          <CardHeader>
            <CardTitle>Animation Controls</CardTitle>
            <CardDescription>Control the animation playback.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Button onClick={() => setIsPlaying(!isPlaying)} variant="secondary">
                {isPlaying ? <Icons.pause /> : <Icons.play />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="animationSpeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Speed</label>
              <Slider
                id="animationSpeed"
                defaultValue={[animationSpeed]}
                max={5}
                min={0.1}
                step={0.1}
                onValueChange={(value) => setAnimationSpeed(value[0])}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NeuralNetworkAnimation;
