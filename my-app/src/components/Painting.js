/** @format */
import {
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	PerspectiveCamera,
	Points,
	RawShaderMaterial,
	Scene,
	TextureLoader,
	Vector4,
	WebGLRenderer,
} from 'https://cdn.skypack.dev/three@0.136.0';
import { GPUComputationRenderer } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/misc/GPUComputationRenderer';
import './Painting.css';

// ------------------------ //
// CONSTANTS

const WIDTH = 2160;
const HEIGHT = 2700;
const ASPECT = WIDTH / HEIGHT;
const AMOUNT = WIDTH * HEIGHT;
const PR = Math.min(devicePixelRatio, 2);
const imgSrc =
	'https://images.unsplash.com/photo-1677154593482-1c1158beb8e3?q=80&w=2160&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
let pointSizeScale = Math.min(window.innerWidth, window.innerHeight) / 162;

// ------------------------ //
// SETUP
const scene = new Scene();

const camera = new PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	120
);
camera.position.set(0, 0, 5);

const f = Math.tan((camera.fov * Math.PI) / 360);
let originYScale = f * camera.position.distanceTo(scene.position);
let originXScale = originYScale * camera.aspect;

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(PR);
document.body.append(renderer.domElement);

const loader = new TextureLoader();
const image = loader.load(imgSrc);

const gpu = new GPUComputationRenderer(WIDTH, HEIGHT, renderer);

// ------------------------ //
// POINTER

const pointer = new Vector4(0, 0, 0, 0);
const prevPointer = new Vector4(0, 0, 0, 0);

// eslint-disable-next-line no-restricted-globals
addEventListener('pointermove', (e) => {
	prevPointer.copy(pointer);

	pointer.x = ((e.clientX / window.innerWidth) * 2 - 1) * originXScale;
	pointer.y = ((e.clientY / window.innerHeight) * -2 + 1) * originYScale;

	const [dx, dy] = [pointer.x - prevPointer.x, pointer.y - prevPointer.y];
	pointer.w += Math.sqrt(dx * dx + dy * dy);

	points.rotation.y = pointer.x / 34;
	points.rotation.x = -pointer.y / 34;
});

const dampPointer = () => (pointer.w *= 0.9);

// ------------------------ //

// PARTICLE TEXTURE

const ctx = document.createElement('canvas').getContext('2d');
ctx.canvas.width = ctx.canvas.height = 50;

ctx.fillStyle = '#000';
ctx.fillRect(0, 0, 50, 50);
const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
grd.addColorStop(0, '#fff');
grd.addColorStop(1, '#0000');
ctx.fillStyle = grd;
ctx.fillRect(0, 0, 200, 200);

const alpha = new CanvasTexture(ctx.canvas);

// ------------------------ //
// MESH

const geometry = new BufferGeometry();

const initialPositions = new Float32Array(AMOUNT * 4);
const refs = new Float32Array(AMOUNT * 2);

for (let i = 0; i < AMOUNT; i++) {
	const u = (i % WIDTH) / WIDTH;
	const v = ((i / WIDTH) | 0) / HEIGHT;

	const rx = Math.random() * 0.014 - 0.007;
	const ry = Math.random() * 0.014 - 0.007;

	const i4 = i * 4;
	initialPositions[i4 + 0] = (u * 2 - 1) * ASPECT * 2 + rx;
	initialPositions[i4 + 1] = (v * 2 - 1) * 2 + ry;
	initialPositions[i4 + 2] = 0;
	initialPositions[i4 + 3] = 1;

	const i2 = i * 2;
	refs[i2 + 0] = u;
	refs[i2 + 1] = v;
}

geometry.setAttribute('position', new BufferAttribute(initialPositions, 4));
geometry.setAttribute('ref', new BufferAttribute(refs, 2));

const material = new RawShaderMaterial({
	uniforms: {
		size: { value: PR * pointSizeScale },
		positionTexture: { value: null },
		imageTexture: { value: image },
		alphaTexture: { value: alpha },
	},

	vertexShader: `
precision mediump float;

attribute vec2 ref;

uniform float size;
uniform sampler2D positionTexture;
uniform sampler2D imageTexture;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float map;

void main() {

  vec4 position = texture2D(positionTexture, ref);
  map = texture2D(imageTexture, ref).r;

  position.z += map - 0.5;

  vec4 mvPosition = modelViewMatrix * position;
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * (0.38 + map * 0.62);

}
`,

	fragmentShader: `
precision highp float;
uniform sampler2D alphaTexture;
varying float map;

void main() {
  vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  float a = texture2D(alphaTexture, uv).g;
  if (a < 0.05) discard;

  gl_FragColor = vec4(vec3(1.0), (0.2 + 0.9 * map) * a);
}
`,

	transparent: true,
	depthTest: false,
	depthWrite: false,
});

const points = new Points(geometry, material);
scene.add(points);

// ------------------------ //
// GPU COMPUTER

const velocityTexture = gpu.createTexture();

const initialPositionTexture = gpu.createTexture();
initialPositionTexture.image.data.set(initialPositions);

const responsePositionTexture = gpu.createTexture();
responsePositionTexture.image.data.set(initialPositions);

const velocityMaterial = gpu.createShaderMaterial(
	`
uniform mat4 modelViewMatrix;
uniform sampler2D initialPositionTexture;
uniform sampler2D responsePositionTexture;
uniform sampler2D velocityTexture;
uniform vec4 pointer;

const float LEN = 3.0;



void main() {

  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 initialPosition = texture(initialPositionTexture, uv).xy;
  vec2 responsePosition = texture(responsePositionTexture, uv).xy;
  vec2 velocity = texture(velocityTexture, uv).xy;



  vec2 diff = responsePosition - pointer.xy;

  float diffRatio;
  // if (diff < LEN) diffRatio < 1
  // if (diff > LEN) diffRatio > 1
  diffRatio = length(diff) / LEN;

  float trigger;
  // if (l < 1) trigger = 1.0
  // if (l > 1) trigger = 0.0
  trigger = 1.0 - step(1.0, diffRatio);

  // IF TRIGGER START

  float f;
  // if (l -> 1) f -> 0
  // if (l -> 0) f -> 1
  f = (1.0 - diffRatio) * trigger;

  // from linear to eased by powered "circle"
  f = 1.0 - sqrt(sqrt(1.0 - f*f*f*f));

  // apply pointer impulse
  f *= pointer.w * 0.03;

  // reduce force nearby a certain point
  float d = length(vec2(-0.12, 0.44) - pointer.xy) * 0.618;
  d = clamp(0.0, 1.0, d);
  f *= d * d * d;

  // push from pointer
  velocity += normalize(diff) * f;

  // IF TRIGGER END

  // damp velocity of pushing away
  velocity *= 0.97;

  // pull back to initial position
  diff = initialPosition - responsePosition;
  velocity += diff * 0.003;

  // damp velocity of pulling back
  velocity *= 0.93;



  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`,
	{
		initialPositionTexture: { value: initialPositionTexture },
		responsePositionTexture: { value: responsePositionTexture },
		velocityTexture: { value: velocityTexture },
		pointer: { value: pointer },
	}
);

const positionMaterial = gpu.createShaderMaterial(
	`
uniform sampler2D responsePositionTexture;
uniform sampler2D velocityTexture;

void main() {

    vec3 red = vec3(1.0,0.0,0.0);
    red.x = 1.0;
    red.y = 0.0;
    red.z = 0.0;  
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 position = texture(responsePositionTexture, uv).xyz;
  vec3 velocity = texture(velocityTexture, uv).xyz;
  vec4 vector;
vector[0] = vector.r = vector.x = vector.s;
vector[1] = vector.g = vector.y = vector.t;
vector[2] = vector.b = vector.z = vector.p;
vector[3] = vector.a = vector.w = vector.q;

  position += velocity;

  gl_FragColor = vec4(position, 1.0);
}
`,
	{
		responsePositionTexture: { value: responsePositionTexture },
		velocityTexture: { value: velocityTexture },
	}
);

const velocityTarget = Array(2)
	.fill(null)
	.map(() => gpu.createRenderTarget());

const positionTarget = Array(2)
	.fill(null)
	.map(() => gpu.createRenderTarget());

let i = 1;
const computeResponse = () => {
	i ^= 1;

	gpu.doRenderTarget(velocityMaterial, velocityTarget[i]);
	velocityMaterial.uniforms.velocityTexture.value = velocityTarget[i].texture;
	positionMaterial.uniforms.velocityTexture.value = velocityTarget[i].texture;

	gpu.doRenderTarget(positionMaterial, positionTarget[i]);
	velocityMaterial.uniforms.responsePositionTexture.value =
		positionTarget[i].texture;
	positionMaterial.uniforms.responsePositionTexture.value =
		positionTarget[i].texture;

	return positionTarget[i].texture;
};

// ------------------------ //
// LOOPER

renderer.setAnimationLoop(() => {
	dampPointer();
	points.material.uniforms.positionTexture.value = computeResponse();
	renderer.render(scene, camera);
});

// ------------------------ //
// HELPERS

// eslint-disable-next-line no-restricted-globals
addEventListener('resize', () => {
	pointSizeScale = Math.min(window.innerWidth, window.innerHeight) / 162;
	material.uniforms.size.value = PR * pointSizeScale;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	originXScale = originYScale * camera.aspect;
	renderer.setSize(window.innerWidth, window.innerHeight);
});
