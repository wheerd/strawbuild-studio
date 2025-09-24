import { describe, it, expect } from 'vitest'
import { convertConstructionToSvg, convertPointToSvg } from './constructionCoordinates'
import type { Vec3, Length } from '@/shared/geometry'

describe('constructionCoordinates', () => {
  const wallHeight = 2400
  const wallLength = 3000

  describe('convertConstructionToSvg', () => {
    it('converts construction element coordinates to SVG for outside view', () => {
      const position: Vec3 = [100 as Length, 0 as Length, 200 as Length]
      const size: Vec3 = [800 as Length, 100 as Length, 1200 as Length]

      const result = convertConstructionToSvg(position, size, wallHeight, wallLength, 'outside')

      expect(result.position).toEqual({
        x: 100, // Same x position
        y: 1000 // wallHeight - position[2] - size[2] = 2400 - 200 - 1200 = 1000
      })
      expect(result.size).toEqual({
        x: 800, // Same width
        y: 1200 // Same height (size[2])
      })
    })

    it('converts construction element coordinates to SVG for inside view', () => {
      const position: Vec3 = [100 as Length, 0 as Length, 200 as Length]
      const size: Vec3 = [800 as Length, 100 as Length, 1200 as Length]

      const result = convertConstructionToSvg(position, size, wallHeight, wallLength, 'inside')

      expect(result.position).toEqual({
        x: 2100, // wallLength - position[0] - size[0] = 3000 - 100 - 800 = 2100
        y: 1000 // Same y calculation as outside view
      })
      expect(result.size).toEqual({
        x: 800, // Same width
        y: 1200 // Same height
      })
    })
  })

  describe('convertPointToSvg', () => {
    it('converts construction point to SVG for outside view', () => {
      const result = convertPointToSvg(500, 800, wallHeight, wallLength, 'outside')

      expect(result[0]).toBe(500)
      expect(result[1]).toBe(1600) // wallHeight - z = 2400 - 800
    })

    it('converts construction point to SVG for inside view', () => {
      const result = convertPointToSvg(500, 800, wallHeight, wallLength, 'inside')

      expect(result[0]).toBe(2500) // wallLength - x = 3000 - 500
      expect(result[1]).toBe(1600) // wallHeight - z = 2400 - 800
    })

    it('handles ground level points', () => {
      const result = convertPointToSvg(1000, 0, wallHeight, wallLength, 'outside')

      expect(result[0]).toBe(1000)
      expect(result[1]).toBe(2400) // wallHeight - z = 2400 - 0
    })

    it('handles wall top points', () => {
      const result = convertPointToSvg(1500, 2400, wallHeight, wallLength, 'outside')

      expect(result[0]).toBe(1500)
      expect(result[1]).toBe(0) // wallHeight - z = 2400 - 2400
    })
  })

  describe('coordinate consistency', () => {
    it('produces consistent results for element center vs point conversion', () => {
      const position: Vec3 = [100 as Length, 0 as Length, 200 as Length]
      const size: Vec3 = [800 as Length, 100 as Length, 1200 as Length]

      // Convert element using convertConstructionToSvg
      const elementResult = convertConstructionToSvg(position, size, wallHeight, wallLength, 'outside')
      const elementCenterX = elementResult.position.x + elementResult.size.x / 2
      const elementCenterY = elementResult.position.y + elementResult.size.y / 2

      // Convert element center point using convertPointToSvg
      const centerX = position[0] + size[0] / 2
      const centerZ = position[2] + size[2] / 2
      const pointResult = convertPointToSvg(centerX, centerZ, wallHeight, wallLength, 'outside')

      expect(pointResult[0]).toEqual(elementCenterX)
      expect(pointResult[1]).toEqual(elementCenterY)
    })
  })
})
