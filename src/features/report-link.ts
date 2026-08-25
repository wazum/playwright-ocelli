import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_FOLDER = 'playwright-report'

export type ReporterDescription = [string, Record<string, unknown>?]

export function reportLink(
  configDir: string,
  reporters: ReporterDescription[],
  testId: string,
) {
  const html = reporters.find(([name]) => name === 'html')

  if (html === undefined) return null

  const url = pathToFileURL(join(outputFolder(configDir, html), 'index.html'))
  url.hash = `?testId=${testId}`

  return url.href
}

function outputFolder(configDir: string, html: ReporterDescription) {
  const configured = html[1]?.outputFolder

  if (configured !== undefined) return resolve(configDir, String(configured))

  return join(packageRootAbove(configDir), DEFAULT_FOLDER)
}

function packageRootAbove(startDirectory: string) {
  let directory = startDirectory

  while (!existsSync(join(directory, 'package.json'))) {
    const parent = dirname(directory)

    if (parent === directory) return process.cwd()

    directory = parent
  }

  return directory
}
