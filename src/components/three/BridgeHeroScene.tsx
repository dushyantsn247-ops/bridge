import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface BridgeHeroSceneProps {
  variant?: 'hero' | 'assembly' | 'auth';
  scrollProgress?: number;
  className?: string;
}

const detectSoftwareGl = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
};

export const BridgeHeroScene: React.FC<BridgeHeroSceneProps> = ({
  variant = 'hero',
  scrollProgress = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050509, variant === 'auth' ? 0.045 : 0.034);

    const camera = new THREE.PerspectiveCamera(
      variant === 'auth' ? 42 : 45,
      width / Math.max(1, height),
      0.1,
      120
    );
    const baseCamZ = variant === 'auth' ? 9.2 : width < 768 ? 14.5 : 11.4;
    camera.position.set(0, 1.15, baseCamZ);
    camera.lookAt(0, 0.2, 0);

    // Mandatory Studio Environment Reflection (RoomEnvironment + PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Studio & Cyber-Editorial Lighting Rig (Human Next electric blue + cyan + hot magenta + violet)
    const hemiLight = new THREE.HemisphereLight(0x9c65ff, 0x050509, 1.1);
    scene.add(hemiLight);

    const keyBlue = new THREE.DirectionalLight(0x246bfd, 4.2);
    keyBlue.position.set(7, 9, 6);
    if (!isSoftwareGl) {
      keyBlue.castShadow = true;
      keyBlue.shadow.bias = -0.0005;
      keyBlue.shadow.normalBias = 0.02;
    }
    scene.add(keyBlue);

    const rimCyan = new THREE.DirectionalLight(0x00d5ff, 3.4);
    rimCyan.position.set(8, 3, -6);
    scene.add(rimCyan);

    const fillMagenta = new THREE.DirectionalLight(0xf000b8, 3.8);
    fillMagenta.position.set(-8, 4, 5);
    scene.add(fillMagenta);

    const accentViolet = new THREE.PointLight(0x9c65ff, 8, 22, 1.6);
    accentViolet.position.set(0, 2.6, 2.5);
    scene.add(accentViolet);

    // ====================================================
    // COMPOSITE 10-PART LIQUID CHROME SUSPENSION BRIDGE
    // ====================================================
    const bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);

    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    // Materials (varied roughness >= 0.25 across adjacent parts)
    const liquidChromeMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xeef2ff),
      metalness: 0.98,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      iridescence: 0.55,
      iridescenceIOR: 1.35,
      envMapIntensity: 1.85,
    });
    const brushedTitaniumMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x9aa4c4),
      metalness: 0.92,
      roughness: 0.34,
      anisotropy: 0.7,
      clearcoat: 0.4,
      envMapIntensity: 1.25,
    });
    const obsidianDeckMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x101426),
      metalness: 0.65,
      roughness: 0.42,
      envMapIntensity: 0.9,
    });
    const creatorEmissiveMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf000b8),
      emissive: new THREE.Color(0xf000b8),
      emissiveIntensity: 1.9,
      roughness: 0.2,
      metalness: 0.3,
    });
    const brandEmissiveMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x00d5ff),
      emissive: new THREE.Color(0x00d5ff),
      emissiveIntensity: 1.9,
      roughness: 0.2,
      metalness: 0.3,
    });
    materialsToDispose.push(
      liquidChromeMat,
      brushedTitaniumMat,
      obsidianDeckMat,
      creatorEmissiveMat,
      brandEmissiveMat
    );

    const spanHalf = variant === 'auth' ? 3.8 : 5.6;

    // 1. Primary Surreal Liquid Chrome Suspension Arch Curve
    const archPoints: THREE.Vector3[] = [];
    const archSteps = 32;
    for (let i = 0; i <= archSteps; i++) {
      const t = i / archSteps;
      const x = THREE.MathUtils.lerp(-spanHalf, spanHalf, t);
      const archLift = Math.sin(t * Math.PI) * 2.65 - 0.35;
      const organicTwistZ = Math.sin(t * Math.PI * 2) * 1.15;
      archPoints.push(new THREE.Vector3(x, archLift, organicTwistZ));
    }
    const primaryArchCurve = new THREE.CatmullRomCurve3(archPoints);
    const primaryArchGeo = new THREE.TubeGeometry(
      primaryArchCurve,
      isSoftwareGl ? 72 : 128,
      variant === 'auth' ? 0.34 : 0.29,
      isSoftwareGl ? 16 : 28,
      false
    );
    geometriesToDispose.push(primaryArchGeo);
    const primaryArchMesh = new THREE.Mesh(primaryArchGeo, liquidChromeMat);
    bridgeGroup.add(primaryArchMesh);

    // 2. Counter-Twisting Sculptural Chrome Ribbon (Choreo Class sculptural loop)
    const ribbonPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= archSteps; i++) {
      const t = i / archSteps;
      const x = THREE.MathUtils.lerp(-spanHalf, spanHalf, t);
      const y = Math.sin(t * Math.PI * 1.5 - 0.25) * 1.55 + 0.1;
      const z = -Math.sin(t * Math.PI * 2) * 1.25 + Math.cos(t * Math.PI) * 0.35;
      ribbonPoints.push(new THREE.Vector3(x, y, z));
    }
    const counterCurve = new THREE.CatmullRomCurve3(ribbonPoints);
    const counterGeo = new THREE.TubeGeometry(
      counterCurve,
      isSoftwareGl ? 64 : 110,
      0.16,
      isSoftwareGl ? 12 : 22,
      false
    );
    geometriesToDispose.push(counterGeo);
    const counterMesh = new THREE.Mesh(counterGeo, brushedTitaniumMat);
    bridgeGroup.add(counterMesh);

    // 3. Suspended Bridge Deck Pathway Curve
    const deckPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = THREE.MathUtils.lerp(-spanHalf, spanHalf, t);
      const y = Math.sin(t * Math.PI) * 0.35 - 0.85;
      const z = Math.sin(t * Math.PI) * 0.35;
      deckPoints.push(new THREE.Vector3(x, y, z));
    }
    const deckCurve = new THREE.CatmullRomCurve3(deckPoints);
    const deckGeo = new THREE.TubeGeometry(deckCurve, 80, 0.11, 12, false);
    geometriesToDispose.push(deckGeo);
    const deckMesh = new THREE.Mesh(deckGeo, obsidianDeckMat);
    deckMesh.scale.set(1, 0.38, 2.4);
    bridgeGroup.add(deckMesh);

    // 4 & 5. Creator Left Bank Anchor & Brand Right Bank Anchor
    const pylonGeo = new THREE.CylinderGeometry(0.14, 0.28, 3.2, 20);
    const haloGeo = new THREE.TorusGeometry(0.72, 0.035, 16, 48);
    geometriesToDispose.push(pylonGeo, haloGeo);

    const creatorAnchor = new THREE.Group();
    creatorAnchor.position.set(-spanHalf + 0.3, -0.35, 0);
    const leftPylon = new THREE.Mesh(pylonGeo, brushedTitaniumMat);
    const leftHalo = new THREE.Mesh(haloGeo, creatorEmissiveMat);
    leftHalo.rotation.y = Math.PI * 0.36;
    leftHalo.position.y = 0.65;
    creatorAnchor.add(leftPylon, leftHalo);
    bridgeGroup.add(creatorAnchor);

    const brandAnchor = new THREE.Group();
    brandAnchor.position.set(spanHalf - 0.3, -0.35, 0);
    const rightPylon = new THREE.Mesh(pylonGeo, brushedTitaniumMat);
    const rightHalo = new THREE.Mesh(haloGeo, brandEmissiveMat);
    rightHalo.rotation.y = -Math.PI * 0.36;
    rightHalo.position.y = 0.65;
    brandAnchor.add(rightPylon, rightHalo);
    bridgeGroup.add(brandAnchor);

    // 6. Vertical Tension Suspension Cables + 7. Chrome Connection Nodes (InstancedMesh)
    const cableCount = 22;
    const cableUnitGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
    const nodeGeo = new THREE.SphereGeometry(0.065, 14, 14);
    geometriesToDispose.push(cableUnitGeo, nodeGeo);

    const cablesInstanced = new THREE.InstancedMesh(
      cableUnitGeo,
      brushedTitaniumMat,
      cableCount
    );
    const nodesInstanced = new THREE.InstancedMesh(
      nodeGeo,
      liquidChromeMat,
      cableCount
    );

    const dummyObj = new THREE.Object3D();
    const topPt = new THREE.Vector3();
    const botPt = new THREE.Vector3();
    const midPt = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const dirVec = new THREE.Vector3();

    for (let i = 0; i < cableCount; i++) {
      const u = (i + 1) / (cableCount + 1);
      primaryArchCurve.getPointAt(u, topPt);
      deckCurve.getPointAt(u, botPt);
      botPt.y *= 0.38;
      botPt.z *= 2.4;

      const dist = topPt.distanceTo(botPt);
      midPt.addVectors(topPt, botPt).multiplyScalar(0.5);
      dirVec.subVectors(topPt, botPt).normalize();

      dummyObj.position.copy(midPt);
      dummyObj.quaternion.setFromUnitVectors(upAxis, dirVec);
      dummyObj.scale.set(1, dist, 1);
      dummyObj.updateMatrix();
      cablesInstanced.setMatrixAt(i, dummyObj.matrix);

      dummyObj.position.copy(botPt);
      dummyObj.quaternion.identity();
      dummyObj.scale.set(1, 1, 1);
      dummyObj.updateMatrix();
      nodesInstanced.setMatrixAt(i, dummyObj.matrix);
    }
    cablesInstanced.instanceMatrix.needsUpdate = true;
    cablesInstanced.computeBoundingSphere();
    nodesInstanced.instanceMatrix.needsUpdate = true;
    nodesInstanced.computeBoundingSphere();
    bridgeGroup.add(cablesInstanced, nodesInstanced);

    // 8. Animated Light-Pulse Packets Traveling Across the Bridge (Deals & Connections)
    const pulseCount = 14;
    const pulseGeo = new THREE.SphereGeometry(0.075, 12, 12);
    geometriesToDispose.push(pulseGeo);

    const pulseCyanMat = new THREE.MeshBasicMaterial({ color: 0x00d5ff });
    const pulseMagentaMat = new THREE.MeshBasicMaterial({ color: 0xf000b8 });
    materialsToDispose.push(pulseCyanMat, pulseMagentaMat);

    const cyanPulses = new THREE.InstancedMesh(
      pulseGeo,
      pulseCyanMat,
      pulseCount / 2
    );
    const magentaPulses = new THREE.InstancedMesh(
      pulseGeo,
      pulseMagentaMat,
      pulseCount / 2
    );
    cyanPulses.frustumCulled = false;
    magentaPulses.frustumCulled = false;
    bridgeGroup.add(cyanPulses, magentaPulses);

    // 9. Atmospheric Floating Particles (Capped for performance)
    const particleCount = isSoftwareGl ? 90 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 18;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    geometriesToDispose.push(particlesGeo);

    const particlesMat = new THREE.PointsMaterial({
      color: 0x9c65ff,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });
    materialsToDispose.push(particlesMat);
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // 10. Soft Radial Contact Shadow Plane Beneath Sculpture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(36, 107, 253, 0.22)');
      grad.addColorStop(0.5, 'rgba(240, 0, 184, 0.09)');
      grad.addColorStop(1, 'rgba(5, 5, 9, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const groundTex = new THREE.CanvasTexture(shadowCanvas);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    const groundGeo = new THREE.PlaneGeometry(16, 8);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    geometriesToDispose.push(groundGeo);
    materialsToDispose.push(groundMat);
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -2.05;
    scene.add(groundPlane);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pre-allocated math objects for zero GC inside render loop
    const clock = new THREE.Clock();
    const pulseVec = new THREE.Vector3();
    const pulseDummy = new THREE.Object3D();
    let pointerX = 0;
    let pointerY = 0;
    let frameId = 0;
    let unmounted = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      const poll = () => {
        if (unmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (unmounted) return;
      if (document.hidden) {
        frameId = window.setTimeout(tick, 250);
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const sp = scrollRef.current;

      if (!prefersReducedMotion) {
        // Dynamic sculptural breathing & responsive mouse camera damping
        const targetRotY =
          pointerX * 0.42 +
          Math.sin(elapsed * 0.42) * 0.18 +
          (variant === 'assembly' ? (1 - sp) * 0.65 : sp * 0.45);
        const targetRotX = -pointerY * 0.24 + Math.cos(elapsed * 0.35) * 0.08;
        const targetPosY = Math.sin(elapsed * 0.65) * 0.08;

        bridgeGroup.rotation.y = THREE.MathUtils.damp(
          bridgeGroup.rotation.y,
          targetRotY,
          4.5,
          delta
        );
        bridgeGroup.rotation.x = THREE.MathUtils.damp(
          bridgeGroup.rotation.x,
          targetRotX,
          4.5,
          delta
        );
        bridgeGroup.position.y = THREE.MathUtils.damp(
          bridgeGroup.position.y,
          targetPosY,
          3.5,
          delta
        );

        if (variant === 'assembly') {
          const clamped = THREE.MathUtils.clamp(0.35 + sp * 0.65, 0.35, 1);
          primaryArchMesh.scale.setScalar(
            THREE.MathUtils.damp(primaryArchMesh.scale.x, clamped, 4, delta)
          );
          counterMesh.position.y = THREE.MathUtils.damp(
            counterMesh.position.y,
            (1 - clamped) * 1.4,
            4,
            delta
          );
        }

        leftHalo.rotation.z = elapsed * 0.85;
        rightHalo.rotation.z = -elapsed * 0.85;
        particleSystem.rotation.y = elapsed * 0.08;
        particleSystem.rotation.x = Math.sin(elapsed * 0.2) * 0.05;

        // Animate vibrant connection light pulses streaming rapidly across the bridge
        for (let i = 0; i < pulseCount / 2; i++) {
          const u1 = (elapsed * 0.28 + i / (pulseCount / 2)) % 1;
          primaryArchCurve.getPointAt(u1, pulseVec);
          pulseDummy.position.copy(pulseVec);
          const pulseScale = 1.4 + Math.sin(elapsed * 4 + i) * 0.6;
          pulseDummy.scale.set(2.8 * pulseScale, pulseScale, pulseScale);
          pulseDummy.updateMatrix();
          cyanPulses.setMatrixAt(i, pulseDummy.matrix);

          const u2 = (1 - ((elapsed * 0.24 + i / (pulseCount / 2)) % 1) + 1) % 1;
          counterCurve.getPointAt(u2, pulseVec);
          pulseDummy.position.copy(pulseVec);
          pulseDummy.scale.set(2.5 * pulseScale, pulseScale, pulseScale);
          pulseDummy.updateMatrix();
          magentaPulses.setMatrixAt(i, pulseDummy.matrix);
        }
        cyanPulses.instanceMatrix.needsUpdate = true;
        magentaPulses.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      groundTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
    />
  );
};
