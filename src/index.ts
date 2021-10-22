import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'

import * as fs from 'fs'
import * as path from 'path'
import * as ncp from 'ncp'
import {loadConfigProduction} from '@blitzjs/next/dist/server/config-shared.js'
import {saveRouteManifest} from '@blitzjs/next/dist/build/routes.js'

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

    process.env.BLITZ_APP_DIR = input;

    const config = loadConfigProduction(input)
    await saveRouteManifest(input, config)

    await new Promise<void>((resolve, reject) => {
      ncp(
        path.resolve(process.cwd(), 'node_modules/.blitz'),
        path.resolve(process.cwd(), flags.output),
        error => error ? reject(error) : resolve()
      )
    })

    cli.action.stop('done!')
  }
}

export default GenerateRouteManifest
