import React, { Component } from "react";
import {
  Mesh,
  Scene,
  Color,
  Vector2,
  Raycaster,
  MeshNormalMaterial,
  PerspectiveCamera,
  ConeBufferGeometry,
  WebGLRenderer
} from "three";
import Stats from "stats.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

    this.helper = new Mesh(new ConeBufferGeometry(0.025, 0.1, 32), new MeshNormalMaterial());
    this.scene.add(this.helper);
  };

  animate = () => {
    this.stats.begin();

    if (this.object) {
      this.object.rotation.y += 0.001;
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

    // See if the ray from the camera into the world hits one of our meshes
    const intersects = this.raycaster.intersectObjects(this.object.children, true);

    // Toggle rotation bool for meshes that we clicked
    if (intersects.length > 0) {
        this.helper.position.set(0, 0, 0);
        this.helper.lookAt(intersects[0].face.normal);

        this.helper.position.copy(intersects[0].point);
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
