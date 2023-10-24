import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader' 


import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'

import disp from './img/displacement.exr'
import normals from './img/normal.png'
import stickers from './img/stickers.svg'






export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(0, 0, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

 


		new EXRLoader().load(disp, texture => {
			this.displacementTexture = texture
			this.addObjects()		 
			//this.resize()
			this.render()
			this.setupResize()
			this.addLights()
			this.settings()
		} )


 
 
	}

	settings() {
		let that = this
		this.settings = {
			x: 0,
			y: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'x', -2, 2, 0.01)
		this.gui.add(this.settings, 'y', -2, 2, 0.01)

	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		this.imageAspect = 853/1280
		let a1, a2
		if(this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect
			a2 = 1
		} else {
			a1 = 1
			a2 = (this.height / this.width) * this.imageAspect
		} 


		this.material.uniforms.resolution.value.x = this.width
		this.material.uniforms.resolution.value.y = this.height
		this.material.uniforms.resolution.value.z = a1
		this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		this.diffuse = new THREE.TextureLoader().load(stickers)
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader,
			wireframe: true
		})
		

		this.material1 = 	new THREE.MeshPhongMaterial({
			transparent: true,
			// alphaMap: true,
			normalMap: new THREE.TextureLoader().load(normals),
			displacementMap: this.displacementTexture,
			map: this.diffuse,
			side: THREE.DoubleSide
		}) 

		this.material1.onBeforeCompile = shader => {
			shader.uniforms.translate = {value: new THREE.Vector2(0, 0)}
			shader.uniforms.progress = {value: 0}
			shader.vertexShader = shader.vertexShader.replace(
				`#include <clipping_planes_pars_vertex>`,
				`#include <clipping_planes_pars_vertex>
				
				varying vec2 vDisplacementUV;
				uniform vec2 translate;
				vec2 rotate(vec2 v, float a) {
					float s = sin(a);
					float c = cos(a);
					mat2 m = mat2(c, -s, s, c);
					return m * v;
				}
				float map(float value, float min1, float max1, float min2, float max2) {
					return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
				 }
				
				`
			)

			shader.vertexShader = shader.vertexShader.replace(
				`#include <project_vertex>`,
				`
				 
				 
				vec2 pos = position.xy * 0.5 * vec2(1., 4.) + vec2(0., 0.);
				float u = fract(pos.x + 0.5);
				float v = map(pos.y / 2., -1.5, 1.5, 0., 1.);


				vec2 displacementUV = vec2(u,v);

				vDisplacementUV = displacementUV;

				float displacement = (texture2D(displacementMap, displacementUV).r - 0.5) * 2.;

				float radius = 1.4 + 1.25 * displacement;


				vec2 rotateDisplacement = rotate(vec2(0., radius), 2. * PI * (pos.x ));


				//transformed.z += 0.4 * sin(10. * transformed.x);


				vec4 mvPosition = vec4(vec3(rotateDisplacement.x, position.y, rotateDisplacement.y), 1.0);

			 

				mvPosition = modelViewMatrix * mvPosition;
				gl_Position = projectionMatrix * mvPosition;

				
				
				`				 
			)
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <common>',
				`#include <common>
					varying vec2 vDisplacementUV;
				`					
			)
		

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <normal_fragment_maps>',
				`#include <normal_fragment_maps>
				 	normal = texture2D(normalMap, vDisplacementUV).xyz * 2. - 1.;
				`					
			)





			this.material1.userData.shader = shader
		}

		this.geometry = new THREE.PlaneGeometry(2,2,100,100)
		this.plane = new THREE.Mesh(this.geometry, this.material)
		this.plane = new THREE.Mesh(this.geometry,
		 this.material1
		)

		
		this.scene.add(this.plane)
 
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		//this.material1.uniforms.time.value = this.time
		 if(this.material1.userData.shader) {
			// this.diffuse.offset.x = this.settings.x
			this.diffuse.offset.y = this.settings.y
			this.diffuse.offset.x = this.settings.y
			this.material1.userData.shader.uniforms.translate.value.x = this.settings.x
			this.material1.userData.shader.uniforms.translate.value.y= this.settings.y

		 }
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 