import { logger } from '@likec4/log'
import { execa } from 'execa'
import { cpus } from 'node:os'
import pLimit from 'p-limit'
import type { GraphvizPort } from '../GraphvizLayoter'
import type { DotSource } from '../types'

const limit = pLimit(cpus().length || 1)

export class GraphvizBinaryAdapter implements GraphvizPort {
  constructor(
    // Path to the binary, e.g. 'dot' or '/usr/bin/dot'
    public path: string = 'dot',
  ) {
  }

  async unflatten(dot: DotSource): Promise<DotSource> {
    return await limit(async () => {
      const log = logger.withTag('graphviz-binary')
      const unflatten = await execa('unflatten', ['-l 1', '-c 3'], {
        reject: false,
        timeout: 10_000,
        input: dot,
        stdin: 'pipe',
        encoding: 'utf8',
      })
      if (unflatten instanceof Error) {
        if (unflatten.stdout) {
          log.warn(
            `Command: '${unflatten.command}' failed: ${unflatten.stderr}\n\nbut returned\n${unflatten.stdout}`,
          )
        } else {
          log.error(
            `Command: '${unflatten.command}' failed: ${unflatten.stderr}\n\nnothing returned, ignoring...`,
          )
        }
      }

      if (unflatten.stdout) {
        dot = unflatten.stdout.replaceAll(/\t\[/g, ' [').replaceAll(/\t/g, '    ') as DotSource
      }
      return dot
    })
  }

  async layoutJson(dot: DotSource): Promise<string> {
    return await limit(async () => {
      const log = logger.withTag('graphviz-binary')
      const dotcmd = await execa(this.path, ['-Tjson', '-y'], {
        reject: false,
        timeout: 10_000,
        input: dot,
        stdin: 'pipe',
        encoding: 'utf8',
      })
      if (dotcmd instanceof Error) {
        if (!dotcmd.stdout) {
          log.error(
            `Command: '${dotcmd.command}' nothing returned and failed: "${dotcmd.stderr}"`,
          )
          log.warn(`FAILED DOT:\n${dot}`)
          throw dotcmd
        }
        log.warn(
          `Command: '${dotcmd.command}' returned result but also failed "${dotcmd.stderr}"`,
        )
      }
      return dotcmd.stdout
    })
  }

  async acyclic(_dot: DotSource): Promise<DotSource> {
    return Promise.reject(new Error('Method not implemented.'))
  }

  async svg(dot: DotSource): Promise<string> {
    return await limit(async () => {
      const log = logger.withTag('graphviz-binary')
      const result = await execa(this.path, ['-Tsvg', '-y'], {
        reject: false,
        timeout: 10_000,
        input: dot,
        stdin: 'pipe',
        encoding: 'utf8',
      })

      if (result instanceof Error) {
        log.warn(`DOT:\n${dot}`)
        if (!result.stdout) {
          log.error(
            `Command: '${result.command}' nothing returned and failed: ${result.stderr}`,
          )
          throw result
        }
        log.warn(
          `Command: '${result.command}' returned result but also failed ${result.stderr}`,
        )
      }
      return result.stdout
    })
  }
}
