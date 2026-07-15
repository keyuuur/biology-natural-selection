import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type {
  GenerationResult,
  TraitCounts,
  TraitId,
} from '../simulation/index.ts'

const REQUIRED_CLIPS = ['Idle', 'Walk', 'Eating'] as const
const TRAIT_ORDER: TraitId[] = ['higher_speed', 'lower_speed']

type RequiredClip = (typeof REQUIRED_CLIPS)[number]

type MotionPlan = {
  from: THREE.Vector3
  to: THREE.Vector3
  elapsed: number
  duration: number
  succeeded: boolean
}

type DeerActor = {
  id: string
  trait: TraitId
  root: THREE.Group
  mixer: THREE.AnimationMixer
  currentAction: THREE.AnimationAction | null
  motion: MotionPlan | null
}

export type ThreeSceneCallbacks = {
  onReady: () => void
  onError: (message: string) => void
  onPhaseChange: (message: string | null) => void
}

export class ThreeSceneController {
  private readonly container: HTMLElement
  private readonly callbacks: ThreeSceneCallbacks
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  private readonly timer = new THREE.Timer()
  private readonly resizeObserver: ResizeObserver
  private readonly actors: DeerActor[] = []
  private readonly clipMap = new Map<RequiredClip, THREE.AnimationClip>()
  private readonly foodTargets: THREE.Vector3[] = []
  private readonly ringGeometry = new THREE.TorusGeometry(0.62, 0.07, 8, 32)
  private readonly markerGeometry = new THREE.ConeGeometry(0.11, 0.28, 5)
  private readonly ringMaterials: Record<TraitId, THREE.MeshBasicMaterial> = {
    higher_speed: new THREE.MeshBasicMaterial({ color: 0x2166a5 }),
    lower_speed: new THREE.MeshBasicMaterial({ color: 0xb44d20 }),
  }
  private deerTemplate: THREE.Object3D | null = null
  private pendingPopulation: { counts: TraitCounts; generation: number } | null = null
  private frameId = 0
  private playbackToken = 0
  private disposed = false
  private readonly pendingWaits = new Map<number, () => void>()

  constructor(container: HTMLElement, callbacks: ThreeSceneCallbacks) {
    this.container = container
    this.callbacks = callbacks

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch (error) {
      throw new Error(`WebGL could not start: ${this.formatError(error)}`)
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.renderer.domElement.className = 'field-canvas'
    this.container.replaceChildren(this.renderer.domElement)

    this.configureScene()
    this.timer.connect(document)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()
    this.loadDeer()
    this.animate()
  }

  updatePopulation(counts: TraitCounts, generation: number): void {
    if (!this.deerTemplate) {
      this.pendingPopulation = { counts: { ...counts }, generation }
      return
    }

    this.pendingPopulation = null
    this.clearPopulation()

    let index = 0
    for (const trait of TRAIT_ORDER) {
      for (let traitIndex = 0; traitIndex < counts[trait]; traitIndex += 1) {
        const actor = this.createActor(trait, generation, traitIndex)
        const column = index % 5
        const row = Math.floor(index / 5)
        actor.root.position.set((column - 2) * 1.8, 0, 1.15 + row * 1.45)
        actor.root.rotation.y = Math.PI
        this.scene.add(actor.root)
        this.actors.push(actor)
        index += 1
      }
    }
  }

  async playGeneration(
    result: GenerationResult,
    reduceMotion: boolean,
  ): Promise<void> {
    const token = ++this.playbackToken

    if (reduceMotion || this.actors.length === 0) {
      this.callbacks.onPhaseChange(
        `Their offspring form Generation ${result.generation}.`,
      )
      this.updatePopulation(result.endingCounts, result.generation)
      await this.wait(250)
      if (token === this.playbackToken) this.callbacks.onPhaseChange(null)
      return
    }

    this.callbacks.onPhaseChange('The deer are moving toward the distant food.')
    const usedByTrait: Record<TraitId, number> = {
      higher_speed: 0,
      lower_speed: 0,
    }
    let foodIndex = 0

    for (const actor of this.actors) {
      const succeeded = usedByTrait[actor.trait] < result.survivorCounts[actor.trait]
      if (succeeded) usedByTrait[actor.trait] += 1

      const destination = succeeded
        ? this.foodTargets[foodIndex++ % this.foodTargets.length]
        : new THREE.Vector3(actor.root.position.x * 0.72, 0, -0.35)
      const baseDuration = actor.trait === 'higher_speed' ? 1.4 : 2

      actor.motion = {
        from: actor.root.position.clone(),
        to: destination.clone(),
        elapsed: 0,
        duration: succeeded ? baseDuration : baseDuration * 1.18,
        succeeded,
      }
      actor.root.lookAt(destination.x, actor.root.position.y, destination.z)
      this.playClip(actor, 'Walk', actor.trait === 'higher_speed' ? 1.25 : 0.9)
    }

    await this.wait(2350)
    if (this.disposed || token !== this.playbackToken) return

    for (const actor of this.actors) {
      this.playClip(actor, actor.motion?.succeeded ? 'Eating' : 'Idle', 1)
    }
    this.callbacks.onPhaseChange(
      `${result.survivorCounts.higher_speed} higher-speed and ${result.survivorCounts.lower_speed} lower-speed deer reached enough food to survive and reproduce.`,
    )

    await this.wait(1350)
    if (this.disposed || token !== this.playbackToken) return

    this.callbacks.onPhaseChange(
      `A visibly new offspring population forms Generation ${result.generation}.`,
    )
    this.updatePopulation(result.endingCounts, result.generation)
    await this.wait(650)
    if (token === this.playbackToken) this.callbacks.onPhaseChange(null)
  }

  resize(): void {
    if (this.disposed) return
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.playbackToken += 1
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    for (const [timeoutId, resolve] of this.pendingWaits) {
      window.clearTimeout(timeoutId)
      resolve()
    }
    this.pendingWaits.clear()
    this.clearPopulation()
    this.disposeSceneResources()
    this.renderer.dispose()
    this.timer.dispose()
    this.renderer.domElement.remove()
  }

  private configureScene(): void {
    this.scene.background = new THREE.Color(0xcfe5d4)
    this.scene.fog = new THREE.Fog(0xcfe5d4, 17, 31)
    this.camera.position.set(0, 10.5, 16)
    this.camera.lookAt(0, 0.3, 0.4)

    const hemisphere = new THREE.HemisphereLight(0xf3fbff, 0x49633c, 2.25)
    this.scene.add(hemisphere)
    const sun = new THREE.DirectionalLight(0xfff2ca, 2.5)
    sun.position.set(-7, 12, 8)
    this.scene.add(sun)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(21, 17),
      new THREE.MeshLambertMaterial({ color: 0x7fa463 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = 1
    this.scene.add(ground)

    const foodZone = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xb8cc79 }),
    )
    foodZone.rotation.x = -Math.PI / 2
    foodZone.position.set(0, 0.012, -4)
    this.scene.add(foodZone)

    const foodGeometry = new THREE.CylinderGeometry(0.36, 0.42, 0.12, 8)
    const foodMaterial = new THREE.MeshLambertMaterial({ color: 0xd6b24c })
    for (let index = 0; index < 12; index += 1) {
      const column = index % 6
      const row = Math.floor(index / 6)
      const position = new THREE.Vector3((column - 2.5) * 1.45, 0.07, -4.6 + row * 1.15)
      const food = new THREE.Mesh(foodGeometry, foodMaterial)
      food.position.copy(position)
      this.foodTargets.push(position.clone().setY(0))
      this.scene.add(food)
    }

    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.22, 1.35, 6)
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x75543b })
    const canopyGeometry = new THREE.DodecahedronGeometry(0.8, 0)
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x3f7651 })
    const treePositions = [
      [-8, -3],
      [8, -2],
      [-8.5, 3],
      [8.2, 5],
      [-7.7, 7],
    ]
    for (const [x, z] of treePositions) {
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.set(x, 0.68, z)
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial)
      canopy.position.set(x, 1.72, z)
      this.scene.add(trunk, canopy)
    }
  }

  private loadDeer(): void {
    const loader = new GLTFLoader()
    loader.load(
      '/assets/animals/deer/Deer.gltf',
      (gltf) => {
        if (this.disposed) return
        const missing = REQUIRED_CLIPS.filter(
          (name) => !gltf.animations.some((clip) => clip.name === name),
        )
        if (missing.length > 0) {
          this.callbacks.onError(`The deer model is missing: ${missing.join(', ')}.`)
          return
        }

        this.deerTemplate = gltf.scene
        this.normalizeTemplate(this.deerTemplate)
        for (const name of REQUIRED_CLIPS) {
          const clip = gltf.animations.find((candidate) => candidate.name === name)
          if (clip) this.clipMap.set(name, clip)
        }

        const pending = this.pendingPopulation
        this.callbacks.onReady()
        if (pending) this.updatePopulation(pending.counts, pending.generation)
      },
      undefined,
      (error) => {
        if (!this.disposed) {
          this.callbacks.onError(`The deer model could not load: ${this.formatError(error)}`)
        }
      },
    )
  }

  private normalizeTemplate(template: THREE.Object3D): void {
    template.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(template)
    const size = box.getSize(new THREE.Vector3())
    const scale = 1.45 / Math.max(size.x, size.y, size.z, 0.001)
    template.scale.setScalar(scale)
    template.updateMatrixWorld(true)
    const scaledBox = new THREE.Box3().setFromObject(template)
    const center = scaledBox.getCenter(new THREE.Vector3())
    template.position.x -= center.x
    template.position.z -= center.z
    template.position.y -= scaledBox.min.y
  }

  private createActor(trait: TraitId, generation: number, traitIndex: number): DeerActor {
    if (!this.deerTemplate) throw new Error('Deer template is not ready.')

    const root = new THREE.Group()
    const model = clone(this.deerTemplate)
    const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterials[trait])
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.045
    root.add(ring, model)

    const markerCount = trait === 'higher_speed' ? 2 : 1
    for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
      const marker = new THREE.Mesh(this.markerGeometry, this.ringMaterials[trait])
      marker.rotation.x = Math.PI / 2
      marker.position.set((markerIndex - (markerCount - 1) / 2) * 0.23, 0.08, 0.73)
      root.add(marker)
    }

    const mixer = new THREE.AnimationMixer(model)
    const actor: DeerActor = {
      id: `g${generation}-${trait}-${traitIndex}`,
      trait,
      root,
      mixer,
      currentAction: null,
      motion: null,
    }
    this.playClip(actor, 'Idle', 1)
    return actor
  }

  private playClip(actor: DeerActor, name: RequiredClip, timeScale: number): void {
    const clip = this.clipMap.get(name)
    if (!clip) return
    const nextAction = actor.mixer.clipAction(clip)
    if (actor.currentAction !== nextAction) {
      actor.currentAction?.fadeOut(0.15)
      nextAction.reset().fadeIn(0.15).play()
      actor.currentAction = nextAction
    }
    nextAction.timeScale = timeScale
  }

  private clearPopulation(): void {
    for (const actor of this.actors) {
      actor.mixer.stopAllAction()
      actor.mixer.uncacheRoot(actor.mixer.getRoot())
      actor.root.removeFromParent()
    }
    this.actors.length = 0
  }

  private animate = (timestamp?: number): void => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.animate)
    this.timer.update(timestamp)
    const delta = Math.min(this.timer.getDelta(), 0.05)

    for (const actor of this.actors) {
      actor.mixer.update(delta)
      const motion = actor.motion
      if (!motion) continue
      motion.elapsed = Math.min(motion.elapsed + delta, motion.duration)
      const linear = motion.elapsed / motion.duration
      const eased = linear * linear * (3 - 2 * linear)
      actor.root.position.lerpVectors(motion.from, motion.to, eased)
      if (linear >= 1) actor.motion = null
    }

    this.renderer.render(this.scene, this.camera)
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingWaits.delete(timeoutId)
        resolve()
      }, milliseconds)
      this.pendingWaits.set(timeoutId, resolve)
    })
  }

  private disposeSceneResources(): void {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      geometries.add(object.geometry)
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      for (const material of objectMaterials) materials.add(material)
    })
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
    this.ringGeometry.dispose()
    this.markerGeometry.dispose()
    this.ringMaterials.higher_speed.dispose()
    this.ringMaterials.lower_speed.dispose()
    this.scene.clear()
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
