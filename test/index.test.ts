import {expect, test} from '@oclif/test'

import cmd from '../src'

describe('next-route-manifest', () => {
  test
  .stdout()
  .do(() => cmd.run(['-i', 'example', '-o', 'example/generated']))
  .it('runs successfully', ctx => {
    expect(ctx.error).to.be.undefined
  })
})
