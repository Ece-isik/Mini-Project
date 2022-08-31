import './style.css'
import * as THREE from 'three'
import * as lil from 'lil-gui'
import gsap from 'gsap'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {DragControls} from 'three/examples/jsm/controls/DragControls.js'
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js'
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as CANNON from 'cannon-es'
import { BODY_SLEEP_STATES } from 'cannon-es'

// GUI
const gui = new lil.GUI();

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Fog
const fog = new THREE.Fog('#262837', 1, 15)
scene.fog = fog

// Physics
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0,-9.82,0)

// Texture
const textureLoader = new THREE.TextureLoader()

const wood_color = textureLoader.load('/textures/wood/basecolor.jpg')
const wood_normal = textureLoader.load('/textures/wood/normal.jpg')
const wood_height = textureLoader.load('/textures/wood/height.png')
const wood_ao = textureLoader.load('/textures/wood/ambientOcclusion.jpg')
const wood_roughness = textureLoader.load('/textures/wood/roughness.jpg')

const door_color = textureLoader.load('/textures/door/color.jpg')
const door_alpha = textureLoader.load('/textures/door/alpha.jpg')
const door_height = textureLoader.load('/textures/door/height.jpg')
const door_normal = textureLoader.load('/textures/door/normal.jpg')
const door_ao = textureLoader.load('/textures/door/ambientOcclusion.jpg')
const door_metalness = textureLoader.load('/textures/door/metalness.jpg')
const door_roughness = textureLoader.load('/textures/door/roughness.jpg')

const text_matcap = textureLoader.load('/textures/matcap/5.png')

const floor_color = textureLoader.load('/textures/floor/basecolor.jpg')
const floor_height = textureLoader.load('/textures/floor/height.png')
const floor_normal = textureLoader.load('/textures/floor/normal.jpg')
const floor_ao = textureLoader.load('/textures/floor/ambientOcclusion.jpg')
const floor_roughness = textureLoader.load('/textures/floor/roughness.jpg')

floor_color.repeat.set(8,8)
floor_height.repeat.set(8,8)
floor_normal.repeat.set(8,8)
floor_ao.repeat.set(8,8)
floor_roughness.repeat.set(8,8)

floor_color.wrapS = THREE.RepeatWrapping
floor_height.wrapS = THREE.RepeatWrapping
floor_normal.wrapS = THREE.RepeatWrapping
floor_ao.wrapS = THREE.RepeatWrapping
floor_roughness.wrapS = THREE.RepeatWrapping

floor_color.wrapT = THREE.RepeatWrapping
floor_height.wrapT = THREE.RepeatWrapping
floor_normal.wrapT = THREE.RepeatWrapping
floor_ao.wrapT = THREE.RepeatWrapping
floor_roughness.wrapT = THREE.RepeatWrapping

const starTexture = textureLoader.load('/textures/star.png')

const defaultMaterial = new CANNON.Material('default')
const contactMaterial = new CANNON.ContactMaterial
(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.7
    }
)
world.addContactMaterial(contactMaterial)
world.defaultContactMaterial = contactMaterial

/** sounds */
const hitSound = new Audio('/sounds/duck-squeak.wav')
const playHitSound = (collision) =>
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()
    if(impactStrength > 1.5){
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
}
}

/** 3D Text */
const fontLoader = new FontLoader()
fontLoader.load(
    '/fonts/gentilis/gentilis_regular.typeface.json',
    (font) =>
    {
        const textGeometry = new TextGeometry(
            'ECE',
            {
                font: font,
                size: 2,
                height: 0.5,
                curveSegments: 5,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 0
            }
        )
        const textMaterial = new THREE.MeshMatcapMaterial()
        textMaterial.matcap = text_matcap
        const text = new THREE.Mesh(textGeometry, textMaterial)
        text.position.x = -9
        text.rotation.y = 1
        text.castShadow = true
        scene.add(text)
    })

    const modelFox = new THREE.Object3D( );
    modelFox.scale.set( 0.015,0.015,0.015 );
    scene.add( modelFox );

    const gltfLoader = new GLTFLoader()
     
    let mixer = null
    let clip_walk = null
    let clip_idle = null

    gltfLoader.load(
        '/models/Fox/glTF/Fox.gltf',
        (gltf) =>
        {
            
            mixer = new THREE.AnimationMixer(gltf.scene)
            const action = mixer.clipAction(gltf.animations[0])
            action.play()
            gltf.scene.castShadow = true
            modelFox.add( gltf.scene );

            clip_idle = gltf.animations[0]
            clip_walk = gltf.animations[1]
        }
    )

    

    // Physics bodies
    const planeShape = new CANNON.Plane(25,25)
    const planeBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(0,0,0),
        shape: planeShape
    })
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), Math.PI * 0.5)
    world.addBody(planeBody)

    const ducks = []
    const createDuck = (scale, position) => 
    {
    const modelDuck = new THREE.Object3D( );
    modelDuck.scale.set( scale,scale,scale );
    modelDuck.position.copy(position)
    scene.add( modelDuck );
    
    gltfLoader.load(
        '/models/Duck/glTF/Duck.gltf',
        (gltf) =>
        {
            gltf.scene.castShadow = true
            modelDuck.add( gltf.scene );
        }
    )
    const shape = new CANNON.Box(new CANNON.Vec3(scale/2, scale/2, scale/2))
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0,5,0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)

    world.addBody(body)
    ducks.push({
        modelDuck,
        body
    })
    }

    const debugObject = {}
    debugObject.createDuck = () => {
        createDuck(Math.random() * 0.5, {x: (Math.random() - 0.5)*18 , y: 5, z: (Math.random() - 0.5)*18})
    }
    gui.add(debugObject, 'createDuck')

// Objects
const plane = new THREE.PlaneGeometry(25,25)
const material = new THREE.MeshStandardMaterial
({
    map: floor_color,
    normalMap: floor_normal,
    aoMap: floor_ao,
    roughnessMap: floor_roughness,
    displacementMap: floor_height,
    displacementScale: 0.1
})
const ground = new THREE.Mesh(plane, material)
ground.position.y = 0
ground.rotation.x = - Math.PI / 2

scene.add(ground)

const house = new THREE.Group()
scene.add(house)

const box = new THREE.BoxGeometry(5,3,5)
const wood_material = new THREE.MeshStandardMaterial({
    map: wood_color,
    normalMap: wood_normal,
    aoMap: wood_ao,
    roughnessMap: wood_roughness,
    displacementMap: wood_height,
    displacementScale: 0.1
})
const walls = new THREE.Mesh(box, wood_material)
walls.geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(walls.geometry.attributes.uv.array, 2))
walls.position.y = 3/2
house.add(walls)

const cone = new THREE.ConeGeometry(4,2,4)
const roof = new THREE.Mesh(cone, wood_material)
roof.geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(roof.geometry.attributes.uv.array, 2))
roof.position.y = 4
roof.rotation.y = Math.PI/4
house.add(roof)

const door = new THREE.Mesh
(
    new THREE.PlaneGeometry(2 ,2.50, 100, 100),
    new THREE.MeshStandardMaterial
    ({
        map: door_color,
        transparent: true,
        alphaMap: door_alpha,
        aoMap: door_ao,
        displacementMap: door_height,
        displacementScale: 0.1,
        normalMap: door_normal,
        metalnessMap: door_metalness,
        roughnessMap: door_roughness
    })
)
door.geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(door.geometry.attributes.uv.array, 2))
door.position.z = 5 / 2 + 0.01
door.position.y = 2.25 / 2
house.add(door)

const bushes = new THREE.Group()
scene.add(bushes)
const count = 100;
const positions = new Float32Array(count*3*3) // to hold the vertices
for(let i=0;i<positions.length;i++){
    positions[i] = Math.random();
}
const positionAttr = new THREE.BufferAttribute(positions, 3)
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', positionAttr)
const bush_material = new THREE.MeshBasicMaterial({color: '#2b8209', wireframe: true})

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

let x = 0, y = 0, z = 0;
for(let i = 0; i < 100; i++){
    const bush = new THREE.Mesh(geo, bush_material)
    const angle = Math.random() * Math.PI * 2
    const radius = 4 + Math.random() * 8
    const value = getRandom(0.5, 1.5)
    x= Math.sin(angle) * radius
    y= 0
    z= Math.cos(angle) * radius
    bush.position.set(x,y,z)
    bush.scale.set(value,value,value)
    bush.castShadow = true
    bushes.add(bush)
}

const moon = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({color: '#e0dcda'}))
const sun = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({color: '#facc61'}))
scene.add(moon,sun)

// Camera
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 10
scene.add(camera)

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#262837')
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Screen
window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Lights
const ambientLight = new THREE.AmbientLight('#b9d5ff',0.5) // light comes from everywhere
gui.add(ambientLight, 'intensity').min(0).max(1).step(0.01).name('Ambient Light Intensity')
scene.add(ambientLight)

const pointLight = new THREE.PointLight('#ff7d46', 2, 8, 0.5)
pointLight.position.set(0, 2.50, 5 / 2 + 0.5)
house.add(pointLight)

const directionalLight = new THREE.DirectionalLight('#b9d5ff', 0.5)
directionalLight.position.set(4, 5, -2)
gui.add(directionalLight, 'intensity').min(0).max(1).step(0.01).name('Moon Directional Light Intensity')
scene.add(directionalLight)

const directionalLight2 = new THREE.DirectionalLight('#facc61', 2.5)
gui.add(directionalLight2, 'intensity').min(0).max(4).step(0.01).name('Sun Directional Light Intensity')
scene.add(directionalLight2)

const ghost = new THREE.PointLight('#95f0d7',2,3)
gui.addColor(ghost, 'color')
scene.add(ghost)

// Shadows
directionalLight.castShadow = true
pointLight.castShadow = true
ghost.castShadow = true
directionalLight2.castShadow = true

walls.castShadow = true

ground.receiveShadow = true

pointLight.shadow.mapSize.width = 256
pointLight.shadow.mapSize.height = 256
pointLight.shadow.camera.far = 7

ghost.shadow.mapSize.width = 256
ghost.shadow.mapSize.height = 256
ghost.shadow.camera.far = 7

/** Particles
 */
 const particlesGeometry = new THREE.BufferGeometry(1,32,32)
 const starCount = 500
 const particlePositions = new Float32Array(count*3)
 
 for(let i=0; i < starCount; i+=3){
    // for x axis
     const value = getRandom(-10,10)
     if(value > 0)
     particlePositions[i] = value + 8
     else
     particlePositions[i] = value - 8
 }
 for(let i=1; i < starCount; i+=3){
    // for y axis
     const value = getRandom(5, 10)
     particlePositions[i] = value
 }
 for(let i=2; i < starCount; i+=3){
    // for z axis
     const value = getRandom(-10,10)
     if(value > 0)
     particlePositions[i] = value + 8
     else
     particlePositions[i] = value - 8
 }
 particlesGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions, 3))
 
 const particlesMaterial = new THREE.PointsMaterial({
     size: 0.8,
     sizeAttenuation: true,
     map: starTexture,
     alphaTest: 0.001
 })

 const stars = new THREE.Points(particlesGeometry, particlesMaterial)
 scene.add(stars)


// Controls
const orbitControls = new OrbitControls(camera, canvas)
orbitControls.enableDamping = true


const clock = new THREE.Clock()
let previousTime = 0

const func = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update mixer
    if(mixer !== null)
    mixer.update(deltaTime)
  
    // update model
    const timer = 0.0001 * Date.now();

		stars.position.x = 5 * Math.cos( timer  );
		stars.position.z = 5 * Math.sin( timer * 1.1 );


    //update physics world
    world.step(1/60, deltaTime, 3)
   
    for(const obj of ducks){
        obj.modelDuck.position.copy(obj.body.position) // position
        obj.modelDuck.quaternion.copy(obj.body.quaternion) // rotation
    }

    //update ghosts
    const angle = elapsedTime * 0.5 
    ghost.position.z = Math.sin(angle) * 4
    ghost.position.y = Math.sin(angle) * 3 
    ghost.position.x = Math.cos(angle) * (7 + Math.sin(elapsedTime * 0.5))

    moon.rotation.y = elapsedTime * 0.2
    moon.position.x = Math.cos(elapsedTime / 4) * 14
    moon.position.y = Math.sin(elapsedTime / 4) * 14
    directionalLight.position.x = moon.position.x
    directionalLight.position.y = moon.position.y

    sun.position.x = -Math.cos(elapsedTime / 4) * 14
    sun.position.y = -Math.sin(elapsedTime / 4) * 14
    directionalLight2.position.x = sun.position.x
    directionalLight2.position.y = sun.position.y

orbitControls.update()
renderer.render(scene, camera)
window.requestAnimationFrame(func)
}
func()

modelFox.addEventListener('animationiteration', (clip) => {console.log('animation end', clip)})
window.addEventListener('keydown', (event) =>
{
    if(event.key === 'w')
    gsap.to(camera.position, {duration:1, z:camera.position.z - 1});
    else if(event.key === 's')
    gsap.to(camera.position, {duration:1, z:camera.position.z + 1});
    else if(event.key === 'a')
    gsap.to(camera.position, {duration:1, x:camera.position.x - 1});
    else if(event.key === 'd')
    gsap.to(camera.position, {duration:1, x:camera.position.x + 1});
    else if(event.keyCode === 32)
    {
        gsap.to(camera.position, {duration:1, y: camera.position.y + 2 });
        gsap.to(camera.position, {duration:0.6, delay: 1, y: 0.60});
        gsap.to(camera.position, {duration:0.5, delay: 1.4, y: 1});
    }
    
})
window.addEventListener('keydown', (event) =>
{
    if(event.key === orbitControls.keys.BOTTOM){ //down
    gsap.to(modelFox.position, {duration:1, z:modelFox.position.z - 1});
    gsap.to(modelFox.rotation, {duration:0.4, y: Math.PI})
}
    else if(event.key === orbitControls.keys.LEFT){ //left
    gsap.to(modelFox.position, {duration:1, x:modelFox.position.x - 1});
    gsap.to(modelFox.rotation, {duration:0.4, y: -Math.PI/2})
}
    else if(event.key === orbitControls.keys.RIGHT){ //right
    gsap.to(modelFox.position, {duration:1, x:modelFox.position.x + 1});
    gsap.to(modelFox.rotation, {duration:0.4, y: Math.PI/2})
}
    else if(event.key === orbitControls.keys.UP){ //up
    gsap.to(modelFox.position, {duration:1, z:modelFox.position.z + 1});
    gsap.to(modelFox.rotation, {duration:0.4, y: 0})
}
     const action = mixer.clipAction(clip_walk)
    action.play()
})
/*const action = mixer.clipAction(clip_idle)
    action.play() */