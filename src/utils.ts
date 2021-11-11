import {recursiveFindPages} from './recursive-readdir'

export function convertPageFilePathToRoutePath(
  filePath: string,
  pageExtensions: string[]
) {
  return filePath
  .replace(/^.*?[\\/]pages[\\/]/, '/')
  .replace(/^.*?[\\/]api[\\/]/, '/api/')
  .replace(/^.*?[\\/]queries[\\/]/, '/api/rpc/')
  .replace(/^.*?[\\/]mutations[\\/]/, '/api/rpc/')
  .replace(new RegExp(`\\.+(${pageExtensions.join('|')})$`), '')
}

export function getIsRpcFile(filePathFromAppRoot: string) {
  return (
    /[\\/]queries[\\/]/.test(filePathFromAppRoot) ||
    /[\\/]mutations[\\/]/.test(filePathFromAppRoot)
  )
}

export function buildPageExtensionRegex(pageExtensions: string[]) {
  return new RegExp(`(?<!\\.test|\\.spec)\\.(?:${pageExtensions.join('|')})$`)
}

export function collectPages(
  directory: string,
  pageExtensions: string[]
): Promise<string[]> {
  return recursiveFindPages(directory, buildPageExtensionRegex(pageExtensions))
}
