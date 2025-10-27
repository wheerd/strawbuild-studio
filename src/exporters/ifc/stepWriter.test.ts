import { describe, expect, it } from 'vitest'

import { StepWriter, stepEnum, stepRaw, stepRef } from './stepWriter'

describe('StepWriter', () => {
  it('assigns incremental entity ids and formats references', () => {
    const writer = new StepWriter()
    const firstId = writer.addEntity('IFCPERSON', ['Guid', 'Name'])
    const secondId = writer.addEntity('IFCORGANIZATION', ['Guid', 'Org'])
    const relId = writer.addEntity('IFCRELASSOCIATES', [stepRef(firstId), stepRef(secondId)])

    expect(firstId).toBe(1)
    expect(secondId).toBe(2)
    expect(relId).toBe(3)

    const output = writer.build({ name: 'Test', description: ['UnitTest'], timestamp: '2024-01-01T00:00:00Z' })
    expect(output).toContain(`#1=IFCPERSON('Guid','Name');`)
    expect(output).toContain(`#3=IFCRELASSOCIATES(#1,#2);`)
  })

  it('serialises enums, raw values, and nested parameters', () => {
    const writer = new StepWriter()
    const unitId = writer.addEntity('IFCSIUNIT', [stepRaw('*'), stepEnum('LENGTHUNIT'), null, stepEnum('METRE')])
    writer.addEntity('IFCUNITASSIGNMENT', [[stepRef(unitId), stepRaw('IFCLENGTHMEASURE(2500)')]])

    const output = writer.build({ name: 'EnumTest', timestamp: '2024-01-01T00:00:00Z' })
    expect(output).toContain(`#1=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`)
    expect(output).toContain(`#2=IFCUNITASSIGNMENT((#1,IFCLENGTHMEASURE(2500)));`)
    expect(output).toMatch(/FILE_NAME\('EnumTest','2024-01-01T00:00:00Z'/)
    expect(output).toContain(`FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');`)
  })

  it('escapes single quotes in string parameters', () => {
    const writer = new StepWriter()
    writer.addEntity('IFCPERSON', ["O'Brien", "Unit'Test"])
    const output = writer.build({ name: "O'Brien Test", timestamp: '2024-01-01T00:00:00Z' })

    expect(output).toContain(`#1=IFCPERSON('O''Brien','Unit''Test');`)
    expect(output).toContain(`FILE_NAME('O''Brien Test','2024-01-01T00:00:00Z'`)
  })
})
