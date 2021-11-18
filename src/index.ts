import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'

import fs from 'fs'
import path from 'path'
import {NextConfigWithPageExtensionsOnly} from './routes'
import {saveRouteManifest} from './save-route-manifest'
import {defaultConfig} from './config'

class GenerateRouteManifest extends Command {
  static description = 'Generates route manifest for Nextjs'

  static flags = {
    input: flags.string({char: 'i', default: '.', description: 'Project path'}),
    output: flags.string({char: 'o', default: './generated', description: 'Output folder'}),
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
  }

  static args = []

  async run() {
    const {flags} = this.parse<{ input: string; output: string }, never>(GenerateRouteManifest)

    cli.action.start('Generating route manifest', '')

    const input = fs.existsSync(path.resolve(flags.input, 'src')) ? path.resolve(flags.input, 'src') : flags.input
    const output = path.resolve(process.cwd(), flags.output)

    let config: NextConfigWithPageExtensionsOnly = defaultConfig
    try {
      config = require(path.resolve(flags.input, 'next.config.js'))
    } catch {
      this.warn('next.config.js file not found. Using default value')
    }

    await saveRouteManifest(input, output, config)

    cli.action.stop('done!')
  }
}

export default GenerateRouteManifest
