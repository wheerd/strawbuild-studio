import type { MaterialId, VolumeMaterial } from '@/construction/materials/material'

export const concrete: VolumeMaterial = {
  id: 'material_concrete' as MaterialId,
  name: 'Concrete',
  nameKey: 'concrete',
  type: 'volume',
  color: '#97989d',
  availableVolumes: [],
  density: 2400
}

export const clayPlasterBase: VolumeMaterial = {
  id: 'material_clay_plaster_base' as MaterialId,
  name: 'Clay plaster (base)',
  nameKey: 'clayPlasterBase',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605],
  color: '#927d61',
  density: 1670
}

export const clayPlasterFine: VolumeMaterial = {
  id: 'material_clay_plaster_fine' as MaterialId,
  name: 'Clay plaster (fine)',
  nameKey: 'clayPlasterFine',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605],
  color: '#927d61',
  density: 1670
}

export const limePlasterBase: VolumeMaterial = {
  id: 'material_lime_plaster_base' as MaterialId,
  name: 'Lime plaster (base)',
  nameKey: 'limePlasterBase',
  type: 'volume',
  availableVolumes: [19800000],
  color: '#e5dbd3',
  density: 1262
}

export const limePlasterFine: VolumeMaterial = {
  id: 'material_lime_plaster_fine' as MaterialId,
  name: 'Lime plaster (fine)',
  nameKey: 'limePlasterFine',
  type: 'volume',
  availableVolumes: [19800000],
  color: '#e5dbd3',
  density: 1262
}

export const cementScreed: VolumeMaterial = {
  id: 'material_cement_screed' as MaterialId,
  name: 'Cement screed',
  nameKey: 'cementScreed',
  type: 'volume',
  availableVolumes: [],
  color: '#767773',
  density: 2000
}

export const impactSoundInsulation: VolumeMaterial = {
  id: 'material_impact_sound_insulation' as MaterialId,
  name: 'Impact sound insulation',
  nameKey: 'impactSoundInsulation',
  type: 'volume',
  availableVolumes: [],
  color: '#CCCC33',
  density: 40
}
