import React, { Component } from "react";
import {
  Mesh,
  Scene,
  Color,
  Vector2,
  Raycaster,
  MeshNormalMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  ConeBufferGeometry,
  WebGLRenderer
} from "three";
import Stats from "stats.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GUI } from 'dat.gui';

import { exportGLTF } from './utils';

import damagedHelmet from "./assets/models/DamagedHelmet/DamagedHelmet.gltf";

class GLTFModifier extends Component {
  componentDidMount() {
    this.init();
  }

  componentWillUnmount() {
    this.cleanup();
  }

  init = () => {
    this.aspect = this.node.clientWidth / this.node.clientHeight;
    this.camera = new PerspectiveCamera(50, this.aspect, 1, 1000);
    this.camera.position.set(0, 0.9, 3.7);

    this.controls = new OrbitControls(this.camera, this.node);
    this.scene = new Scene();
    this.scene.background = new Color("#191919");

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.parse(damagedHelmet, undefined, ({ scene }) => {
      this.object = scene;
      this.object.traverse(node => {
        if (node.isMesh) {
          node.material = new MeshNormalMaterial();
          node.material.needsUpdate = true;
        }
      });

      this.scene.add(this.object);
    });

    this.renderer = new WebGLRenderer({
      antialias: true
    });

    this.node.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("mousemove", this.onMouseMove);

    this.stats = new Stats();
    this.node.appendChild(this.stats.dom);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);

    var assetsGeometry = {
      'box': new BoxBufferGeometry(0.1, 0.1, 0.1),
      'cone': new ConeBufferGeometry(0.025, 0.1, 32)
    }

    this.config = {
      speed: 1,
      asset: 'cone',
      import: () => {
        
      },
      export: () => {
        exportGLTF(this.scene);
      }
    };

    this.gui = new GUI();
    this.gui.add(this.config, 'speed', -5, 5);
    var controller = this.gui.add(this.config, 'asset', Object.keys(assetsGeometry));
    controller.onChange((value) => {
      this.helper.geometry = assetsGeometry[value];
    });
    this.gui.add(this.config, 'import');
    this.gui.add(this.config, 'export');

    this.helper = new Mesh(assetsGeometry[this.config.asset], new MeshNormalMaterial());
    this.scene.add(this.helper);
  };

  animate = () => {
    this.stats.begin();

    if (this.object) {
      this.object.rotation.y += this.config.speed / 100;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  };

  cleanup = () => {
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.renderer.setAnimationLoop(null);
  };

  onWindowResize = () => {
    this.camera.aspect = this.node.clientWidth / this.node.clientHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
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

  render() {
    return (
      <div
        style={{ width: "100%", height: "100%" }}
        ref={el => (this.node = el)}
      />
    );
  }
}

export default GLTFModifier;
