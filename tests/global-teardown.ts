import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import { cleanupTestProjects } from './fixtures/auth'

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.test.local'),
  quiet: true
})

export default async function globalTeardown() {
  await cleanupTestProjects('Journey')
}
