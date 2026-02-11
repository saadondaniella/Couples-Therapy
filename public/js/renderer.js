/**
 * Renderer Module
 * Handles Three.js scene initialization, camera, lights, HDRI, shadows, and render loop
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { RGBELoader } from "https://esm.sh/three@0.152.2/examples/jsm/loaders/RGBELoader.js";

import {
  CAMERA_CONFIG,
  RENDER_CONFIG,
  LIGHTING_CONFIG,
  ANIMATION_CONFIG,
  HDRI_CONFIG,
  LIQUID_GLASS_CONFIG,
} from "./config.js";

import { updateAnimations } from "./animator.js";
import { updateLiquidGlassShader } from "./liquidglassshader.js";

// ═══════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════

let renderer = null;
let scene = null;
let camera = null;
let raycaster = null;
let container = null;
let clock = new THREE.Clock();
let animationFrameId = null;
let resizeTimeout = null;
let envMap = null;
let shadowCatcher = null;

// External references
let cardsArray = [];
let onCardClickCallback = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export async function initRenderer(onCardClick) {
  onCardClickCallback = onCardClick;

  // Setup container
  const grid = document.getElementById("cardGrid");

  if (grid) {
    container = grid;
    container.style.position ||= "relative";
    container.style.overflow = "hidden";
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
    container.style.width ||= "100%";
    container.style.height ||= "100%";
  } else {
    container = document.createElement("div");
    container.id = "threejs-root";
    container.style.position = "absolute";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.minWidth = `${RENDER_CONFIG.MIN_WIDTH}px`;
    container.style.minHeight = `${RENDER_CONFIG.MIN_HEIGHT}px`;
    document.body.appendChild(container);
  }

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: RENDER_CONFIG.ANTIALIAS,
    alpha: RENDER_CONFIG.ALPHA,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.MAX_DPR);
  renderer.setPixelRatio(dpr);

  const cw = Math.max(
    RENDER_CONFIG.MIN_WIDTH,
    container.clientWidth || window.innerWidth
  );
  const ch = Math.max(
    RENDER_CONFIG.MIN_HEIGHT,
    container.clientHeight || window.innerHeight
  );

  renderer.setSize(cw, ch, false);

  container.querySelector("canvas")?.remove();
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // ═══════════════════════════════════════════════════════════════════════════
  // HDRI LOADING (PROPER PMREM)
  // ═══════════════════════════════════════════════════════════════════════════

  if (HDRI_CONFIG.ENABLED) {
    try {
      console.log("🌅 Loading HDRI...");
      envMap = await loadHDRI(HDRI_CONFIG.PATH);

      scene.environment = envMap;

      if (HDRI_CONFIG.SHOW_AS_BACKGROUND) {
        scene.background = envMap;
      } else {
        scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
      }

      console.log("✅ HDRI loaded (PMREM processed)");
    } catch (err) {
      console.warn("⚠️ HDRI failed, using fallback:", err);
      envMap = createFallbackEnvMap();
      scene.environment = envMap;
      scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
    }
  } else {
    envMap = createFallbackEnvMap();
    scene.environment = envMap;
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
  }

  // Camera
  camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    cw / ch,
    0.1,
    2000
  );

  const angleRad = THREE.MathUtils.degToRad(CAMERA_CONFIG.TILT_ANGLE);
  const cameraZ = 10;
  const cameraY = Math.tan(angleRad) * cameraZ;

  camera.position.set(0, cameraY, cameraZ);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(
    LIGHTING_CONFIG.AMBIENT_COLOR,
    LIGHTING_CONFIG.AMBIENT_INTENSITY
  );
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(
    LIGHTING_CONFIG.DIRECTIONAL_COLOR,
    LIGHTING_CONFIG.DIRECTIONAL_INTENSITY
  );
  dir.position.set(
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.x,
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.y,
    LIGHTING_CONFIG.DIRECTIONAL_POSITION.z
  );
  scene.add(dir);

  if (LIGHTING_CONFIG.SHADOW_LIGHT_ENABLED && RENDER_CONFIG.SHADOWS_ENABLED) {
    const shadowLight = new THREE.DirectionalLight(
      0xffffff,
      LIGHTING_CONFIG.SHADOW_LIGHT_INTENSITY
    );

    shadowLight.position.set(
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.x,
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.y,
      LIGHTING_CONFIG.SHADOW_LIGHT_POSITION.z
    );

    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(
      RENDER_CONFIG.SHADOW_MAP_SIZE,
      RENDER_CONFIG.SHADOW_MAP_SIZE
    );

    shadowLight.shadow.bias = RENDER_CONFIG.SHADOW_BIAS;
    shadowLight.shadow.radius = RENDER_CONFIG.SHADOW_RADIUS;

    scene.add(shadowLight);
  }

  if (RENDER_CONFIG.SHADOWS_ENABLED) {
    createShadowCatcher();
  }

  raycaster = new THREE.Raycaster();

  window.addEventListener("resize", handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleResize);
  }
  window.addEventListener("click", onPointerClick);

  onWindowResize();
  startRenderLoop();

  return { scene, camera, renderer, envMap };
}

// ═══════════════════════════════════════════════════════════════════════════
// HDRI LOADER
// ═══════════════════════════════════════════════════════════════════════════

function loadHDRI(path) {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      path,
      (texture) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const env = pmrem.fromEquirectangular(texture).texture;

        texture.dispose();
        pmrem.dispose();

        resolve(env);
      },
      undefined,
      reject
    );
  });
}

function createFallbackEnvMap() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tempScene = new THREE.Scene();
  tempScene.background = new THREE.Color(0x87ceeb);

  const env = pmrem.fromScene(tempScene).texture;
  pmrem.dispose();

  return env;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW CATCHER
// ═══════════════════════════════════════════════════════════════════════════

function createShadowCatcher() {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.ShadowMaterial({ opacity: 0.3 });

  shadowCatcher = new THREE.Mesh(geometry, material);
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.01;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.name = "shadowCatcher";

  scene.add(shadowCatcher);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateAnimations(cardsArray, delta);

  if (LIQUID_GLASS_CONFIG.ENABLED && envMap) {
    cardsArray.forEach((card) => {
      if (card.backMesh?.material?.uniforms) {
        updateLiquidGlassShader(card.backMesh.material, delta);
      }
    });
  }

  renderer.render(scene, camera);
}

function startRenderLoop() {
  if (!animationFrameId) animate();
}

export function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════════════════════════════════════

function onWindowResize() {
  if (!camera || !renderer || !container) return;

  let w = container.clientWidth || window.innerWidth;
  let h = container.clientHeight || window.innerHeight;

  w = Math.max(w, RENDER_CONFIG.MIN_WIDTH);
  h = Math.max(h, RENDER_CONFIG.MIN_HEIGHT);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const dpr = Math.min(window.devicePixelRatio || 1, RENDER_CONFIG.MAX_DPR);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
}

function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(onWindowResize, ANIMATION_CONFIG.RESIZE_DEBOUNCE);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLICK HANDLING
// ═══════════════════════════════════════════════════════════════════════════

function onPointerClick(event) {
  if (!camera || !raycaster || cardsArray.length === 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera({ x, y }, camera);
  const intersects = raycaster.intersectObjects(
    cardsArray.map((c) => c.mesh),
    true
  );

  if (intersects.length === 0) return;

  let obj = intersects[0].object;
  while (obj && !obj.userData?.cardId) obj = obj.parent;
  if (!obj) return;

  if (onCardClickCallback) {
    onCardClickCallback(obj.userData.cardId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API (ALL ORIGINAL)
// ═══════════════════════════════════════════════════════════════════════════

export function setCardsArray(cards) {
  cardsArray = cards;
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function getRenderer() {
  return renderer;
}

export function getEnvMap() {
  return envMap;
}

export function triggerResize() {
  onWindowResize();
}

export function setHDRIBackgroundVisible(visible) {
  if (!scene || !envMap) return;

  if (visible) {
    scene.background = envMap;
  } else {
    scene.background = new THREE.Color(RENDER_CONFIG.BACKGROUND_COLOR);
  }

  console.log(`🌅 HDRI background ${visible ? "shown" : "hidden"}`);
}
