import {promises} from 'fs'
import {createPagesMapping} from './entries'
import {collectPages, getIsRpcFile} from './utils'
import {newline} from './output/log'
export const readFile = promises.readFile

export type NextConfigWithPageExtensionsOnly = {
  pageExtensions: string[];
}

export type RouteType = 'page' | 'rpc' | 'api'
export type RouteVerb = 'get' | 'post' | 'patch' | 'head' | 'delete' | '*'
export type RouteCacheEntry = {
  filePath: string;
  route: string;
  verb: string;
  type: RouteType;
}

function getVerb(type: RouteType): RouteVerb {
  switch (type) {
  case 'api':
    return '*'
  case 'rpc':
    return 'post'
  default:
    return 'get'
  }
}

// from https://github.com/angus-c/just/blob/master/packages/array-partition/index.js
function partition(arr: any[], predicate: (value: any) => boolean) {
  if (!Array.isArray(arr)) {
    throw new TypeError('expected first argument to be an array')
  }
  if (typeof predicate !== 'function') {
    throw new TypeError('expected second argument to be a function')
  }
  const first = []
  const second = []
  const length = arr.length
  for (let i = 0; i < length; i++) {
    const nextValue = arr[i]
    if (predicate(nextValue)) {
      first.push(nextValue)
    } else {
      second.push(nextValue)
    }
  }
  return [first, second]
}

const apiPathRegex = /([\\/]api[\\/])/

export async function collectAllRoutes(
  directory: string,
  {pageExtensions = ['tsx', 'ts', 'jsx', 'js']}: NextConfigWithPageExtensionsOnly
) {
  const routeFiles = await collectPages(directory, pageExtensions!)
  const rawRouteMappings = createPagesMapping(
    routeFiles,
    pageExtensions!
  )
  const routes: RouteCacheEntry[] = []
  for (const [route, filePath] of Object.entries(rawRouteMappings)) {
    if (['/_app', '/_document', '/_error'].includes(route)) continue
    let type: RouteType
    if (getIsRpcFile(filePath)) {
      type = 'rpc'
    } else if (apiPathRegex.test(filePath)) {
      type = 'api'
    } else {
      type = 'page'
    }
    routes.push({
      filePath: filePath.replace('private-next-pages/', ''),
      route,
      type,
      verb: getVerb(type),
    })
  }
  return routes
}

type Parameter = {
  name: string;
  optional: boolean;
}
export interface RouteManifestEntry {
  name: string;
  parameters: Parameter[];
  multipleParameters: Parameter[];
  mdx?: boolean;
}

export const pascalCase = (value: string): string => {
  const val = value.replace(/[-_\s/.]+(.)?/g, (_match, chr) =>
    chr ? chr.toUpperCase() : ''
  )
  return val.substr(0, 1).toUpperCase() + val.substr(1)
}

export function parseDefaultExportName(contents: string): string | null {
  const result = contents.match(
    /export\s+default(?:\s+(?:const|let|class|var|function))?\s+(\w+)/
  )
  if (!result) {
    return null
  }

  return result[1] ?? null
}

function dedupeBy<T>(
  arr: [string, T][],
  by: (v: [string, T]) => string
): [string, T][] {
  const allKeys = arr.map(by)
  const countKeys = allKeys.reduce(
    (obj, key) => ({...obj, [key]: (obj[key] || 0) + 1}),
    {} as { [key: string]: number }
  )
  const duplicateKeys = Object.keys(countKeys).filter(
    key => countKeys[key] > 1
  )

  if (duplicateKeys.length !== 0) {
    newline()

    duplicateKeys.forEach(key => {
      let errorMessage = `The page component is named "${key}" on the following routes:\n\n`
      arr
      .filter(v => by(v) === key)
      .forEach(([route]) => {
        errorMessage += `\t${route}\n`
      })
      // eslint-disable-next-line no-console
      console.error(errorMessage)
    })

    // eslint-disable-next-line no-console
    console.error(
      'The page component must have a unique name across all routes, so change the component names so they are all unique.\n'
    )

    // Don't throw error in internal monorepo development because existing nextjs
    // integration tests all have duplicate page names
    if (
      process.env.NODE_ENV === 'production'
    ) {
      const error = new Error('Duplicate Page Name')
      delete error.stack
      throw error
    }
  }

  return arr.filter(v => !duplicateKeys.includes(by(v)))
}

export function generateManifest(
  routes: Record<string, RouteManifestEntry>
): { implementation: string; declaration: string } {
  const routesWithoutDuplicates = dedupeBy(
    Object.entries(routes),
    ([_path, {name}]) => name
  )

  const implementationLines = routesWithoutDuplicates.map(
    ([path, {name}]) => `${name}: (query) => ({ pathname: "${path}", query })`
  )

  const declarationLines = routesWithoutDuplicates.map(
    ([_path, {name, parameters, multipleParameters}]) => {
      if (parameters.length === 0 && multipleParameters.length === 0) {
        return `${name}(query?: ParsedUrlQueryInput): RouteUrlObject`
      }

      return `${name}(query: { ${[
        ...parameters.map(
          param =>
            param.name + (param.optional ? '?' : '') + ': string | number'
        ),
        ...multipleParameters.map(
          param =>
            param.name + (param.optional ? '?' : '') + ': (string | number)[]'
        ),
      ].join('; ')} } & ParsedUrlQueryInput): RouteUrlObject`
    }
  )

  const declarationEnding = declarationLines.length > 0 ? ';' : ''

  return {
    implementation:
      'exports.Routes = {\n' +
      implementationLines.map(line => '  ' + line).join(',\n') +
      '\n}',
    declaration: `
import type { ParsedUrlQueryInput } from "querystring"
import type { RouteUrlObject } from "next/types"

export const Routes: {
${declarationLines.map(line => '  ' + line).join(';\n') + declarationEnding}
}`.trim(),
  }
}

function removeSquareBracketsFromSegments(value: string): string

function removeSquareBracketsFromSegments(value: string[]): string[]

function removeSquareBracketsFromSegments(
  value: string | string[]
): string | string[] {
  if (typeof value === 'string') {
    return value.replace('[', '').replace(']', '')
  }
  return value.map(val => val.replace('[', '').replace(']', ''))
}

const squareBracketsRegex = /\[\[.*?\]\]|\[.*?\]/g

export function parseParametersFromRoute(
  path: string
): Pick<RouteManifestEntry, 'parameters' | 'multipleParameters'> {
  const parameteredSegments = path.match(squareBracketsRegex) ?? []
  const withoutBrackets = removeSquareBracketsFromSegments(parameteredSegments)

  const [multipleParameters, parameters] = partition(withoutBrackets, p =>
    p.includes('...')
  )

  return {
    parameters: parameters.map(value => {
      const containsSquareBrackets = squareBracketsRegex.test(value)
      if (containsSquareBrackets) {
        return {
          name: removeSquareBracketsFromSegments(value),
          optional: true,
        }
      }

      return {
        name: value,
        optional: false,
      }
    }),
    multipleParameters: multipleParameters.map(param => {
      const withoutEllipsis = param.replace('...', '')
      const containsSquareBrackets = squareBracketsRegex.test(withoutEllipsis)

      if (containsSquareBrackets) {
        return {
          name: removeSquareBracketsFromSegments(withoutEllipsis),
          optional: true,
        }
      }

      return {
        name: withoutEllipsis,
        optional: false,
      }
    }),
  }
}
