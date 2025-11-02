import { strawbale } from '@/construction/materials/material'

export type MigrationState = Record<string, unknown>
export type Migration = (state: MigrationState) => void

export const defaultStrawConfig = {
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70
}
