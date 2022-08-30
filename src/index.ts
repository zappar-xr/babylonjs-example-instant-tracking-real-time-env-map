/* eslint-disable no-unused-vars */
/* eslint-disable no-param-reassign */
import * as BABYLON from 'babylonjs';
import * as ZapparBabylon from '@zappar/zappar-babylonjs';
import * as MATERIALS from 'babylonjs-materials';

const model = new URL('../assets/mug.glb', import.meta.url).href;

import 'babylonjs-loaders';
import './index.css';
// Model from https://sketchfab.com/3d-models/wizardy-ghost-91f9df6880f8492cb222d91b9fbd1434

// The SDK is supported on many different browsers, but there are some that
// don't provide camera access. This function detects if the browser is supported
// For more information on support, check out the readme over at
// https://www.npmjs.com/package/@zappar/zappar-babylonjs
if (ZapparBabylon.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparBabylon.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

// Setup BabylonJS in the usual way
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true);

const scene = new BABYLON.Scene(engine);
// eslint-disable-next-line no-unused-vars
const light = new BABYLON.DirectionalLight('dir02', new BABYLON.Vector3(0, -10, 0), scene);
// light.shadowEnabled = true;

// const light1 = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(1, -1, 0), scene);

// Setup a Zappar camera instead of one of Babylon's cameras
const camera = new ZapparBabylon.Camera('zapparCamera', scene);
camera.poseMode = ZapparBabylon.CameraPoseMode.AnchorOrigin;
const envMap = new ZapparBabylon.CameraEnvironmentMap(camera, engine);

// Request the necessary permission from the user
ZapparBabylon.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparBabylon.permissionDeniedUI();
});

const instantTracker = new ZapparBabylon.InstantWorldTracker();
// eslint-disable-next-line max-len
const trackerTransformNode = new ZapparBabylon.InstantWorldAnchorTransformNode('tracker', camera, instantTracker, scene);
light.parent = trackerTransformNode;
let mesh : BABYLON.AbstractMesh | undefined;

// Create a ground plane which will recieve shadows.
const ground = BABYLON.Mesh.CreatePlane('ground', 2, scene);
ground.rotation.x = Math.PI / 2;

// Shadow only material.
const shadowMaterial = new MATERIALS.ShadowOnlyMaterial('shadowOnly', scene as any);
(ground as any).material = shadowMaterial;
ground.receiveShadows = true;
ground.parent = trackerTransformNode;
shadowMaterial.alpha = 0.5;

// Configure the shadow generator.
const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
shadowGenerator.useBlurExponentialShadowMap = true;
shadowGenerator.blurScale = 2;
shadowGenerator.setDarkness(0.2);


BABYLON.SceneLoader.ImportMesh(null, '', model, scene, (meshes) => {
  [mesh] = meshes;
  // Add the meshes to the render list of the shadow generator.
  shadowGenerator?.getShadowMap()?.renderList?.push(...meshes);

  // Set the mesh's reflection texture to the real time environment map.
  (meshes as any)[1].material.reflectionTexture = envMap.cubeTexture;

  mesh.rotationQuaternion = null;
  mesh.rotation.y = Math.PI / 1.7;

  mesh.scaling = new BABYLON.Vector3(1.7, 1.7, 1.7);

  // Child the mesh inside our tracker transform node.
  mesh.parent = trackerTransformNode;
  light.setDirectionToTarget(mesh.absolutePosition);
});

window.addEventListener('resize', () => {
  engine.resize();
});

let hasPlaced = false;
const placeButton = document.getElementById('tap-to-place') || document.createElement('div');
placeButton.addEventListener('click', () => {
  hasPlaced = true;
  placeButton.remove();
});

engine.runRenderLoop(() => {
  if (scene.isReady()) {
    placeButton.innerHTML = 'Tap to place';
  }
  if (!hasPlaced) {
    instantTracker.setAnchorPoseFromCameraOffset(0, 0, -3);
  }
  envMap.update();
  camera.updateFrame();
  scene.render();
});
