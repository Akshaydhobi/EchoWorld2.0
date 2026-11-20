import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Eye, EyeOff, Pause, Play, StepForward } from 'lucide-react';
import type { AgentComposite } from '../../types/simulation.ts';
import type { Building, BuildingType, CommunityId, WorldState } from '../../types/world.ts';

interface EchoCityCanvasProps {
  world: WorldState;
  agents: AgentComposite[];
  selectedBuildingId: string | null;
  onSelectBuilding: (building: Building) => void;
  onSelectAgent: (agentId: string) => void;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
}

type CameraPreset = 'overview' | CommunityId;

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [0, 42, 62], target: [0, 0, 0] },
  greenfield: { pos: [-32, 22, 26], target: [-32, 0, 0] },
  metrocore: { pos: [0, 24, 28], target: [0, 0, 0] },
  novadistrict: { pos: [32, 22, 26], target: [32, 0, 0] },
};

const BUILDING_COLORS: Record<BuildingType, number> = {
  residential: 0x3b82f6,
  business_centre: 0x8b5cf6,
  farm: 0x10b981,
  research_lab: 0x06b6d4,
  hospital: 0xf43f5e,
  school: 0xf59e0b,
  market: 0xec4899,
  energy_facility: 0x22d3ee,
  road_transit: 0x64748b,
  park: 0x34d399,
};

const COMMUNITY_COLORS: Record<CommunityId, number> = {
  greenfield: 0x10b981,
  metrocore: 0x06b6d4,
  novadistrict: 0x8b5cf6,
};

function createCompositeBuilding(building: Building): THREE.Group {
  const group = new THREE.Group();
  group.position.set(building.position.x, 0, building.position.z);
  const accentHex = BUILDING_COLORS[building.type];

  // 1. Grounded foundation plinth (primary anchor, bottom at y = 0)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.15,
  });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.4, 5.2), plinthMat);
  plinth.position.y = 0.2;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.42,
    metalness: 0.48,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.25,
    metalness: 0.72,
    emissive: accentHex,
    emissiveIntensity: 0.18,
  });

  if (building.type === 'park') {
    const lawn = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.5, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.85, metalness: 0.05 }),
    );
    lawn.position.y = 0.5;
    group.add(lawn);

    const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.4, 8), accentMat);
    pavilion.position.y = 1.3;
    group.add(pavilion);

    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.8, 8), bodyMat);
    canopy.position.y = 2.4;
    group.add(canopy);
  } else if (building.type === 'farm') {
    const bayLeft = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 4.0), bodyMat);
    bayLeft.position.set(-1.1, 1.1, 0);
    bayLeft.castShadow = true;
    group.add(bayLeft);

    const bayRight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 4.0), bodyMat);
    bayRight.position.set(1.1, 1.1, 0);
    bayRight.castShadow = true;
    group.add(bayRight);

    const roofRib = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.1, 12, 1, false, 0, Math.PI), accentMat);
    roofRib.rotation.z = Math.PI / 2;
    roofRib.rotation.y = Math.PI / 2;
    roofRib.position.y = 1.8;
    group.add(roofRib);
  } else if (building.type === 'research_lab' || building.type === 'energy_facility') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 3.8, 8), bodyMat);
    core.position.y = 2.3;
    core.castShadow = true;
    group.add(core);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.16, 10, 24), accentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 3.6;
    group.add(halo);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.1, 8), accentMat);
    spire.position.y = 5.2;
    group.add(spire);
  } else if (building.type === 'road_transit') {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.6, 2.8), bodyMat);
    deck.position.y = 0.7;
    group.add(deck);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.18, 8, 20, Math.PI), accentMat);
    arch.position.y = 1.0;
    group.add(arch);
  } else {
    const height =
      building.type === 'business_centre'
        ? 6.4
        : building.type === 'residential'
          ? 4.6
          : building.type === 'hospital'
            ? 4.2
            : 3.2;

    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.6, height, 3.6), bodyMat);
    tower.position.y = 0.4 + height / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 3.8), accentMat);
    crown.position.y = 0.4 + height + 0.18;
    group.add(crown);

    const beacon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), accentMat);
    beacon.position.y = 0.4 + height + 0.7;
    group.add(beacon);
  }

  // Invisible raycast proxy on layer 1 for fast crisp clicking
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 7.2, 5.2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitProxy.position.y = 3.6;
  hitProxy.layers.set(1);
  hitProxy.userData = { kind: 'building', building };
  group.add(hitProxy);

  return group;
}

export function EchoCityCanvas({
  world,
  agents,
  selectedBuildingId,
  onSelectBuilding,
  onSelectAgent,
  onStart,
  onPause,
  onStep,
}: EchoCityCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('overview');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const agentsRef = useRef<AgentComposite[]>(agents);
  const selectedBuildingRef = useRef<string | null>(selectedBuildingId);
  const callbacksRef = useRef({ onSelectBuilding, onSelectAgent });
  const presetRef = useRef<CameraPreset>('overview');
  const transitionActiveRef = useRef(false);

  agentsRef.current = agents;
  selectedBuildingRef.current = selectedBuildingId;
  callbacksRef.current = { onSelectBuilding, onSelectAgent };

  const handlePresetClick = (next: CameraPreset) => {
    setPreset(next);
    presetRef.current = next;
    transitionActiveRef.current = true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL unavailable on this device.');
      return;
    }

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 460;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D WebGL context lost. Reload view to restore.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.0055);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 350);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 12;
    controls.maxDistance = 115;
    controls.target.set(...CAMERA_PRESETS.overview.target);

    controls.addEventListener('start', () => {
      transitionActiveRef.current = false;
    });

    // Balanced warm/cool lighting rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
    keyLight.position.set(36, 54, 28);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -58;
    keyLight.shadow.camera.right = 58;
    keyLight.shadow.camera.top = 34;
    keyLight.shadow.camera.bottom = -34;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-40, 26, -32);
    scene.add(rimLight);

    // Extended landscape ground + subtle grid
    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 220),
      new THREE.MeshStandardMaterial({ color: 0x0a101d, roughness: 0.92, metalness: 0.05 }),
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    const grid = new THREE.GridHelper(130, 52, 0x1e293b, 0x111827);
    grid.position.y = 0.02;
    scene.add(grid);

    // Three district pads + arterial transit road linking Greenfield <-> MetroCore <-> NovaDistrict
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    });
    const highway = new THREE.Mesh(new THREE.BoxGeometry(88, 0.08, 3.4), roadMat);
    highway.position.set(0, 0.05, 0);
    highway.receiveShadow = true;
    scene.add(highway);

    for (const comm of world.communities) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(27, 0.12, 27),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.85,
          metalness: 0.1,
        }),
      );
      pad.position.set(comm.center.x, 0.06, comm.center.z);
      pad.receiveShadow = true;
      scene.add(pad);

      const borderRing = new THREE.LineLoop(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(27.2, 0.14, 27.2)),
        new THREE.LineBasicMaterial({ color: COMMUNITY_COLORS[comm.id] }),
      );
      borderRing.position.set(comm.center.x, 0.08, comm.center.z);
      scene.add(borderRing);

      for (const building of comm.buildings) {
        const bGroup = createCompositeBuilding(building);
        scene.add(bGroup);
      }
    }

    // Instanced trees around Greenfield perimeter
    const treeGeo = new THREE.ConeGeometry(0.65, 2.2, 6);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 });
    const treeCount = 28;
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 15 + (i % 3) * 1.6;
      dummy.position.set(-32 + Math.cos(angle) * radius, 1.1, Math.sin(angle) * radius);
      dummy.scale.setScalar(0.85 + (i % 4) * 0.12);
      dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
    }
    trees.computeBoundingSphere();
    scene.add(trees);

    // 30 Autonomous Agent Markers (composite capsule + floating indicator ring)
    const agentMeshes = new Map<string, { group: THREE.Group; target: THREE.Vector3 }>();
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.75, 4, 8);
    const hitGeo = new THREE.SphereGeometry(1.15, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    for (const agent of agentsRef.current) {
      const group = new THREE.Group();
      const colorHex = COMMUNITY_COLORS[agent.state.currentCommunity];
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.5,
      });
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = 0.85;
      body.castShadow = !isSoftwareGl;
      group.add(body);

      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.y = 0.9;
      hit.layers.set(1);
      hit.userData = { kind: 'agent', agentId: agent.id };
      group.add(hit);

      group.position.set(agent.state.position.x, 0, agent.state.position.z);
      scene.add(group);
      agentMeshes.set(agent.id, {
        group,
        target: new THREE.Vector3(agent.state.position.x, 0, agent.state.position.z),
      });
    }

    // Pre-allocated vectors for zero GC render loop
    const _camTargetPos = new THREE.Vector3();
    const _lookTargetPos = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    let pointerDownPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drag
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data?.kind === 'agent' && data.agentId) {
          callbacksRef.current.onSelectAgent(data.agentId);
        } else if (data?.kind === 'building' && data.building) {
          callbacksRef.current.onSelectBuilding(data.building);
        }
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(0.1, clock.getDelta());

      // Smoothly move each of the 30 agents toward current tick target
      for (const agent of agentsRef.current) {
        const entry = agentMeshes.get(agent.id);
        if (entry) {
          entry.target.set(agent.state.position.x, 0, agent.state.position.z);
          entry.group.position.x = THREE.MathUtils.damp(entry.group.position.x, entry.target.x, 6, dt);
          entry.group.position.z = THREE.MathUtils.damp(entry.group.position.z, entry.target.z, 6, dt);
        }
      }

      if (transitionActiveRef.current) {
        const cfg = CAMERA_PRESETS[presetRef.current];
        _camTargetPos.set(...cfg.pos);
        _lookTargetPos.set(...cfg.target);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 6, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 6, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 6, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _lookTargetPos.x, 6, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _lookTargetPos.y, 6, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _lookTargetPos.z, 6, dt);

        if (camera.position.distanceTo(_camTargetPos) < 0.25) {
          transitionActiveRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      renderer.dispose();
    };
  }, [world.id]);

  return (
    <div className="relative w-full h-[460px] rounded-xl border border-slate-800 bg-[#070B14] overflow-hidden">
      {webglError ? (
        <div className="w-full h-full flex items-center justify-center text-sm text-slate-400 p-6">
          {webglError}
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Top-Left Minimal Legend */}
      <div className="pointer-events-none absolute top-4 left-4 rounded-lg bg-[#0B1220]/90 border border-slate-800 px-3 py-2 text-xs text-slate-300">
        <div className="font-medium text-white">Echo City 3D Viewport</div>
        <div className="text-slate-400 mt-0.5">
          Click any building or agent marker to inspect · Drag to orbit
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Center Occlusion) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
        <button
          type="button"
          onClick={() => setHudCollapsed((c) => !c)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-[#0B1220]/95 border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
        >
          {hudCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {hudCollapsed ? 'Show Controls' : 'Hide Controls'}
        </button>

        {!hudCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#0B1220]/95 border border-slate-800 px-3 py-2 shadow-lg">
            <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
              {world.status === 'running' ? (
                <button
                  type="button"
                  onClick={onPause}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 whitespace-nowrap"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start
                </button>
              )}
              <button
                type="button"
                onClick={onStep}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold whitespace-nowrap"
              >
                <StepForward className="w-3.5 h-3.5" />
                Step
              </button>
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'overview', label: 'City Overview' },
                  { id: 'greenfield', label: 'Greenfield' },
                  { id: 'metrocore', label: 'MetroCore' },
                  { id: 'novadistrict', label: 'NovaDistrict' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePresetClick(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    preset === item.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
