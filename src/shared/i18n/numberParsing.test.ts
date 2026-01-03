import { describe, expect, it } from 'vitest'

import {
  formatNumberForInput,
  formatNumberForInputCompact,
  getDecimalSeparator,
  isCompleteLocaleNumber,
  isValidLocaleNumericInput,
  normalizeDecimalSeparator,
  parseLocaleNumber
} from './numberParsing'

describe('numberParsing', () => {
  describe('normalizeDecimalSeparator', () => {
    it('replaces comma with period', () => {
      expect(normalizeDecimalSeparator('12,5')).toBe('12.5')
    })

    it('keeps period as-is', () => {
      expect(normalizeDecimalSeparator('12.5')).toBe('12.5')
    })

    it('handles integers', () => {
      expect(normalizeDecimalSeparator('12')).toBe('12')
    })
  })

  describe('parseLocaleNumber', () => {
    it('parses numbers with period', () => {
      expect(parseLocaleNumber('12.5')).toBe(12.5)
    })

    it('parses numbers with comma', () => {
      expect(parseLocaleNumber('12,5')).toBe(12.5)
    })

    it('parses integers', () => {
      expect(parseLocaleNumber('12')).toBe(12)
    })

    it('parses negative numbers', () => {
      expect(parseLocaleNumber('-12.5')).toBe(-12.5)
      expect(parseLocaleNumber('-12,5')).toBe(-12.5)
    })

    it('returns null for invalid input', () => {
      expect(parseLocaleNumber('abc')).toBeNull()
      expect(parseLocaleNumber('')).toBeNull()
      expect(parseLocaleNumber('.')).toBeNull()
      expect(parseLocaleNumber(',')).toBeNull()
      expect(parseLocaleNumber('-')).toBeNull()
    })
  })

  describe('isValidLocaleNumericInput', () => {
    it('accepts valid numbers with period', () => {
      expect(isValidLocaleNumericInput('12.5')).toBe(true)
    })

    it('accepts valid numbers with comma', () => {
      expect(isValidLocaleNumericInput('12,5')).toBe(true)
    })

    it('accepts integers', () => {
      expect(isValidLocaleNumericInput('12')).toBe(true)
    })

    it('accepts negative numbers', () => {
      expect(isValidLocaleNumericInput('-12.5')).toBe(true)
      expect(isValidLocaleNumericInput('-12,5')).toBe(true)
    })

    it('accepts incomplete input while typing', () => {
      expect(isValidLocaleNumericInput('12.')).toBe(true)
      expect(isValidLocaleNumericInput('12,')).toBe(true)
      expect(isValidLocaleNumericInput('-')).toBe(true)
      expect(isValidLocaleNumericInput('.')).toBe(true)
      expect(isValidLocaleNumericInput(',')).toBe(true)
    })

    it('accepts empty string', () => {
      expect(isValidLocaleNumericInput('')).toBe(true)
    })

    it('rejects invalid characters', () => {
      expect(isValidLocaleNumericInput('abc')).toBe(false)
      expect(isValidLocaleNumericInput('12a')).toBe(false)
      expect(isValidLocaleNumericInput('12.5.3')).toBe(false)
    })
  })

  describe('isCompleteLocaleNumber', () => {
    it('accepts complete numbers', () => {
      expect(isCompleteLocaleNumber('12.5')).toBe(true)
      expect(isCompleteLocaleNumber('12,5')).toBe(true)
      expect(isCompleteLocaleNumber('12')).toBe(true)
      expect(isCompleteLocaleNumber('-12.5')).toBe(true)
      // parseFloat treats these as valid numbers (12.0)
      expect(isCompleteLocaleNumber('12.')).toBe(true)
      expect(isCompleteLocaleNumber('12,')).toBe(true)
    })

    it('rejects incomplete numbers', () => {
      expect(isCompleteLocaleNumber('-')).toBe(false)
      expect(isCompleteLocaleNumber('.')).toBe(false)
      expect(isCompleteLocaleNumber(',')).toBe(false)
      expect(isCompleteLocaleNumber('')).toBe(false)
    })

    it('rejects invalid input', () => {
      expect(isCompleteLocaleNumber('abc')).toBe(false)
    })
  })

  describe('getDecimalSeparator', () => {
    it('returns period for English locale', () => {
      expect(getDecimalSeparator('en')).toBe('.')
      expect(getDecimalSeparator('en-US')).toBe('.')
      expect(getDecimalSeparator('en-GB')).toBe('.')
    })

    it('returns comma for German locale', () => {
      expect(getDecimalSeparator('de')).toBe(',')
      expect(getDecimalSeparator('de-DE')).toBe(',')
    })

    it('returns comma for French locale', () => {
      expect(getDecimalSeparator('fr')).toBe(',')
      expect(getDecimalSeparator('fr-FR')).toBe(',')
    })
  })

  describe('formatNumberForInput', () => {
    describe('English locale (en)', () => {
      const locale = 'en'

      it('formats with period decimal separator', () => {
        expect(formatNumberForInput(12.5, 1, locale)).toBe('12.5')
        expect(formatNumberForInput(12.5, 2, locale)).toBe('12.50')
      })

      it('formats integers', () => {
        expect(formatNumberForInput(12, 0, locale)).toBe('12')
        expect(formatNumberForInput(12, 2, locale)).toBe('12.00')
      })

      it('does not use thousands separators', () => {
        expect(formatNumberForInput(1234.5, 1, locale)).toBe('1234.5')
        expect(formatNumberForInput(12345.67, 2, locale)).toBe('12345.67')
      })
    })

    describe('German locale (de)', () => {
      const locale = 'de'

      it('formats with comma decimal separator', () => {
        expect(formatNumberForInput(12.5, 1, locale)).toBe('12,5')
        expect(formatNumberForInput(12.5, 2, locale)).toBe('12,50')
      })

      it('formats integers', () => {
        expect(formatNumberForInput(12, 0, locale)).toBe('12')
        expect(formatNumberForInput(12, 2, locale)).toBe('12,00')
      })

      it('does not use thousands separators', () => {
        expect(formatNumberForInput(1234.5, 1, locale)).toBe('1234,5')
        expect(formatNumberForInput(12345.67, 2, locale)).toBe('12345,67')
      })
    })
  })

  describe('formatNumberForInputCompact', () => {
    describe('English locale (en)', () => {
      const locale = 'en'

      it('removes trailing zeros', () => {
        expect(formatNumberForInputCompact(12.5, 2, locale)).toBe('12.5')
        expect(formatNumberForInputCompact(12.0, 2, locale)).toBe('12')
        expect(formatNumberForInputCompact(12.0, 1, locale)).toBe('12')
      })

      it('preserves necessary decimals', () => {
        expect(formatNumberForInputCompact(12.34, 2, locale)).toBe('12.34')
        expect(formatNumberForInputCompact(12.3, 2, locale)).toBe('12.3')
      })
    })

    describe('German locale (de)', () => {
      const locale = 'de'

      it('removes trailing zeros', () => {
        expect(formatNumberForInputCompact(12.5, 2, locale)).toBe('12,5')
        expect(formatNumberForInputCompact(12.0, 2, locale)).toBe('12')
        expect(formatNumberForInputCompact(12.0, 1, locale)).toBe('12')
      })

      it('preserves necessary decimals', () => {
        expect(formatNumberForInputCompact(12.34, 2, locale)).toBe('12,34')
        expect(formatNumberForInputCompact(12.3, 2, locale)).toBe('12,3')
      })
    })
  })
})
