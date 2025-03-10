import { debounce, funnel } from 'remeda'
import { logError, logger } from './logger'
import type { LikeC4Services } from './module'

import { nonexhaustive } from '@likec4/core'
import { Disposable, interruptAndCheck, URI, UriUtils } from 'langium'
import { isLikeC4LangiumDocument } from './ast'
import { Scheme } from './likec4lib'
import {
  buildDocuments,
  changeView,
  computeView,
  fetchComputedModel,
  fetchModel,
  layoutView,
  locate,
  onDidChangeModel,
} from './protocol'
import { ADisposable } from './utils'

export class Rpc extends ADisposable {
  constructor(private services: LikeC4Services) {
    super()
  }

  init() {
    const modelBuilder = this.services.likec4.ModelBuilder
    const modelLocator = this.services.likec4.ModelLocator
    const modelEditor = this.services.likec4.ModelChanges
    const views = this.services.likec4.Views
    const connection = this.services.shared.lsp.Connection
    if (!connection) {
      logger.info(`[ServerRpc] no connection, not initializing`)
      return
    }
    logger.info(`[ServerRpc] init`)
    const LangiumDocuments = this.services.shared.workspace.LangiumDocuments
    const DocumentBuilder = this.services.shared.workspace.DocumentBuilder

    const notifyModelParsed = funnel(
      () => {
        connection.sendNotification(onDidChangeModel, '').catch(e => {
          logger.warn(`[ServerRpc] error sending onDidChangeModel: ${e}`)
          return Promise.resolve()
        })
      },
      {
        minQuietPeriodMs: 250,
        maxBurstDurationMs: 1000,
        minGapMs: 200,
      },
    )

    let isFirstBuild = true

    this.onDispose(
      modelBuilder.onModelParsed(() => notifyModelParsed.call()),
      connection.onRequest(fetchComputedModel, async ({ cleanCaches }, cancelToken) => {
        if (cleanCaches) {
          this.services.WorkspaceCache.clear()
          this.services.DocumentCache.clear()
        }
        const model = await modelBuilder.buildComputedModel(cancelToken)
        return { model }
      }),
      connection.onRequest(fetchModel, async cancelToken => {
        const model = await modelBuilder.buildModel(cancelToken)
        return { model }
      }),
      connection.onRequest(computeView, async ({ viewId }, cancelToken) => {
        const view = await modelBuilder.computeView(viewId, cancelToken)
        return { view }
      }),
      connection.onRequest(layoutView, async ({ viewId }, cancelToken) => {
        const result = await views.layoutView(viewId, cancelToken)
        return { result }
      }),
      connection.onRequest(buildDocuments, async ({ docs }, cancelToken) => {
        const changed = docs.map(d => URI.parse(d))
        const notChanged = (uri: URI) => changed.every(c => !UriUtils.equals(c, uri))
        const deleted = LangiumDocuments.all
          .filter(d => isLikeC4LangiumDocument(d) && notChanged(d.uri) && d.uri.scheme !== Scheme)
          .map(d => d.uri)
          .toArray()
        logger.debug(
          `[ServerRpc] received request to build:
  changed (total ${changed.length}):${docs.map(d => '\n    - ' + d).join('')}
  deleted (total ${deleted.length}):${deleted.map(d => '\n    - ' + d.toString()).join('\n')}`,
        )

        if (!isFirstBuild && (changed.length + deleted.length) > 0) {
          await Promise.allSettled(
            [...changed, ...deleted].map(async d => {
              const uri = d.toString()
              logger.debug(`clear diagnostics for ${uri}`)
              try {
                await connection.sendDiagnostics({
                  uri,
                  diagnostics: [],
                })
              } catch (e) {
                // Ignore
                logger.warn(`error clearing diagnostics for ${uri}: ${e}`)
              }
            }),
          )
        }
        isFirstBuild = false
        await interruptAndCheck(cancelToken)
        await DocumentBuilder.update(changed, deleted, cancelToken)
      }),
      connection.onRequest(locate, params => {
        switch (true) {
          case 'element' in params:
            return modelLocator.locateElement(params.element, params.property ?? 'name')
          case 'relation' in params:
            return modelLocator.locateRelation(params.relation)
          case 'view' in params:
            return modelLocator.locateView(params.view)
          case 'deployment' in params:
            return modelLocator.locateDeploymentElement(params.deployment, params.property ?? 'name')
          default:
            nonexhaustive(params)
        }
      }),
      connection.onRequest(changeView, async (request, _cancelToken) => {
        return await modelEditor.applyChange(request)
      }),
      Disposable.create(() => {
        notifyModelParsed.cancel()
      }),
    )
  }
}
