import React, { Component } from "react";
import {
  Mesh,
  Scene,
  Color,
  Vector2,
  Raycaster,
  MeshNormalMaterial,
  MeshBasicMaterial,
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
    this.gltfLoader.parse(damagedHelmet, undefined, this.onLoad, this.onError);

    this.renderer = new WebGLRenderer({
      antialias: true
    });

    this.node.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("mousedown", this.onMouseClick);
    window.addEventListener("mousemove", this.onMouseMove);

    this.stats = new Stats();
    this.node.appendChild(this.stats.dom);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);

    this.assetsGeometry = {
      'box': new BoxBufferGeometry(0.1, 0.1, 0.1),
      'cone': new ConeBufferGeometry(0.025, 0.1, 32)
    }

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
    var controller = this.gui.add(this.config, 'asset', Object.keys(this.assetsGeometry));
    controller.onChange((value) => {
      this.helper.geometry = this.assetsGeometry[value];
    });
    this.gui.add(this.config, 'import');
    this.gui.add(this.config, 'export');

    this.helper = new Mesh(this.assetsGeometry[this.config.asset], new MeshBasicMaterial({ color: 0xff0000 }));
    this.scene.add(this.helper);
  };

  animate = () => {
    this.stats.begin();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.stats.end();
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
      this.helper = new Mesh(this.assetsGeometry[this.config.asset], new MeshBasicMaterial({ color: 0xff0000 }));
      this.scene.add(this.helper);
    }
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
    // this.object.traverse(node => {
    //   if (node.isMesh) {
    //     node.material = new MeshBasicMaterial({ color: 0xffff00 });
    //     node.material.needsUpdate = true;
    //   }
    // });

    this.scene.add(this.object);
  };

  onProgress = () => { };
  onError = (errorMessage) => { console.log(errorMessage) };

  importGLTF = (ev) => {
    ev.preventDefault();
    let reader = new FileReader();
    let file = ev.target.files[0];
    reader.onloadend = () => {
      this.gltfLoader.parse(reader.result, undefined, (gltf) => {
        this.scene = new Scene();
        this.scene.background = new Color("#191919");
        this.onLoad(gltf);
        this.scene.add(this.helper);
      }, this.onError);
    };
    reader.readAsText(file);
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
