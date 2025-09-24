import type Konva from 'konva'

/**
 * Global stage reference for entity hit testing.
 * This is a simple singleton to avoid complex prop drilling.
 */
class StageReference {
  private stage: Konva.Stage | null = null

  setStage(stage: Konva.Stage): void {
    this.stage = stage
  }

  getStage(): Konva.Stage | null {
    return this.stage
  }

  clearStage(): void {
    this.stage = null
  }
}

export const stageReference = new StageReference()
