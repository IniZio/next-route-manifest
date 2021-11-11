import {join} from 'path'
import {outputFile} from 'fs-extra'
import {collectAllRoutes, generateManifest, NextConfigWithPageExtensionsOnly, parseDefaultExportName, parseParametersFromRoute, pascalCase, readFile, RouteManifestEntry} from './routes'

export async function saveRouteManifest(
  input: string,
  output: string,
  config: NextConfigWithPageExtensionsOnly
) {
  const allRoutes = await collectAllRoutes(input, config)
  const routes: Record<string, RouteManifestEntry> = {}

  for (const {filePath, route, type} of allRoutes) {
    if (type === 'api' || type === 'rpc')
      continue

    if (/\.mdx$/.test(filePath)) {
      routes[route] = {
        ...parseParametersFromRoute(route),
        name: route === '/' ? 'Index' : pascalCase(route),
        mdx: true,
      }
    } else {
      // eslint-disable-next-line no-await-in-loop
      const fileContents = await readFile(join(input, filePath), {
        encoding: 'utf-8',
      })

      const defaultExportName = parseDefaultExportName(fileContents as string)
      if (!defaultExportName)
        continue

      routes[route] = {
        ...parseParametersFromRoute(route),
        name: defaultExportName,
      }
    }
  }

  const {declaration, implementation} = generateManifest(routes)

  await outputFile(join(output, 'index.js'), implementation, {
    encoding: 'utf-8',
  })
  await outputFile(join(output, 'index-browser.js'), implementation, {
    encoding: 'utf-8',
  })
  await outputFile(join(output, 'index.d.ts'), declaration, {
    encoding: 'utf-8',
  })
}
