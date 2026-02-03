import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";

/**
 * Base
 */
// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

/**
 * Update all materials
 */
const updateAllMaterials = () => {
	scene.traverse((child) => {
		if (
			child instanceof THREE.Mesh &&
			child.material instanceof THREE.MeshStandardMaterial
		) {
			child.material.envMapIntensity = 1;
			child.material.needsUpdate = true;
			child.castShadow = true;
			child.receiveShadow = true;
		}
	});
};

scene.background = new THREE.Color(0x222222);

/**
 * Material
 */

// Textures
const mapTexture = textureLoader.load("./models/LeePerrySmith/color.jpg");
mapTexture.colorSpace = THREE.SRGBColorSpace;
const normalTexture = textureLoader.load("./models/LeePerrySmith/normal.jpg");

// Material
const material = new THREE.MeshStandardMaterial({
	map: mapTexture,
	normalMap: normalTexture,
});

const depthMaterial = new THREE.MeshDepthMaterial({
	depthPacking: THREE.RGBADepthPacking,
});

const customUniforms = {
	uTime: { value: 0 },
};

// Material modifications
material.onBeforeCompile = (shader) => {
	shader.uniforms.uTime = customUniforms.uTime;

	shader.vertexShader = shader.vertexShader.replace(
		"#include <common>",
		`
            #include <common>

            uniform float uTime;

            mat2 get2dRotateMatrix(float _angle){
                return mat2(cos(_angle), - sin(_angle), sin(_angle), cos(_angle));
            }
        `,
	);
	shader.vertexShader = shader.vertexShader.replace(
		"#include <beginnormal_vertex>",
		`
        #include <beginnormal_vertex>

        float angle = (sin(position.y + uTime)) * 0.5;
        mat2 rotateMatrix = get2dRotateMatrix(angle);

        objectNormal.xz = rotateMatrix * objectNormal.xz;
        `,
	);

	shader.vertexShader = shader.vertexShader.replace(
		"#include <begin_vertex>",
		`
        #include <begin_vertex>

        transformed.xz = rotateMatrix * transformed.xz;
        `,
	);
};

// Depth material modifications (for shadows)
depthMaterial.onBeforeCompile = (shader) => {
	shader.uniforms.uTime = customUniforms.uTime;
	shader.vertexShader = shader.vertexShader.replace(
		"#include <common>",
		`
        #include <common>

        uniform float uTime;

        mat2 get2dRotateMatrix(float _angle){
            return mat2(cos(_angle), - sin(_angle), sin(_angle), cos(_angle));
        }
        `,
	);
	shader.vertexShader = shader.vertexShader.replace(
		"#include <begin_vertex>",
		`
        #include <begin_vertex>
        float angle = sin(position.y + uTime) * 0.5;
        mat2 rotateMatrix = get2dRotateMatrix(angle);
        transformed.xz = rotateMatrix * transformed.xz;
        `,
	);
};

/**
 * Models
 */
gltfLoader.load("/models/LeePerrySmith/LeePerrySmith.glb", (gltf) => {
	// Model
	const mesh = gltf.scene.children[0];
	mesh.rotation.y = Math.PI * 0.5;
	mesh.material = material;
	mesh.customDepthMaterial = depthMaterial;
	scene.add(mesh);

	// Update materials
	updateAllMaterials();
});

// Planes
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const planeGeometry = new THREE.PlaneGeometry(16, 16);

const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.castShadow = false;
ground.material.side = THREE.DoubleSide;

const wallLeft = new THREE.Mesh(planeGeometry, planeMaterial);
wallLeft.castShadow = false;
wallLeft.material.side = THREE.DoubleSide;

const wallRight = new THREE.Mesh(planeGeometry, planeMaterial);
wallRight.castShadow = false;
wallRight.material.side = THREE.DoubleSide;

ground.rotation.x = -Math.PI * 0.5;
ground.position.y = -5;
scene.add(ground);

wallLeft.rotation.y = -Math.PI;
wallLeft.position.z = 8;
wallLeft.position.y = 3;
scene.add(wallLeft);

wallRight.rotation.y = Math.PI / 2;
wallRight.position.x = -8;
wallRight.position.y = 3;
scene.add(wallRight);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(1, 0.65, -2.3);
scene.add(directionalLight);

// GUI controls for light
gui
	.add(directionalLight.position, "x")
	.min(-1)
	.max(10)
	.step(0.01)
	.name("Light X");
gui
	.add(directionalLight.position, "y")
	.min(-1.5)
	.max(5)
	.step(0.01)
	.name("Light Y");
gui
	.add(directionalLight.position, "z")
	.min(-10)
	.max(1)
	.step(0.01)
	.name("Light Z");
gui
	.add(directionalLight, "intensity")
	.min(0)
	.max(10)
	.step(0.01)
	.name("Light Intensity");

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100,
);
camera.position.set(6, 1, -6);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
	const elapsedTime = clock.getElapsedTime();

	// Update custom uniforms
	customUniforms.uTime.value = elapsedTime;

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
