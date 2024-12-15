import { filter, findLast, map, pipe } from 'remeda'
import { invariant, nonexhaustive } from '../../errors'
import { LikeC4Model } from '../../model'
import { ConnectionModel } from '../../model/connection/model/ConnectionModel'
import type { RelationshipModel } from '../../model/RelationModel'
import type { AnyAux } from '../../model/types'
import type {
  ComputedElementView,
  ElementPredicateExpression,
  ElementView,
  RelationPredicateExpression,
  ViewRule
} from '../../types'
import { isViewRuleAutoLayout, isViewRulePredicate, whereOperatorAsPredicate } from '../../types'
import * as Expr from '../../types/expression'
import { applyCustomElementProperties } from '../utils/applyCustomElementProperties'
import { applyCustomRelationProperties } from '../utils/applyCustomRelationProperties'
import { applyViewRuleStyles } from '../utils/applyViewRuleStyles'
import { buildElementNotations } from '../utils/buildElementNotations'
import { linkNodesWithEdges } from '../utils/link-nodes-with-edges'
import { topologicalSort } from '../utils/topological-sort'
import { calcViewLayoutHash } from '../utils/view-hash'
import { type Connection, type Elem, type PredicateCtx } from './_types'
import { cleanConnections } from './clean-connections'
import { emptyMemory, type Memory, MutableMemory, type Patch } from './Memory'
import { ExpandedElementPredicate } from './predicates/element-expand'
import { ElementKindOrTagPredicate } from './predicates/element-kind-tag'
import { ElementRefPredicate } from './predicates/element-ref'
import { DirectRelationExprPredicate } from './predicates/relation-direct'
import { IncomingExprPredicate } from './predicates/relation-in'
import { InOutRelationPredicate } from './predicates/relation-in-out'
import { OutgoingExprPredicate } from './predicates/relation-out'
import { WildcardPredicate } from './predicates/wildcard'
import { Stage } from './Stage'
import { buildNodes, NoFilter, NoWhere, toComputedEdges } from './utils'

function processElementPredicate(
  expr: ElementPredicateExpression,
  op: 'include' | 'exclude',
  ctx: Omit<PredicateCtx<ElementPredicateExpression>, 'expr'>
): Patch | undefined {
  switch (true) {
    case Expr.isCustomElement(expr): {
      if (op === 'include') {
        return processElementPredicate(expr.custom.expr, op, ctx)
      }
      return
    }
    case Expr.isElementWhere(expr): {
      const where = whereOperatorAsPredicate(expr.where.condition)
      const filterWhere = filter<Elem>(where)
      return processElementPredicate(expr.where.expr, op, { ...ctx, where, filterWhere })
    }
    case Expr.isExpandedElementExpr(expr): {
      return ExpandedElementPredicate[op]({ ...ctx, expr })
    }
    case Expr.isElementRef(expr): {
      return ElementRefPredicate[op]({ ...ctx, expr })
    }
    case Expr.isWildcard(expr):
      return WildcardPredicate[op]({ ...ctx, expr })
    case Expr.isElementKindExpr(expr):
    case Expr.isElementTagExpr(expr):
      return ElementKindOrTagPredicate[op]({ ...ctx, expr })
    default:
      nonexhaustive(expr)
  }
}
function processRelationtPredicate(
  expr: RelationPredicateExpression,
  op: 'include' | 'exclude',
  ctx: Omit<PredicateCtx<RelationPredicateExpression>, 'expr'>
): Patch | undefined {
  switch (true) {
    case Expr.isCustomRelationExpr(expr): {
      if (op === 'include') {
        return processRelationtPredicate(expr.customRelation.relation, op, ctx)
      }
      return
    }
    case Expr.isRelationWhere(expr): {
      const where = whereOperatorAsPredicate(expr.where.condition)
      const filterRelations = (relations: ReadonlySet<RelationshipModel>) => {
        return new Set(filter([...relations], where))
      }
      const filterWhere = (connections: ReadonlyArray<Connection>) => {
        return pipe(
          connections,
          map(c => new ConnectionModel(c.source, c.target, filterRelations(c.relations))),
          filter(c => c.nonEmpty())
        )
      }
      return processRelationtPredicate(expr.where.expr, op, {
        ...ctx,
        where,
        filterWhere
      })
    }
    case Expr.isInOut(expr): {
      return InOutRelationPredicate[op]({ ...ctx, expr })
    }
    case Expr.isRelation(expr): {
      return DirectRelationExprPredicate[op]({ ...ctx, expr })
    }
    case Expr.isOutgoing(expr): {
      return OutgoingExprPredicate[op]({ ...ctx, expr })
    }
    case Expr.isIncoming(expr): {
      return IncomingExprPredicate[op]({ ...ctx, expr })
    }
    default:
      nonexhaustive(expr)
  }
}

function processPredicates<M extends AnyAux>(
  model: LikeC4Model<M>,
  memory: Memory,
  scope: Elem | null,
  rules: ViewRule[]
) {
  let stage: Stage | null = null
  const ctx = {
    model,
    memory,
    scope,
    where: NoWhere,
    filterWhere: NoFilter
  }
  for (const rule of rules) {
    if (isViewRulePredicate(rule)) {
      const op = 'include' in rule ? 'include' : 'exclude'
      const exprs = rule.include ?? rule.exclude
      for (const expr of exprs) {
        stage = new Stage(stage, memory)
        let patch: Patch
        switch (true) {
          case Expr.isElementPredicateExpr(expr):
            patch = processElementPredicate(expr, op, {
              ...ctx,
              stage,
              memory
            }) ?? stage.patch()
            break
          case Expr.isRelationPredicateExpr(expr):
            patch = processRelationtPredicate(expr, op, {
              ...ctx,
              stage,
              memory
            }) ?? stage.patch()
            break
          default:
            nonexhaustive(expr)
        }
        memory = patch(memory)
      }
    }
  }
  return memory
}

export function computeElementView<M extends AnyAux>(
  likec4model: LikeC4Model<M>,
  {
    docUri: _docUri, // exclude docUri
    rules, // exclude rules
    ...view
  }: ElementView
): ComputedElementView<M['ViewId']> {
  const scope = view.viewOf ? likec4model.element(view.viewOf) : null
  let memory = cleanConnections(
    processPredicates<M>(
      likec4model,
      emptyMemory(),
      scope,
      rules
    )
  )
  if (memory.isEmpty() && scope) {
    invariant(memory instanceof MutableMemory)
    memory.finalElements.add(scope)
  }

  const nodesMap = buildNodes(memory)

  const computedEdges = toComputedEdges(memory.connections)

  linkNodesWithEdges(nodesMap, computedEdges)

  const sorted = topologicalSort({
    nodes: [...nodesMap.values()],
    edges: computedEdges
  })

  const nodes = applyCustomElementProperties(
    rules,
    applyViewRuleStyles(
      rules,
      sorted.nodes
    )
  )

  const autoLayoutRule = findLast(rules, isViewRuleAutoLayout)

  const elementNotations = buildElementNotations(nodes)

  return calcViewLayoutHash({
    ...view,
    autoLayout: {
      direction: autoLayoutRule?.direction ?? 'TB',
      ...(autoLayoutRule?.nodeSep && { nodeSep: autoLayoutRule.nodeSep }),
      ...(autoLayoutRule?.rankSep && { rankSep: autoLayoutRule.rankSep })
    },
    edges: applyCustomRelationProperties(rules, nodes, sorted.edges),
    nodes: map(nodes, n => {
      // omit notation
      delete n.notation
      if (n.icon === 'none') {
        delete n.icon
      }
      return n
    }),
    ...(elementNotations.length > 0 && {
      notation: {
        elements: elementNotations
      }
    })
  })
}
