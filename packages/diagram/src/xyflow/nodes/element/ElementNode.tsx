import { DiagramNode, type ThemeColor } from '@likec4/core'
import { Box, Text as MantineText } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { Handle, type NodeProps, Position } from '@xyflow/react'
import clsx from 'clsx'
import { deepEqual as eq } from 'fast-equals'
import { m } from 'framer-motion'
import { memo, useState } from 'react'
import { isTruthy } from 'remeda'
import { useDiagramState } from '../../../hooks/useDiagramState'
import { toDomPrecision } from '../../utils'
import { ElementIcon } from '../shared/ElementIcon'
import { ElementToolbar } from '../shared/Toolbar'
import { NodeVariants, useFramerAnimateVariants, type VariantKeys } from '../AnimateVariants'
import * as css from './element.css'
import * as nodeCss from '../Node.css'
import { ElementShapeSvg, SelectedIndicator } from './ElementShapeSvg'
import type { DiagramFlowTypes } from '../../types'
import { ActionButtonBar } from '../../../controls/action-button-bar/ActionButtonBar'
import { BrowseRelationshipsButton, NavigateToButton, OpenDetailsButton } from '../../../controls/action-buttons/ActionButtons'

const Text = MantineText.withProps({
  component: 'div'
})

type ElementNodeProps = NodeProps<DiagramFlowTypes.ElementNode>
const isEqualProps = (prev: ElementNodeProps, next: ElementNodeProps) => (
  prev.id === next.id
  && eq(prev.selected ?? false, next.selected ?? false)
  && eq(prev.dragging ?? false, next.dragging ?? false)
  && eq(prev.width ?? 0, next.width ?? 0)
  && eq(prev.height ?? 0, next.height ?? 0)
  && eq(prev.data, next.data)
)

export const ElementNodeMemo = memo<ElementNodeProps>(function ElementNode({
  id,
  data: {
    element
  },
  dragging,
  selected = false,
  width,
  height
}) {
  const modelRef = DiagramNode.modelRef(element)
  // const deploymentRef = DiagramNode.deploymentRef(element)
  const {
    viewId,
    isEditable,
    isDimmed,
    isNavigable,
    isInteractive,
    enableElementDetails,
    enableRelationshipBrowser,
    isInActiveOverlay,
    renderIcon
  } = useDiagramState(s => ({
    viewId: s.view.id,
    isEditable: s.readonly !== true,
    isDimmed: s.dimmed.has(id),
    isInteractive: s.nodesDraggable || s.nodesSelectable || s.enableElementDetails || s.enableRelationshipBrowser
      || (!!s.onNavigateTo && !!element.navigateTo),
    isNavigable: (!!s.onNavigateTo && !!element.navigateTo),
    enableElementDetails: s.enableElementDetails,
    enableRelationshipBrowser: s.enableRelationshipBrowser,
    triggerOnNavigateTo: s.triggerOnNavigateTo,
    openOverlay: s.openOverlay,
    isInActiveOverlay: (s.activeOverlay?.elementDetails ?? s.activeOverlay?.relationshipsOf) === id,
    renderIcon: s.renderIcon
  }))
  // For development purposes, show the toolbar when the element is selected
  const _isToolbarVisible = isEditable && import.meta.env.DEV && selected
  const [isToolbarVisible] = useDebouncedValue(_isToolbarVisible, _isToolbarVisible ? 500 : 300)

  const w = toDomPrecision(width ?? element.width)
  const h = toDomPrecision(height ?? element.height)

  let animateVariant: VariantKeys | string[]
  switch (true) {
    case isInActiveOverlay:
      animateVariant = 'idle'
      break
    case dragging && selected:
      animateVariant = 'selected'
      break
    case dragging:
      animateVariant = 'idle'
      break
    case isDimmed:
      animateVariant = 'dimmed'
      break
    case selected:
      animateVariant = 'selected'
      break
    default:
      animateVariant = 'idle'
  }

  const [animateVariants, animateHandlers] = useFramerAnimateVariants()
  if (!dragging && !isInActiveOverlay) {
    animateVariant = animateVariants ?? animateVariant
  }

  const elementIcon = ElementIcon({
    element,
    viewId,
    className: css.elementIcon,
    renderIcon
  })

  const [previewColor, setPreviewColor] = useState<ThemeColor | null>(null)

  return (
    <>
      {isToolbarVisible && (
        <ElementToolbar
          element={element}
          isVisible={isToolbarVisible}
          onColorPreview={setPreviewColor}
        />
      )}
      <Box
        component={m.div}
        className={clsx([
          css.container,
          animateVariant !== 'idle' && css.containerAnimated,
          'likec4-element-node'
        ])}
        key={`${viewId}:element:${id}`}
        layoutId={`${viewId}:element:${id}`}
        data-likec4-color={previewColor ?? element.color}
        data-likec4-shape={element.shape}
        data-animate-target=""

        initial={false}
        variants={NodeVariants(w, h)}
        animate={animateVariant}
        whileHover={selected ? "selected" : "hovered"}
        {...isInteractive && animateHandlers}

        tabIndex={-1}
      >
        <svg
          className={clsx(css.shapeSvg)}
          viewBox={`0 0 ${w} ${h}`}>
          <g className={css.indicator}>
            <SelectedIndicator shape={element.shape} w={w} h={h} />
          </g>
          <ElementShapeSvg shape={element.shape} w={w} h={h} />
        </svg>
        <Box
          className={clsx(
            css.elementDataContainer,
            isTruthy(elementIcon) && css.hasIcon,
            'likec4-element'
          )}
        >
          {elementIcon}
          <Box className={clsx(css.elementTextData, 'likec4-element-main-props')}>
            <Text
              component={m.div}
              key={`${viewId}:element:title:${id}`}
              layoutId={`${viewId}:element:title:${id}`}
              className={clsx(css.title, 'likec4-element-title')}>
              {element.title}
            </Text>

            {element.technology && (
              <Text className={clsx(css.technology, 'likec4-element-technology')}>
                {element.technology}
              </Text>
            )}
            {element.description && (
              <Text className={clsx(css.description, 'likec4-element-description')} lineClamp={5}>
                {element.description}
              </Text>
            )}
          </Box>
        </Box>
        {/* {isHovercards && element.links && <ElementLink element={element} />} */}
        <Box className={clsx(nodeCss.bottomBtnContainer)}>
          <ActionButtonBar shiftY='bottom' {...isInteractive && animateHandlers} >
            {isNavigable && !!modelRef && (<NavigateToButton fqn={modelRef} />)}
            {enableRelationshipBrowser && !!modelRef && (<BrowseRelationshipsButton fqn={modelRef} />)}
          </ActionButtonBar>
        </Box>
        {enableElementDetails && !!modelRef && (
          <Box className={clsx(nodeCss.topRightBtnContainer)}>
            <ActionButtonBar shiftX='right' {...isInteractive && animateHandlers} >
              <OpenDetailsButton fqn={element.id} />
            </ActionButtonBar>
          </Box>
        )}
      </Box>
      <Handle type="target" position={Position.Top} className={css.handleCenter} />
      <Handle type="source" position={Position.Top} className={css.handleCenter} />
    </>
  )
}, isEqualProps)
