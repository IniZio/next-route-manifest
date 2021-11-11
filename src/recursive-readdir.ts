import {Dirent, promises} from 'fs'
import {join} from 'path'
import {getIsRpcFile} from './utils'

export function getIsPageFile(filePathFromAppRoot: string) {
  return (
    /[\\/]pages[\\/]/.test(filePathFromAppRoot) ||
    /[\\/]api[\\/]/.test(filePathFromAppRoot) ||
    getIsRpcFile(filePathFromAppRoot)
  )
}

export const topLevelFoldersThatMayContainPages = [
  'pages',
  'src',
  'app',
  'integrations',
]

// eslint-disable-next-line max-params
export async function recursiveReadDir(
  dir: string,
  filter: RegExp,
  ignore?: RegExp,
  arr: string[] = [],
  rootDir: string = dir
): Promise<string[]> {
  const result = await promises.readdir(dir, {withFileTypes: true})

  await Promise.all(
    result.map(async (part: Dirent) => {
      const absolutePath = join(dir, part.name)
      if (ignore && ignore.test(part.name)) return

      // readdir does not follow symbolic links
      // if part is a symbolic link, follow it using stat
      let isDirectory = part.isDirectory()
      if (part.isSymbolicLink()) {
        const stats = await promises.stat(absolutePath)
        isDirectory = stats.isDirectory()
      }

      if (isDirectory) {
        await recursiveReadDir(absolutePath, filter, ignore, arr, rootDir)
        return
      }

      if (!filter.test(part.name)) {
        return
      }

      arr.push(absolutePath.replace(rootDir, ''))
    })
  )

  return arr.sort()
}

// eslint-disable-next-line max-params
export async function recursiveFindPages(
  dir: string,
  filter: RegExp,
  ignore?: RegExp,
  arr: string[] = [],
  rootDir: string = dir
): Promise<string[]> {
  let folders = await promises.readdir(dir)

  if (dir === rootDir) {
    folders = folders.filter(folder =>
      topLevelFoldersThatMayContainPages.includes(folder)
    )
  }

  await Promise.all(
    folders.map(async (part: string) => {
      const absolutePath = join(dir, part)
      if (ignore && ignore.test(part)) return

      const pathStat = await promises.stat(absolutePath)

      if (pathStat.isDirectory()) {
        await recursiveFindPages(absolutePath, filter, ignore, arr, rootDir)
        return
      }

      if (!filter.test(part)) {
        return
      }

      const relativeFromRoot = absolutePath.replace(rootDir, '')
      if (getIsPageFile(relativeFromRoot)) {
        arr.push(relativeFromRoot)
      }
    })
  )

  return arr.sort()
}
