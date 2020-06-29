import React, { Component } from "react";
import {
  Mesh,
  Scene,
  Box3,
  Vector2,
  Vector3,
  Raycaster,
  sRGBEncoding,
  WebGLRenderer,
  PMREMGenerator,
  UnsignedByteType,
  MeshBasicMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  ConeBufferGeometry,
  ACESFilmicToneMapping,
} from "three";
import Stats from "stats.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import { GUI } from 'dat.gui';

import { exportGLTF } from './utils';

import Plan from "./assets/models/Plan/Plan.gltf";
import base from "./assets/models/building/base.gltf";
import corner from "./assets/models/building/corner.gltf";
import building1 from "./assets/models/building/complete1.gltf";
import building2 from "./assets/models/building/complete2.gltf";
import building3 from "./assets/models/building/complete3.gltf";

// linear color space
var API = {
  lightProbeIntensity: 1.0,
  directionalLightIntensity: 0.2,
  envMapIntensity: 1
};

class GLTFModifier extends Component {
  componentDidMount() {
    this.init();
  }

  componentWillUnmount() {
    this.cleanup();
  }

  init = () => {
    // camera
    this.aspect = this.node.clientWidth / this.node.clientHeight;
    this.camera = new PerspectiveCamera(50, this.aspect, 1, 1000);
    this.camera.position.set(-15, 30, 45);

    // controls
    this.controls = new OrbitControls(this.camera, this.node);

    // scene
    this.scene = new Scene();

    // envmap
    new RGBELoader()
      .setDataType(UnsignedByteType)
      .setPath('textures/')
      .load('royal_esplanade_1k.hdr', (texture) => {

        this.envMap = pmremGenerator.fromEquirectangular(texture).texture;

        this.setEnvMap();

        texture.dispose();
        pmremGenerator.dispose();
      });

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.parse(Plan, undefined, this.onLoad, this.onError);

    this.renderer = new WebGLRenderer({
      antialias: true
    });

    this.node.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("mousedown", this.onMouseClick);
    window.addEventListener("mousemove", this.onMouseMove);

    this.stats = new Stats();
    this.node.appendChild(this.stats.dom);

    // renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);

    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = sRGBEncoding;

    var pmremGenerator = new PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const center = new Vector3();

    var boxGeometry = new BoxBufferGeometry(1, 1, 1);
    var box = new Mesh(boxGeometry, new MeshBasicMaterial({ color: 0xff0000 }));
    var boundingBox = new Box3().setFromObject(box);
    box.geometry.translate(0, boundingBox.getSize(center).y / 2, 0);
    box.geometry.rotateX(Math.PI / 2);
    
    var coneGeometry = new ConeBufferGeometry(1, 5, 32);
    var cone = new Mesh(coneGeometry, new MeshBasicMaterial({ color: 0xff0000 }));
    boundingBox = new Box3().setFromObject(cone);
    cone.geometry.translate(0, boundingBox.getSize(center).y / 2, 0);
    cone.geometry.rotateX(Math.PI / 2);

    this.assets = {
      'cone': cone,
      'box': box,
      'base': null,
      'corner': null,
    //   'building 1': null,
    //   'building 2': null,
    //   'building 3': null
    }

    this.gltfLoader.parse(base, undefined, (gltf) => this.onLoadAsset(gltf, "base"), this.onError);
    this.gltfLoader.parse(corner, undefined, (gltf) => this.onLoadAsset(gltf, "corner"), this.onError);
    // this.gltfLoader.parse(building1, undefined, (gltf) => this.onLoadAsset(gltf, "building 1"), this.onError);

    this.config = {
      asset: 'cone',
      import: () => {
        this.inputElement.click()
      },
      export: () => {
        this.scene.remove(this.helper)
        exportGLTF(this.scene);
        this.scene.add(this.helper)
      }
    };

    this.gui = new GUI();
    var controller = this.gui.add(this.config, 'asset', Object.keys(this.assets));
    controller.onChange(() => {
      this.scene.remove(this.helper);
      this.changeHelper()
      this.scene.add(this.helper);
    });
    this.gui.add(this.config, 'import');
    this.gui.add(this.config, 'export');

    this.changeHelper();
    this.scene.add(this.helper);

    var fl = this.gui.addFolder("Intensity");

    fl.add(API, "lightProbeIntensity", 0, 1, 0.02)
      .name("light probe")
      .onChange(() => { this.lightProbe.intensity = API.lightProbeIntensity; });

    fl.add(API, "directionalLightIntensity", 0, 1, 0.02)
      .name("directional light")
      .onChange(() => { this.light.intensity = API.directionalLightIntensity; });
  };

  animate = () => {
    this.stats.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  cleanup = () => {
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("mousedown", this.onMouseClick);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.renderer.setAnimationLoop(null);
  };

  onWindowResize = () => {
    this.camera.aspect = this.node.clientWidth / this.node.clientHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
  };

  onMouseClick = () => {
    if (event.which == 3) {
      this.changeHelper();
      this.scene.add(this.helper);
    }
  };

  changeHelper = () => {
    this.helper = this.assets[this.config.asset].clone(true);
  };

  onMouseMove = (event) => {
    this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.object) {
      // See if the ray from the camera into the world hits one of our meshes
      const intersects = this.raycaster.intersectObjects(this.object.children, true);

      // Toggle rotation bool for meshes that we clicked
      if (intersects.length > 0) {
        this.helper.position.set(0, 0, 0);
        this.helper.lookAt(intersects[0].face.normal);

        this.helper.position.copy(intersects[0].point);
      }
    }
  };

  onLoad = ({ scene }) => {
    this.object = scene;
    this.object.traverse(node => {
      if (node.isMesh) {
        node.material.envMap = this.envMap;
        node.material.envMapIntensity = API.envMapIntensity;
        node.material.needsUpdate = true;
      }
    });
    
    this.scene.add(this.object);
  };

  onLoadAsset = (gltf, idx) => {
    var scene = gltf.scene;
    scene.traverse((node) => {
      if (node.isMesh) {
        const center = new Vector3();
        node.geometry.translate(0, node.geometry.boundingBox.getSize(center).y / 2, 0);
        node.geometry.rotateX(Math.PI / 2);
      }
    });
    this.assets[idx] = scene;
  };

  onProgress = () => { };
  onError = (errorMessage) => { console.log(errorMessage) };

  importGLTF = (ev) => {
    ev.preventDefault();
    let reader = new FileReader();
    let file = ev.target.files[0];
    if (file) {
      reader.onloadend = () => {
        this.gltfLoader.parse(reader.result, undefined, (gltf) => {
          this.scene = new Scene();
          this.setEnvMap();
          this.onLoad(gltf);
          this.scene.add(this.light);
          this.scene.add(this.helper);
        }, this.onError);
      };
      reader.readAsText(file);
    }
  };

  setEnvMap = () => {
    this.scene.background = this.envMap;
    this.scene.environment = this.envMap;
  };

  render() {
    return (
      <div
        style={{ width: "100%", height: "100%" }}>
        <input
          type="file"
          style={{ display: "none" }}
          ref={input => this.inputElement = input}
          onChange={this.importGLTF}
        />
        <div
          style={{ width: "100%", height: "100%" }}
          ref={el => (this.node = el)}
        />
      </div>
    );
  }
}

export default GLTFModifier;
