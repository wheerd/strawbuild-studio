interface StepReference {
  readonly kind: 'ref'
  readonly id: number
}

interface StepEnum {
  readonly kind: 'enum'
  readonly value: string
}

export interface StepRaw {
  readonly kind: 'raw'
  readonly value: string
}

type StepPrimitive = number | string | boolean
export type StepParameter = StepPrimitive | null | StepReference | StepEnum | StepRaw | StepParameter[]

export interface StepHeaderOptions {
  readonly description?: string[]
  readonly name?: string
  readonly author?: string
  readonly organization?: string
  readonly application?: string
  readonly schema?: string
  readonly timestamp?: string
}

export interface StepEntity {
  readonly id: number
  readonly type: string
  readonly params: StepParameter[]
}

export function stepRef(id: number): StepReference {
  return { kind: 'ref', id }
}

export function stepEnum(value: string): StepEnum {
  return { kind: 'enum', value }
}

export function stepRaw(value: string): StepRaw {
  return { kind: 'raw', value }
}

const DEFAULT_SCHEMA = 'IFC4'

export class StepWriter {
  private nextId = 1
  private readonly entities: StepEntity[] = []

  addEntity(type: string, params: StepParameter[]): number {
    const id = this.nextId++
    this.entities.push({ id, type: type.toUpperCase(), params })
    return id
  }

  build(headerOptions?: StepHeaderOptions): string {
    const schema = headerOptions?.schema ?? DEFAULT_SCHEMA
    const defaultDescription =
      schema.startsWith('IFC4') || schema === 'IFC4X3'
        ? ['ViewDefinition [ReferenceView]']
        : ['ViewDefinition [CoordinationViewV2.0]']
    const {
      description = defaultDescription,
      name = 'Strawbaler IFC Export',
      author = 'Strawbaler',
      organization = 'Strawbaler',
      application = 'Strawbaler IFC Exporter',
      timestamp = new Date().toISOString()
    } = headerOptions ?? {}

    const header = this.buildHeader({
      description,
      name,
      author,
      organization,
      application,
      schema,
      timestamp
    })

    const dataSection = this.entities
      .map(entity => `#${entity.id}=${entity.type}(${entity.params.map(formatParameter).join(',')});`)
      .join('\n')

    return `ISO-10303-21;
HEADER;
${header}
ENDSEC;
DATA;
${dataSection}
ENDSEC;
END-ISO-10303-21;
`
  }

  private buildHeader(
    options: Required<Omit<StepHeaderOptions, 'description' | 'schema'>> & {
      description: string[]
      schema: string
    }
  ): string {
    const description = `FILE_DESCRIPTION((${options.description.map(s => `'${escapeString(s)}'`).join(',')}),'2;1');`
    const fileName = `FILE_NAME('${escapeString(options.name)}','${options.timestamp}',('${escapeString(options.author)}'),('${escapeString(options.organization)}'),'','${escapeString(options.application)}','${escapeString(options.application)}');`
    const schema = `FILE_SCHEMA(('${escapeString(options.schema)}'));`
    return `${description}
${fileName}
${schema}`
  }
}

function formatParameter(value: StepParameter): string {
  if (value === null || value === undefined) {
    return '$'
  }
  if (Array.isArray(value)) {
    return `(${value.map(formatParameter).join(',')})`
  }
  if (typeof value === 'number') {
    return formatNumber(value)
  }
  if (typeof value === 'boolean') {
    return value ? '.T.' : '.F.'
  }
  if (typeof value === 'string') {
    return `'${escapeString(value)}'`
  }
  if (value.kind === 'ref') {
    return `#${value.id}`
  }
  if (value.kind === 'enum') {
    return `.${value.value.toUpperCase()}.`
  }
  if (value.kind === 'raw') {
    return value.value
  }
  // Fallback in case of unexpected value type
  return '$'
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

export function formatNumber(value: number): string {
  return value.toFixed(6).replace(/(?<!\.)0+$/, '')
}
