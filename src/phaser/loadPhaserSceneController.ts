import type {
  PhaserControllerEvents,
  PhaserSceneController,
} from './PhaserSceneController.ts'

/**
 * Keeps Phaser out of the initial bundle while giving renderer startup one
 * explicit async boundary. Tests can replace this boundary without pretending
 * that the application began in observation mode.
 */
export async function loadPhaserSceneController(
  host: HTMLElement,
  events: PhaserControllerEvents,
): Promise<PhaserSceneController> {
  const { PhaserSceneController } = await import('./PhaserSceneController.ts')
  return new PhaserSceneController(host, events)
}
