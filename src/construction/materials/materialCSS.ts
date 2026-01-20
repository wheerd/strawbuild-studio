import type { Material } from './material'

/**
 * Generates CSS styles for construction materials
 * Creates material-specific classes that style children with the 'apply-material' class
 */
export function generateMaterialCSS(materials: Material[]): string {
  const materialRules = materials
    .map(
      material =>
        `.${material.id} .apply-material {
  fill: ${material.color};
  stroke: var(--color-border-contrast);
  stroke-width: 5;
}`
    )
    .join('\n\n')

  return `/* Construction Material Styles */\n${materialRules}`
}

/**
 * Injects material CSS into the document head
 * Creates or updates a style element with the given materials
 */
export function injectMaterialCSS(materials: Material[]): void {
  const css = generateMaterialCSS(materials)
  const styleId = 'construction-materials'

  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = styleId
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = css
}

/**
 * Gets the raw CSS string for materials
 * Can be used to embed styles directly in SVG elements
 */
export function getMaterialCSSString(materials: Material[]): string {
  return generateMaterialCSS(materials)
}
