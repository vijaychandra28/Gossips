import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Hero3D = ({ isLight }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 8;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Accent Point Lights
    const blueLight = new THREE.PointLight(0x4f8cff, 8, 15);
    blueLight.position.set(3, 3, 2);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(0x6ea8fe, 6, 15);
    cyanLight.position.set(-3, -3, 2);
    scene.add(cyanLight);

    const whiteLight = new THREE.DirectionalLight(0xffffff, 0.8);
    whiteLight.position.set(0, 5, 5);
    scene.add(whiteLight);

    // --- GEOMETRIES & MATERIALS ---
    // Create a group for the entire lock and connection elements
    const lockGroup = new THREE.Group();

    // Material - Translucent glass-like material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8cb9ff,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.65,
      transmission: 0.6, // Glass refraction
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f8cff,
      metalness: 0.9,
      roughness: 0.2,
    });

    // 1. Lock Body (Chamfered Cylinder/Box)
    const bodyGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.6, 32);
    bodyGeom.rotateX(Math.PI / 2);
    const lockBody = new THREE.Mesh(bodyGeom, glassMaterial);
    lockGroup.add(lockBody);

    // 2. Lock Shackle (Torus)
    const shackleGeom = new THREE.TorusGeometry(0.7, 0.18, 16, 64, Math.PI);
    const lockShackle = new THREE.Mesh(shackleGeom, metalMaterial);
    lockShackle.position.y = 1.0;
    lockGroup.add(lockShackle);

    // 3. Keyhole (Small Cylinder)
    const keyholeGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16);
    keyholeGeom.rotateX(Math.PI / 2);
    const keyhole = new THREE.Mesh(keyholeGeom, metalMaterial);
    keyhole.position.z = 0.05;
    lockGroup.add(keyhole);

    // 4. Orbiting File/Folder planes
    const fileGroup1 = new THREE.Group();
    const fileGeom = new THREE.BoxGeometry(0.6, 0.8, 0.04);
    const fileMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6ea8fe,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      transmission: 0.8,
      thickness: 0.5,
    });
    const fileMesh1 = new THREE.Mesh(fileGeom, fileMaterial);
    // Bend one corner by editing geometry slightly (simulating folded page)
    fileMesh1.rotation.y = 0.4;
    fileGroup1.add(fileMesh1);
    scene.add(fileGroup1);

    const fileGroup2 = new THREE.Group();
    const fileMesh2 = new THREE.Mesh(fileGeom, fileMaterial);
    fileMesh2.rotation.y = -0.4;
    fileGroup2.add(fileMesh2);
    scene.add(fileGroup2);

    scene.add(lockGroup);

    // Grid connection lines helper
    const connectionGroup = new THREE.Group();
    const points = [];
    for (let i = 0; i < 30; i++) {
      points.push(new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      ));
    }
    
    // Add small connection dots
    const dotGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.7 });
    points.forEach(p => {
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(p);
      connectionGroup.add(dot);
    });
    scene.add(connectionGroup);

    // --- INTERACTION / ANIMATION MOUSE PARALLAX ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseX = (x / rect.width - 0.5) * 2; // Range [-1, 1]
      mouseY = (y / rect.height - 0.5) * 2;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Interpolate mouse movements for smoothness
      targetX += (mouseX - targetX) * 0.08;
      targetY += (mouseY - targetY) * 0.08;

      // Lock Group Rotations
      lockGroup.rotation.y = elapsedTime * 0.5 + targetX * 0.8;
      lockGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.1 + targetY * 0.5;
      lockGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;

      // File orbits
      const radius = 2.4;
      fileGroup1.position.x = Math.cos(elapsedTime * 0.6) * radius;
      fileGroup1.position.z = Math.sin(elapsedTime * 0.6) * radius;
      fileGroup1.position.y = Math.sin(elapsedTime * 1.2) * 0.3;
      fileGroup1.rotation.y = -elapsedTime * 0.6 + Math.PI / 2;

      fileGroup2.position.x = Math.cos(elapsedTime * 0.6 + Math.PI) * radius;
      fileGroup2.position.z = Math.sin(elapsedTime * 0.6 + Math.PI) * radius;
      fileGroup2.position.y = Math.cos(elapsedTime * 1.2) * 0.3;
      fileGroup2.rotation.y = -elapsedTime * 0.6 - Math.PI / 2;

      // Connection group drift
      connectionGroup.rotation.y = elapsedTime * 0.1;
      connectionGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.05;

      // Render
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    let animationFrameId = requestAnimationFrame(animate);

    // --- RESIZE HANDLER ---
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanups
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isLight]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] md:min-h-[400px] flex items-center justify-center relative z-10" 
    />
  );
};

export default Hero3D;
