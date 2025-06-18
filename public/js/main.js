import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153/build/three.module.js";
import {GUI} from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";
import {FILE_RGB, FILE_A, INIT} from "./config.js";
import {vertexShader, fragmentShader} from "./shaders.js";

/* ---------- Three.js 基礎 ---------- */
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  10
);
camera.position.set(0, 0, 2);

/* ---------- テクスチャ ---------- */
const loader = new THREE.TextureLoader();
const texRGB = loader.load(FILE_RGB);
const texA = loader.load(FILE_A);
[texRGB, texA].forEach((t) => (t.wrapS = t.wrapT = THREE.RepeatWrapping));

/* ---------- ジオメトリ＋InstancedMesh ---------- */
const seg = 64,
  size = 1;
const plane = new THREE.PlaneGeometry(size, size, seg, seg);
const mat = new THREE.RawShaderMaterial({
  vertexShader,
  fragmentShader,
  glslVersion: THREE.GLSL3,
  uniforms: {
    mapRGB: {value: texRGB},
    mapA: {value: texA},
    invertA: {value: INIT.invert},
    furLen: {value: INIT.furLen},
    layerMax: {value: INIT.layers},
    windDir: {value: new THREE.Vector2(1, 0.3)},
    windAmp: {value: INIT.windAmp},
    windFreq: {value: INIT.windFreq},
    time: {value: 0},
    strokePos: {value: new THREE.Vector2(-1, -1)},
    strokeDir: {value: new THREE.Vector2()},
    strokeRad: {value: INIT.strokeRad},
  },
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
});
const mesh = new THREE.InstancedMesh(plane, mat, INIT.layers);
/* 必要最低限の instanceMatrix (全部同位置) */
const dummy = new THREE.Object3D();
for (let i = 0; i < INIT.layers; i++) {
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
mesh.rotation.x = -0.35;
scene.add(mesh);

/* ---------- インタラクション ---------- */
const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2();
let dragging = false,
  prevUV = new THREE.Vector2();
function ndcFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1
  );
}
addEventListener("pointerdown", (e) => {
  dragging = true;
  ndcFromEvent(e);
});
addEventListener("pointermove", (e) => {
  if (!dragging) return;
  ndcFromEvent(e);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(mesh)[0];
  if (hit) {
    const uv = hit.uv;
    mat.uniforms.strokeDir.value.set(uv.x - prevUV.x, uv.y - prevUV.y);
    mat.uniforms.strokePos.value.copy(uv);
    prevUV.copy(uv);
  }
});
addEventListener("pointerup", () => (dragging = false));

/* ---------- GUI ---------- */
const gui = new GUI();
gui
  .add(mat.uniforms.layerMax, "value", 5, 80, 1)
  .name("layers")
  .onChange((v) => {
    mesh.count = v; // InstancedMesh の描画数更新
  });
gui.add(mat.uniforms.furLen, "value", 0.05, 0.35, 0.01).name("furLen");
gui.add(mat.uniforms.windAmp, "value", 0, 0.1, 0.005).name("windAmp");
gui.add(mat.uniforms.windFreq, "value", 0, 10, 0.1).name("windFreq");
gui.add(mat.uniforms.strokeRad, "value", 0.05, 0.4, 0.01).name("strokeRad");
gui.add(mat.uniforms.invertA, "value").name("invert α");
gui.close();

/* ---------- ループ ---------- */
renderer.setAnimationLoop((t) => {
  mat.uniforms.time.value = t * 0.001;
  renderer.render(scene, camera);
});
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
