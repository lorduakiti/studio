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
  0xEE82EE, // Violet
  0x4B0082, // Indigo
  0x0000FF, // Blue
  0x00FF00, // Green
  0xFFFF00, // Yellow
  0xFFA500, // Orange
  0xFF0000  // Red
];

let nextNodeId = 0;

const NeuralNetworkAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [rotationSpeed, setRotationSpeed] = useState(1.0); // Initial rotation speed
  const [numNodes, setNumNodes] = useState(42);
  const [numConnections, setNumConnections] = useState(0);
  const [autoCreateNodes, setAutoCreateNodes] = useState(false);
  const [creationRate, setCreationRate] = useState(1); // Nodes per second
  const [zoomLevel, setZoomLevel] = useState(0); // Initial zoom level
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number>(0);
  const nodesRef = useRef<THREE.Mesh[]>([]);
  const connectionsRef = useRef<THREE.Line[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const originalNodeColorsRef = useRef<{[key: number]: THREE.Color}>({});

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
        // Determine the number of connections for this node
        const numberOfConnections = connectionsRef.current.reduce((count, connection) => {
          const positions = connection.geometry.attributes.position.array;
          const nodePosition = node.position;

          const startX = positions[0];
          const startY = positions[1];
          const startZ = positions[2];

          const endX = positions[3];
          const endY = positions[4];
          const endZ = positions[5];

          const nodeId = node.userData.id;

          if (
            (startX === nodePosition.x && startY === nodePosition.y && startZ === nodePosition.z) ||
            (endX === nodePosition.x && endY === nodePosition.y && endZ === nodePosition.z)
          ) {
            return count + 1;
          }
          return count;
        }, 0);


        const normalizedConnections = Math.min(numberOfConnections, 100) / 100;

        // If the node has no connections, make it gray.
        let color;
        if (numberOfConnections === 0) {
          color = new THREE.Color(0x808080); // Gray color
        } else {
          color = getColorForNumberOfConnections(normalizedConnections);
        }

        // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
        if (node.material instanceof THREE.MeshBasicMaterial) {
          node.material.color.set(color);
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
      event.preventDefault();
      // Adjust zoom level based on mouse wheel delta
      let zoomDelta = event.deltaY * 0.0001; //ZOOM_SPEED;
      let newZoomLevel = zoomLevel + zoomDelta;

      // Clamp zoom level to prevent zooming in too close or too far out
      newZoomLevel = Math.max(0, Math.min(100, newZoomLevel)); // Adjust min and max values as needed

      setZoomLevel(newZoomLevel);
      updateCameraPosition(newZoomLevel);

      // Prevent default scroll behavior
      event.preventDefault();
      };

    const handleMouseMove = (event: MouseEvent) => {
        if (!canvas) return;

        // Calculate mouse position in normalized device coordinates
        mouseRef.current.x = (event.clientX / canvas.clientWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / canvas.clientHeight) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, camera);

        const intersects = raycasterRef.current.intersectObjects(nodesRef.current);

        if (intersects.length > 0) {
            const intersectedNode = intersects[0].object as THREE.Mesh;
            setHoveredNodeId(intersectedNode.userData.id);

             // Store the original color
            if (intersectedNode.userData.id && !originalNodeColorsRef.current[intersectedNode.userData.id]) {
              // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
                originalNodeColorsRef.current[intersectedNode.userData.id] = intersectedNode.material.color.clone();
            }

            // Change the node color to white
             // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
            intersectedNode.material.color.set(0xffffff);

        } else {
          if (hoveredNodeId !== null && originalNodeColorsRef.current[hoveredNodeId]) {
                const node = nodesRef.current.find(node => node.userData.id === hoveredNodeId);
                if (node) {
                     // @ts-expect-error - Property 'material' does not exist on type 'Object3D<Event>'.
                    node.material.color.copy(originalNodeColorsRef.current[hoveredNodeId]);
                }
            }

            setHoveredNodeId(null);
        }
    };


    canvas.addEventListener('wheel', handleZoom);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);


    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('wheel', handleZoom);
      canvas.removeEventListener('mousemove', handleMouseMove);
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
    node.userData.id = nextNodeId++;
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
      node.userData = { id: nextNodeId++ };
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
    originalNodeColorsRef.current = {};
  };

  const frequencyToColor = (frequency: number): THREE.Color => {
    const red = Math.sin(0.3 * frequency + 0) * 127 + 128;
    const green = Math.sin(0.3 * frequency + 2) * 127 + 128;
    const blue = Math.sin(0.3 * frequency + 4) * 127 + 128;

    return new THREE.Color(red / 255, green / 255, blue / 255);
  };

  const getColorForNumberOfConnections = (normalizedConnections: number): THREE.Color => {
      // Map the normalized connections to the frequency range
      const minFrequency = 400; // Violet
      const maxFrequency = 790; // Red
      const frequency = minFrequency + (normalizedConnections * (maxFrequency - minFrequency));
      return frequencyToColor(frequency);
  };

  const updateCameraPosition = (newZoomLevel: number) => {
    if (cameraRef.current) {
      const maxZoom = 10; // Define the maximum zoom level (10x)
      const zoomFactor = 1 + (newZoomLevel / 100) * (maxZoom - 1);
      cameraRef.current.position.z = maxZoom / zoomFactor;
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
      {hoveredNodeId !== null && (
                <div className="absolute top-0 left-0 bg-black bg-opacity-75 text-white p-2 rounded">
                    Node ID: {hoveredNodeId}
                </div>
            )}
      <div className="flex flex-col md:flex-row items-center justify-center mt-4 gap-4">
         <Card className="w-full max-w-sm bg-[#242424] border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-white">Network Configuration</CardTitle>
            <CardDescription className="text-white">Adjust the network structure.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-gray-400">
            <div className="flex items-center space-x-2">
              <label htmlFor="numNodes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">Nodes</label>
              <Input
                type="number"
                id="numNodes"
                value={numNodes}
                onChange={(e) => setNumNodes(parseInt(e.target.value))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-20 text-black"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="numConnections" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">Connections</label>
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
              <label htmlFor="autoCreateNodes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">Auto Create Nodes</label>
            </div>
            {autoCreateNodes && (
              <div className="flex items-center space-x-2">
                <label htmlFor="creationRate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">Creation Rate (nodes/sec)</label>
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
          <CardHeader className="text-white">
            <CardTitle className="text-white">Animation Controls</CardTitle>
            <CardDescription className="text-white">Control the animation playback.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Button onClick={() => setIsPlaying(!isPlaying)} variant="secondary">
                {isPlaying ? <Icons.pause /> : <Icons.play />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
            <div className="flex flex-col items-start space-y-1">
                <label htmlFor="animationSpeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white">Activation Speed</label>
              <Slider
                id="animationSpeed"
                defaultValue={[animationSpeed]}
                max={5}
                min={0.1}
                step={0.1}
                onValueChange={(value) => setAnimationSpeed(value[0])}
              />
                <span className="text-sm text-muted-foreground">{animationSpeed.toFixed(1)}</span>
            </div>
            <div className="flex flex-col items-start space-y-1">
                <label htmlFor="rotationSpeed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white">Rotation Speed</label>
              <Slider
                id="rotationSpeed"
                defaultValue={[rotationSpeed]}
                max={5}
                min={0.1}
                step={0.1}
                onValueChange={(value) => setRotationSpeed(value[0])}
              />
              <span className="text-sm text-muted-foreground">{rotationSpeed.toFixed(1)}</span>
            </div>
             <div className="flex flex-col items-start space-y-1">
                <label htmlFor="zoomLevel" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white">Zoom</label>
              <Slider
                id="zoomLevel"
                defaultValue={[zoomLevel]}
                max={100}
                min={0}
                step={1}
                onValueChange={(value) => setZoomLevel(value[0])}
              />
                <span className="text-sm text-muted-foreground">{zoomLevel} %</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NeuralNetworkAnimation;


