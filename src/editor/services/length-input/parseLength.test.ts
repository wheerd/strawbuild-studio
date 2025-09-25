import { describe, expect, it } from 'vitest'

import { isValidLengthInput, parseLength, parseLengthValue } from './parseLength'

describe('parseLength', () => {
  describe('valid inputs', () => {
    it('should parse bare numbers as millimeters', () => {
      expect(parseLength('500')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('0')).toEqual({
        success: true,
        value: 0
      })

      expect(parseLength('1234')).toEqual({
        success: true,
        value: 1234
      })
    })

    it('should parse decimal numbers as millimeters', () => {
      expect(parseLength('12.5')).toEqual({
        success: true,
        value: 13 // Rounded to nearest mm
      })

      expect(parseLength('100.7')).toEqual({
        success: true,
        value: 101
      })
    })

    it('should parse millimeter values', () => {
      expect(parseLength('500mm')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('500 mm')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('12.5mm')).toEqual({
        success: true,
        value: 13
      })
    })

    it('should parse centimeter values', () => {
      expect(parseLength('50cm')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('50 cm')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('5.5cm')).toEqual({
        success: true,
        value: 55
      })

      expect(parseLength('0.1cm')).toEqual({
        success: true,
        value: 1
      })
    })

    it('should parse meter values', () => {
      expect(parseLength('0.5m')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('1m')).toEqual({
        success: true,
        value: 1000
      })

      expect(parseLength('1.25m')).toEqual({
        success: true,
        value: 1250
      })

      expect(parseLength('2.5 m')).toEqual({
        success: true,
        value: 2500
      })
    })

    it('should handle negative values', () => {
      expect(parseLength('-100')).toEqual({
        success: true,
        value: -100
      })

      expect(parseLength('-5cm')).toEqual({
        success: true,
        value: -50
      })

      expect(parseLength('-0.1m')).toEqual({
        success: true,
        value: -100
      })
    })

    it('should handle positive sign', () => {
      expect(parseLength('+100')).toEqual({
        success: true,
        value: 100
      })

      expect(parseLength('+5cm')).toEqual({
        success: true,
        value: 50
      })
    })

    it('should be case insensitive for units', () => {
      expect(parseLength('50CM')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('0.5M')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength('100MM')).toEqual({
        success: true,
        value: 100
      })
    })

    it('should handle whitespace', () => {
      expect(parseLength('  500  ')).toEqual({
        success: true,
        value: 500
      })

      expect(parseLength(' 50 cm ')).toEqual({
        success: true,
        value: 500
      })
    })
  })

  describe('invalid inputs', () => {
    it('should reject empty or null inputs', () => {
      expect(parseLength('')).toEqual({
        success: false,
        value: null,
        error: 'Input is required'
      })

      expect(parseLength('   ')).toEqual({
        success: false,
        value: null,
        error: 'Input cannot be empty'
      })
    })

    it('should reject non-numeric inputs', () => {
      expect(parseLength('abc')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })

      expect(parseLength('hello world')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })
    })

    it('should reject invalid number formats', () => {
      expect(parseLength('12.34.56')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })

      expect(parseLength('12..34')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })
    })

    it('should reject unsupported units', () => {
      expect(parseLength('12ft')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })

      expect(parseLength('12in')).toEqual({
        success: false,
        value: null,
        error: 'Invalid format. Use formats like: 500, 50cm, 0.5m'
      })
    })

    it('should reject infinite values', () => {
      // Note: These would be caught by the regex, but testing edge cases
      const result = parseLength('Infinity')
      expect(result.success).toBe(false)
    })
  })

  describe('rounding behavior', () => {
    it('should round to nearest millimeter', () => {
      expect(parseLength('12.4')).toEqual({
        success: true,
        value: 12
      })

      expect(parseLength('12.5')).toEqual({
        success: true,
        value: 13
      })

      expect(parseLength('12.6')).toEqual({
        success: true,
        value: 13
      })
    })

    it('should round centimeter decimals correctly', () => {
      expect(parseLength('1.24cm')).toEqual({
        success: true,
        value: 12 // 12.4mm rounded to 12mm
      })

      expect(parseLength('1.25cm')).toEqual({
        success: true,
        value: 13 // 12.5mm rounded to 13mm
      })
    })

    it('should round meter decimals correctly', () => {
      expect(parseLength('0.0124m')).toEqual({
        success: true,
        value: 12 // 12.4mm rounded to 12mm
      })

      expect(parseLength('0.0125m')).toEqual({
        success: true,
        value: 13 // 12.5mm rounded to 13mm
      })
    })
  })
})

describe('parseLengthValue', () => {
  it('should return value for valid input', () => {
    expect(parseLengthValue('500')).toBe(500)
    expect(parseLengthValue('50cm')).toBe(500)
    expect(parseLengthValue('0.5m')).toBe(500)
  })

  it('should return null for invalid input', () => {
    expect(parseLengthValue('invalid')).toBe(null)
    expect(parseLengthValue('')).toBe(null)
    expect(parseLengthValue('12ft')).toBe(null)
  })
})

describe('isValidLengthInput', () => {
  it('should return true for valid inputs', () => {
    expect(isValidLengthInput('500')).toBe(true)
    expect(isValidLengthInput('50cm')).toBe(true)
    expect(isValidLengthInput('0.5m')).toBe(true)
    expect(isValidLengthInput('-100')).toBe(true)
  })

  it('should return false for invalid inputs', () => {
    expect(isValidLengthInput('invalid')).toBe(false)
    expect(isValidLengthInput('')).toBe(false)
    expect(isValidLengthInput('12ft')).toBe(false)
    expect(isValidLengthInput('12.34.56')).toBe(false)
  })
})
