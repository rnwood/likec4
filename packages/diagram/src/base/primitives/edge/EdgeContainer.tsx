import type { DiagramEdge } from '@likec4/core'
import clsx from 'clsx'
import { type PropsWithChildren } from 'react'
import type { EdgeProps } from '../../types'
import * as css from './edge.css'

type Data = Pick<
  DiagramEdge,
  | 'dir'
  | 'color'
>

type EdgeContainerProps = PropsWithChildren<EdgeProps<Data>>

export function EdgeContainer({
  data: {
    hovered: isHovered = false,
    active: isActive = false,
    dimmed: isDimmed = false,
    ...data
  },
  children,
}: EdgeContainerProps) {
  return (
    <g
      className={clsx(
        css.container,
        isDimmed && css.dimmed,
        // isControlPointDragging && edgesCss.controlDragging,
      )}
      data-likec4-color={data.color ?? 'gray'}
      data-edge-dir={data.dir}
      data-edge-active={isActive}
      data-edge-animated={isActive}
      data-edge-hovered={isHovered}>
      {children}
    </g>
  )
}
