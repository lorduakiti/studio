"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [rotationSpeed, setRotationSpeed] = useState(1.0); // Initial rotation speed
  const [numNodes, setNumNodes] = useState(50);
  const [numConnections, setNumConnections] = useState(100);
  const [autoCreateNodes, setAutoCreateNodes] = useState(false);
  const [creationRate, setCreationRate] = useState(1); // Nodes per second
  const [zoomLevel, setZoomLevel] = useState(100); // Initial zoom level
  const ZOOM_SPEED = 0.01; // Zoom speed

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
    updateCameraPosition(zoomLevel);
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

      // Rotate the entire scene
      scene.rotation.x += 0.001 * rotationSpeed;
      scene.rotation.y += 0.001 * rotationSpeed;

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

      const handleZoom = (event: WheelEvent) => {
      // Adjust zoom level based on mouse wheel delta
      let zoomDelta = event.deltaY * ZOOM_SPEED;
      let newZoomLevel = zoomLevel - zoomDelta;

      // Clamp zoom level to prevent zooming in too close or too far out
      newZoomLevel = Math.max(0, Math.min(100, newZoomLevel)); // Adjust min and max values as needed

      setZoomLevel(newZoomLevel);
      updateCameraPosition(newZoomLevel);

      // Prevent default scroll behavior
      event.preventDefault();
      };

    canvas.addEventListener('wheel', handleZoom);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('wheel', handleZoom);
      controls.dispose();
      renderer.dispose();
    };
  }, [animationSpeed, isPlaying, numConnections, numNodes, rotationSpeed, zoomLevel]);

  useEffect(() => {
    if (sceneRef.current) {
      // Re-initialize network when numNodes or numConnections change
      clearNetwork();
      initializeNetwork(numNodes, numConnections);
    }
  }, [numNodes, numConnections]);

  useEffect(() => {
    if (autoCreateNodes) {
      const intervalId = setInterval(() => {
        if (sceneRef.current) {
          createNode();
          setNumNodes(prevCount => prevCount + 1);
        }
      }, 1000 / creationRate);

      return () => clearInterval(intervalId);
    }
  }, [autoCreateNodes, creationRate]);

  const createNode = () => {
    if (!sceneRef.current) return;

    const geometry = new THREE.SphereGeometry(0.05, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x7DF9FF });
    const node = new THREE.Mesh(geometry, material);
    node.position.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    sceneRef.current.add(node);
    nodesRef.current.push(node);
  };

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

   const updateCameraPosition = (newZoomLevel: number) => {
      if (cameraRef.current) {
        // Calculate the new Z position based on the zoom level
        const zoomPercentage = newZoomLevel / 100; // Normalize zoom level to 0-1 range
        cameraRef.current.position.z = 11 - (10 * zoomPercentage); // Adjust zoom range as needed
    }
  };

   useEffect(() => {
    // Ensure camera position is updated on initial load
    updateCameraPosition(zoomLevel);
  }, []);


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
             <div className="flex items-center space-x-2">
              <Checkbox
                id="autoCreateNodes"
                checked={autoCreateNodes}
                onCheckedChange={(checked) => setAutoCreateNodes(checked)}
              />
              <label htmlFor="autoCreateNodes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Auto Create Nodes</label>
            </div>
            {autoCreateNodes && (
              <div className="flex items-center space-x-2">
                <label htmlFor="creationRate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Creation Rate (nodes/sec)</label>
                <Input
                  type="number"
                  id="creationRate"
                  value={creationRate}
                  onChange={(e) => setCreationRate(parseInt(e.target.value))}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-20 text-black"
                />
              </div>
            )}
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
              <label htmlFor="animationSpeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Activation Speed</label>
              <Slider
                id="animationSpeed"
                defaultValue={[animationSpeed]}
                max={5}
                min={0.1}
                step={0.1}
                onValueChange={(value) => setAnimationSpeed(value[0])}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="rotationSpeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Rotation Speed</label>
              <Slider
                id="rotationSpeed"
                defaultValue={[rotationSpeed]}
                max={5}
                min={0.1}
                step={0.1}
                onValueChange={(value) => setRotationSpeed(value[0])}
              />
            </div>
             <div className="flex items-center space-x-2">
              <label htmlFor="zoomLevel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Zoom</label>
              <Slider
                id="zoomLevel"
                defaultValue={[zoomLevel]}
                max={100}
                min={0}
                step={1}
                onValueChange={(value) => setZoomLevel(value[0])}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NeuralNetworkAnimation;
