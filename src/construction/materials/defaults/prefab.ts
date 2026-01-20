import type { MaterialId, PrefabMaterial } from '@/construction/materials/material'

export const ecococonStandard: PrefabMaterial = {
  id: 'material_ecococon_standard' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Standard',
  nameKey: 'ecococon-standard',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850
}

export const ecococonBraced: PrefabMaterial = {
  id: 'material_ecococon_braced' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Braced',
  nameKey: 'ecococon-braced',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 500,
  maxWidth: 850
}

export const ecococonColumn: PrefabMaterial = {
  id: 'material_ecococon_column' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Column',
  nameKey: 'ecococon-column',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 550
}

export const ecococonInclined: PrefabMaterial = {
  id: 'material_ecococon_inclined' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Inclined',
  nameKey: 'ecococon-inclined',
  minHeight: 200,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 800,
  sloped: {
    minAngleDegrees: 1,
    maxAngleDegrees: 50
  }
}

export const ecococonLintel: PrefabMaterial = {
  id: 'material_ecococon_lintel' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Lintel',
  nameKey: 'ecococon-lintel',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000
}

export const ecococonSill: PrefabMaterial = {
  id: 'material_ecococon_sill' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Sill',
  nameKey: 'ecococon-sill',
  minHeight: 400,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 850,
  maxWidth: 3000
}

export const ecococonBox: PrefabMaterial = {
  id: 'material_ecococon_box' as MaterialId,
  type: 'prefab',
  color: '#555555',
  name: 'Ecococon Box Element',
  nameKey: 'ecococon-box',
  minHeight: 119,
  maxHeight: 532,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 6000
}
