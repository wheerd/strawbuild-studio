/**
 * Global stage/SVG reference for entity hit testing.
 * This is a simple singleton to avoid complex prop drilling.
 */
class StageReference {
  private svgElement: SVGSVGElement | null = null

  setSvg(svg: SVGSVGElement): void {
    this.svgElement = svg
  }

  getSvg(): SVGSVGElement | null {
    return this.svgElement
  }

  clearStage(): void {
    this.svgElement = null
  }

  // Deprecated - for backward compatibility during transition
  getStage(): any {
    console.warn('getStage() is deprecated, use getSvg() instead')
    return null
  }

  // Deprecated - for backward compatibility during transition
  setStage(): void {
    console.warn('setStage() is deprecated, use setSvg() instead')
  }
}

export const stageReference = new StageReference()
