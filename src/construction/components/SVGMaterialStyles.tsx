import { getMaterialCSSString } from '@/construction/materials/materialCSS'
import { useMaterials } from '@/construction/materials/store'

/**
 * SVG style element that injects material CSS directly into SVG context
 * This ensures proper styling of construction elements within SVG
 */
export function SVGMaterialStyles(): React.JSX.Element {
  const materials = useMaterials()
  const css = getMaterialCSSString(materials)

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
