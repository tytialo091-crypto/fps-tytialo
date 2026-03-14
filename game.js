// Game State
let gameState = {
  health: 85,
  ammo: 30,
  reserve: 90,
  active: false
};

// DOM Elements
const elements = {
  menu: document.getElementById('menu'),
  canvas: document.getElementById('game-canvas'),
  controls: document.getElementById('controls'),
  hud: document.getElementById('hud'),
  healthFill: document.getElementById('healthFill'),
  ammoSpan: document.getElementById('ammoDisplay'),
  hitmarker: document.getElementById('hitmarker'),
  joystickBase: document.getElementById('joystickBase'),
  joystickKnob: document.getElementById('joystickKnob'),
  fireBtn: document.getElementById('fireBtn'),
  mulaiBtn: document.getElementById('mulaiBtn'),
  sfxTembak: document.getElementById('sfxTembak'),
  sfxKena: document.getElementById('sfxKena'),
  sfxKosong: document.getElementById('sfxKosong')
};

// Three.js Variables
let THREE = window.THREE;
let renderer, scene, camera;
let enemies = [];
let joystickDir = { x: 0, y: 0 };
let joystickActive = false;
let raycaster;

// Initialize Game
function init() {
  setupEventListeners();
}

// Setup All Event Listeners
function setupEventListeners() {
  // Start button
  elements.mulaiBtn.addEventListener('click', startGame);
  elements.mulaiBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startGame();
  });

  // Fire button
  elements.fireBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    fireWeapon();
  });
  elements.fireBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    fireWeapon();
  });

  // Joystick
  setupJoystick();
  
  // Window resize
  window.addEventListener('resize', handleResize);
  
  // Prevent context menu
  elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Joystick Controls
function setupJoystick() {
  const handleStart = (e) => {
    e.preventDefault();
    joystickActive = true;
  };

  const handleMove = (e) => {
    if (!joystickActive) return;
    e.preventDefault();

    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = elements.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxDist = 35;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    elements.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickDir.x = dx / maxDist;
    joystickDir.y = dy / maxDist;
  };

  const handleEnd = (e) => {
    e.preventDefault();
    joystickActive = false;
    elements.joystickKnob.style.transform = 'translate(0px, 0px)';
    joystickDir.x = 0;
    joystickDir.y = 0;
  };

  // Touch events
  elements.joystickBase.addEventListener('touchstart', handleStart, { passive: false });
  elements.joystickBase.addEventListener('touchmove', handleMove, { passive: false });
  elements.joystickBase.addEventListener('touchend', handleEnd);
  elements.joystickBase.addEventListener('touchcancel', handleEnd);
  
  // Mouse events (for testing)
  elements.joystickBase.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
}

// Start the game
function startGame() {
  // Hide menu, show game
  elements.menu.style.display = 'none';
  elements.canvas.style.display = 'block';
  elements.controls.style.display = 'flex';
  elements.hud.style.display = 'flex';
  
  gameState.active = true;
  
  // Reset game state
  gameState.ammo = 30;
  gameState.reserve = 90;
  gameState.health = 85;
  updateUI();
  
  // Initialize 3D if not already
  if (!scene) {
    init3D();
  }
  
  // Start animation loop
  animate();
}

// Initialize Three.js
function init3D() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a3b4a);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 1.6, 8);

  // Lighting
  setupLights();

  // Environment
  createEnvironment();
  
  // Enemies
  createEnemies();
  
  // Raycaster
  raycaster = new THREE.Raycaster();
}

function setupLights() {
  const ambient = new THREE.AmbientLight(0x404060);
  scene.add(ambient);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(2, 5, 5);
  scene.add(dirLight);
  
  const backLight = new THREE.PointLight(0x446688, 0.8);
  backLight.position.set(-2, 3, -2);
  scene.add(backLight);
}

function createEnvironment() {
  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a5a3a });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a });
  const wall1 = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.5), wallMat);
  wall1.position.set(0, 1, -5);
  scene.add(wall1);
}

function createEnemies() {
  // Regular enemies
  for (let i = 0; i < 6; i++) {
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff, 
      emissive: 0x331100 
    });
    const enemy = new THREE.Mesh(geometry, material);
    
    enemy.position.x = (i % 3) * 2.5 - 2.5;
    enemy.position.z = -3 - Math.floor(i / 3) * 3;
    enemy.position.y = 0.5;
    enemy.userData = { hp: 1 };
    
    scene.add(enemy);
    enemies.push(enemy);
  }

  // Boss enemy (2 HP)
  const boss = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2), 
    new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0x331100 })
  );
  boss.position.set(3, 0.8, -4);
  boss.userData = { hp: 2 };
  
  scene.add(boss);
  enemies.push(boss);
}

// Animation Loop
function animate() {
  if (!gameState.active) return;
  
  requestAnimationFrame(animate);

  // Update movement
  updateMovement();

  // Animate enemies
  enemies.forEach(enemy => {
    enemy.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

// Update camera movement based on joystick
function updateMovement() {
  const speed = 0.08;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  
  forward.y = 0;
  right.y = 0;
  forward.normalize();
  right.normalize();

  const moveDelta = new THREE.Vector3();
  
  if (joystickDir.y !== 0) {
    moveDelta.addScaledVector(forward, -joystickDir.y * speed);
  }
  if (joystickDir.x !== 0) {
    moveDelta.addScaledVector(right, joystickDir.x * speed);
  }

  camera.position.add(moveDelta);
  
  // Boundaries
  camera.position.x = Math.min(5, Math.max(-5, camera.position.x));
  camera.position.z = Math.min(10, Math.max(-2, camera.position.z));
}

// Fire weapon
function fireWeapon() {
  if (!gameState.active) return;

  // Play sound
  playSound(elements.sfxTembak);

  if (gameState.ammo <= 0) {
    playSound(elements.sfxKosong);
    showHitmarker('#aaa');
    return;
  }

  gameState.ammo--;
  updateUI();

  // Raycast
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(enemies);

  if (intersects.length > 0) {
    // Hit enemy
    const hit = intersects[0].object;
    playSound(elements.sfxKena);
    
    if (hit.userData.hp !== undefined) {
      hit.userData.hp -= 1;
      if (hit.userData.hp <= 0) {
        scene.remove(hit);
        enemies = enemies.filter(obj => obj !== hit);
      } else {
        hit.material.emissive.setHex(0x442200);
      }
    }
    
    showHitmarker('#f44');
    if (navigator.vibrate) navigator.vibrate(30);
  } else {
    // Miss
    showHitmarker('#aaa');
  }
}

// Play sound with fallback
function playSound(audioElement) {
  if (!audioElement) return;
  
  try {
    const sound = audioElement.cloneNode();
    sound.volume = 0.4;
    sound.play().catch(() => {
      // Fallback to Web Audio API if MP3 fails
      playFallbackSound();
    });
  } catch (e) {
    playFallbackSound();
  }
}

// Fallback sound using Web Audio API
function playFallbackSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => generateSound(audioCtx));
    } else {
      generateSound(audioCtx);
    }
  } catch (e) {}
}

function generateSound(audioCtx) {
  const duration = 0.15;
  const sampleRate = audioCtx.sampleRate;
  const frameCount = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate;
    const noise = Math.random() * 2 - 1;
    const freq = 200 * Math.exp(-t * 15);
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.4;
    const env = Math.exp(-t * 20);
    channelData[i] = (noise * 0.3 + tone) * env;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

// Show hit marker
function showHitmarker(color) {
  elements.hitmarker.style.color = color;
  elements.hitmarker.style.opacity = 1;
  setTimeout(() => {
    elements.hitmarker.style.opacity = '0';
  }, 150);
}

// Update UI (ammo, health)
function updateUI() {
  elements.ammoSpan.innerText = `${gameState.ammo} / ${gameState.reserve}`;
  elements.healthFill.style.width = gameState.health + '%';
}

// Handle window resize
function handleResize() {
  if (renderer && camera) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

// Initialize everything when page loads
window.addEventListener('load', init);
