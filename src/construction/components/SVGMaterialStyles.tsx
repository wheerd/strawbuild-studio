import { DEFAULT_MATERIALS } from '@/construction/materials/material'
import { getMaterialCSSString } from '@/construction/materials/materialCSS'

/**
 * SVG style element that injects material CSS directly into SVG context
 * This ensures proper styling of construction elements within SVG
 */
export function SVGMaterialStyles(): React.JSX.Element {
  const css = getMaterialCSSString(Object.values(DEFAULT_MATERIALS))

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
