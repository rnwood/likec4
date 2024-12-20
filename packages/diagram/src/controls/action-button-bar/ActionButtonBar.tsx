import { Box, type ActionIconProps } from "@mantine/core"
import { m, type HTMLMotionProps, type Variants } from "framer-motion"
import type { PropsWithoutRef, ReactNode } from "react"
import * as css from './ActionButtonBar.css'
import clsx from "clsx";

const TRANSLATE_DIFF = 4;

type ShiftX = 'left' | 'spread' | 'right'
type ShiftY = 'top' | 'spread' | 'bottom'
type ShiftMode = number | 'spread'

type ActionButtonBarProps = PropsWithoutRef<
  ActionIconProps & HTMLMotionProps<'div'> & {
    shiftX?: ShiftX
    shiftY?: ShiftY
    children: ReactNode | ReactNode[]
  }
>

const elementVariants = (index: number, count: number, shiftX: ShiftMode, shiftY: ShiftMode) => {

  const translation = {
    x: shiftX === 'spread' ? 1 - count + index*2 : shiftX,
    y: shiftY === 'spread' ? 1 - count + index*2 : shiftY,
  }

  const variants = {
    idle: {
      scale: 1,
      opacity: 0.5,
      translateX: 0,
      translateY: 0
    },
    hovered: {
      scale: 1.32,
      opacity: 1,
      translateX: translation.x*TRANSLATE_DIFF,
      translateY: translation.y*TRANSLATE_DIFF
    },
    selected: {}
  } satisfies Variants
  variants['selected'] = variants['hovered']
  return variants
}

export const ActionButtonBar = ({
  shiftX = 'spread',
  shiftY = 'spread',
  children,
  ...props
}: ActionButtonBarProps) => {

  const childrenArray = Array.isArray(children) ? children : [children]

  // determine offsets for shifting
  let shiftDiffX: ShiftMode = 'spread'
  if (shiftX == 'left')
    shiftDiffX = -1
  else if (shiftX == 'right')
    shiftDiffX = 1

  let shiftDiffY: ShiftMode = 'spread'
  if (shiftY == 'top')
    shiftDiffY = -1
  else if (shiftY == 'bottom')
    shiftDiffY = 1

  return (
    <Box className={clsx(css.container)}>
      {childrenArray.filter(child => !!child).map((child, i) => (
        <m.div
          key={i}
          variants={elementVariants(i, childrenArray.length, shiftDiffX, shiftDiffY)}
          {...props}
          >
          {child}
        </m.div>
      ))}
    </Box>
  )
}
