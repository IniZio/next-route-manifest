import chalk from 'chalk'
import {join} from 'path'
import {PAGES_DIR_ALIAS} from './constants'
import {warn} from './output/log'
import {convertPageFilePathToRoutePath} from './utils'

export type PagesMapping = {
  [page: string]: string;
}

export function createPagesMapping(
  pagePaths: string[],
  pageExtensions: string[]
): PagesMapping {
  const previousPages: PagesMapping = {}
  const pages: PagesMapping = pagePaths.reduce(
    (result: PagesMapping, pagePath): PagesMapping => {
      const page = `${convertPageFilePathToRoutePath(
        pagePath,
        pageExtensions
      ).replace(/\\/g, '/')}`.replace(/\/index$/, '')

      const pageKey = page === '' ? '/' : page

      if (pageKey in result) {
        warn(
          `Duplicate page detected. ${chalk.cyan(
            previousPages[pageKey]
          )} and ${chalk.cyan(pagePath)} both resolve to ${chalk.cyan(
            pageKey
          )}.`
        )
      } else {
        previousPages[pageKey] = pagePath
      }
      result[pageKey] = join(PAGES_DIR_ALIAS, pagePath).replace(/\\/g, '/')
      return result
    },
    {}
  )

  pages['/_app'] = pages['/_app'] || 'next/dist/pages/_app'
  pages['/_error'] = pages['/_error'] || 'next/dist/pages/_error'
  pages['/_document'] = pages['/_document'] || 'next/dist/pages/_document'

  return pages
}
