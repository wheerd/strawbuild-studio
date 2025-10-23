import fs from 'node:fs/promises'
import path from 'node:path'

import { extractFromDxf } from '../src/shared/services/floorplan_extract'

async function readDxf(filePath: string): Promise<string | ArrayBuffer> {
  const buffer = await fs.readFile(filePath)
  const isBinary = buffer.includes(0x00)
  return isBinary ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer.toString('utf-8')
}

async function main(): Promise<void> {
  const [fileArg] = process.argv.slice(2)
  if (!fileArg) {
    console.error('Usage: pnpm extract:dxf <file.dxf>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(process.cwd(), fileArg)

  try {
    await fs.access(resolvedPath)
  } catch {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  try {
    const content = await readDxf(resolvedPath)
    const result = await extractFromDxf(content, {})
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('DXF extraction failed')
    console.error(error instanceof Error ? error.stack ?? error.message : error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unexpected error while running DXF extractor')
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
