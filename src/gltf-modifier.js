import React, { Component } from "react";
import {
  Mesh,
  Scene,
  Color,
  Vector2,
  Raycaster,
  LightProbe,
  sRGBEncoding,
  DirectionalLight,
  CubeTextureLoader,
  MeshBasicMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  NoToneMapping,
  ConeBufferGeometry,
  WebGLRenderer,
} from "three";
import Stats from "stats.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';

import { GUI } from 'dat.gui';

import { exportGLTF } from './utils';

import damagedHelmet from "./assets/models/DamagedHelmet/DamagedHelmet.gltf";
import nx from "./assets/textures/pisa/nx.png";

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
    this.camera.position.set(0, 0.9, 3.7);

    // controls
    this.controls = new OrbitControls(this.camera, this.node);

    // scene
    this.scene = new Scene();
    // this.scene.background = new Color("#191919");

    // probe
    this.lightProbe = new LightProbe();
    this.scene.add(this.lightProbe);

		// light
    this.light = new DirectionalLight(0xffffff, API.directionalLightIntensity);
    this.light.position.set(10, 10, 10);
    this.scene.add(this.light);

    // envmap
    var genCubeUrls = function (prefix, postfix) {
      return [
        prefix + 'px' + postfix, prefix + 'nx' + postfix,
        prefix + 'py' + postfix, prefix + 'ny' + postfix,
        prefix + 'pz' + postfix, prefix + 'nz' + postfix
      ];
    };

    var urls = genCubeUrls('pisa/', '.png');

    new CubeTextureLoader().load(urls, (cubeTexture) => {
      cubeTexture.encoding = sRGBEncoding;
      this.scene.background = cubeTexture;
      this.cubeTexture = cubeTexture;
      this.lightProbe.copy(LightProbeGenerator.fromCubeTexture(cubeTexture));
    });

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

    // renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.node.clientWidth, this.node.clientHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);

    // tone mapping
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.outputEncoding = sRGBEncoding;

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

    var fl = this.gui.addFolder("Intensity");

    fl.add(API, "lightProbeIntensity", 0, 1, 0.02)
      .name("light probe")
      .onChange(() => {
        this.lightProbe.intensity = API.lightProbeIntensity;
      });

    fl.add(API, "directionalLightIntensity", 0, 1, 0.02)
      .name("directional light")
      .onChange(() => {
        this.light.intensity = API.directionalLightIntensity;
      });

    fl.add(API, "envMapIntensity", 0, 1, 0.02)
      .name("envMap")
      .onChange(() => {
        this.object.material.envMapIntensity = API.envMapIntensity;
      });
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
    this.object.traverse(node => {
      if (node.isMesh) {
        node.material.envMap = this.cubeTexture,
						node.material.envMapIntensity = API.envMapIntensity,
        node.material.needsUpdate = true;
      }
    });
      // var vertexNormalsHelper = new VertexNormalsHelper(this.object, 10);
      // this.object.add(vertexNormalsHelper);

    this.scene.add(this.object);
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
          this.scene.background = this.cubeTexture;
          this.onLoad(gltf);
          this.scene.add(this.light);
          this.scene.add(this.helper);
        }, this.onError);
      };
      reader.readAsText(file);
    }
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
