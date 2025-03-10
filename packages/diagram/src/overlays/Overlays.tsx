import { Box, Button, Code, Group, Notification } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { animate } from 'framer-motion/dom'
import { memo, useEffect, useMemo } from 'react'
import { type FallbackProps, ErrorBoundary } from 'react-error-boundary'
import { DiagramFeatures } from '../context'
import { useXYStore } from '../hooks'
import { useDiagramActor, useDiagramActorState } from '../hooks/useDiagramActor'
import { ElementDetailsCard } from './element-details/ElementDetailsCard'
import { Overlay } from './overlay/Overlay'
import { RelationshipDetails } from './relationship-details/RelationshipDetails'
import { RelationshipsBrowser } from './relationships-browser/RelationshipsBrowser'
// import { EdgeDetailsXYFlow } from './edge-details/EdgeDetailsXYFlow'
// import { ElementDetailsCard } from './element-details/ElementDetailsCard'
// import { OverlayContext, useOverlayDialog } from './OverlayContext'
// import * as css from './Overlays.css'
// import { RelationshipsOverlay } from './relationships-of/RelationshipsOverlay'

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorString = error instanceof Error ? error.message : 'Unknown error'
  return (
    <Box pos={'fixed'} top={0} left={0} w={'100%'} p={0} style={{ zIndex: 1000 }}>
      <Notification
        icon={<IconX style={{ width: 16, height: 16 }} />}
        styles={{
          icon: {
            alignSelf: 'flex-start',
          },
        }}
        color={'red'}
        title={'Oops, something went wrong'}
        p={'xl'}
        withCloseButton={false}>
        <Code block>{errorString}</Code>
        <Group gap={'xs'} mt="xl">
          <Button color="gray" size="xs" variant="light" onClick={() => resetErrorBoundary()}>Reset</Button>
        </Group>
      </Notification>
    </Box>
  )
}

export const Overlays = memo(() => {
  const xyflowDomNode = useXYStore(s => s.domNode)
  const xyflowRendererDom = useMemo(() => xyflowDomNode?.querySelector('.react-flow__renderer') ?? null, [
    xyflowDomNode,
  ])
  const { send } = useDiagramActor()
  const {
    relationshipsBrowserActor,
    relationshipDetailsActor,
    activeElementDetailsOf,
  } = useDiagramActorState(s => ({
    relationshipsBrowserActor: s.children.relationshipsBrowser,
    relationshipDetailsActor: s.children.relationshipDetails,
    activeElementDetailsOf: s.context.activeElementDetails?.fqn ?? null,
  }))

  const isMotionReduced = useReducedMotion() ?? false

  const isActiveOverlay = !!activeElementDetailsOf

  useEffect(() => {
    if (!xyflowRendererDom || isMotionReduced) return
    animate(xyflowRendererDom, {
      opacity: isActiveOverlay ? 0.7 : 1,
      filter: isActiveOverlay ? 'grayscale(1)' : 'grayscale(0)',
      transform: isActiveOverlay ? `perspective(400px) translateZ(-12px) translateY(3px)` : `translateY(0)`,
    }, {
      duration: isActiveOverlay ? 0.35 : 0.17,
    })
  }, [isActiveOverlay, xyflowRendererDom])

  // )
  // const diagramStore = useDiagramStoreApi()
  // const {
  //   activeOverlay,
  //   viewId,
  // } = useDiagramState(s => ({
  //   activeOverlay: s.activeOverlay,
  //   viewId: s.view.id,
  // }))

  // const onCloseCbRef = useRef<(() => void)>(undefined)

  // const ctxValue = useMemo(() => ({
  //   openOverlay: ((overlay) => {
  //     diagramStore.getState().openOverlay(overlay)
  //   }) as DiagramState['openOverlay'],
  //   close: (cb?: () => void) => {
  //     onCloseCbRef.current = cb
  //     diagramStore.getState().closeOverlay()
  //   },
  // }), [diagramStore])

  // const onExitComplete = () => {
  //   onCloseCbRef.current?.()
  //   onCloseCbRef.current = undefined
  // }

  // const isActive = !!activeOverlay
  // useHotkeys(
  //   isActive
  //     ? [
  //       ['Escape', (e) => {
  //         e.stopPropagation()
  //         ctxValue.close()
  //       }, { preventDefault: true }],
  //     ]
  //     : [],
  // )

  return (
    <DiagramFeatures.Overlays>
      <ErrorBoundary FallbackComponent={Fallback} onReset={() => send({ type: 'close.overlay' })}>
        <AnimatePresence>
          {relationshipsBrowserActor && (
            <Overlay
              key={'relationships-browser'}
              onClose={() => {
                relationshipsBrowserActor.send({ type: 'close' })
              }}>
              <RelationshipsBrowser actorRef={relationshipsBrowserActor} />
            </Overlay>
          )}
          {relationshipDetailsActor && (
            <Overlay
              key={'relationship-details'}
              onClose={() => {
                relationshipDetailsActor.send({ type: 'close' })
              }}>
              <RelationshipDetails actorRef={relationshipDetailsActor} />
            </Overlay>
          )}
          {activeElementDetailsOf && <ElementDetailsCard fqn={activeElementDetailsOf} />}
        </AnimatePresence>
      </ErrorBoundary>
    </DiagramFeatures.Overlays>
    // <OverlayContext.Provider value={ctxValue}>
    //   <ErrorBoundary FallbackComponent={Fallback} onReset={() => ctxValue.close()}>
    //     <AnimatePresence initial={false} key={viewId} onExitComplete={onExitComplete}>
    //       {activeOverlay?.elementDetails && (
    //         <ElementDetailsCard key={'details card'} fqn={activeOverlay.elementDetails} />
    //       )}
    //     </AnimatePresence>
    //     <AnimatePresence initial={false} onExitComplete={onExitComplete}>
    //       {activeOverlay && isNullish(activeOverlay.elementDetails) && (
    //         <RemoveScroll forwardProps>
    //           <Box
    //             component={m.div}
    //             className={css.container}
    //             data-likec4-color="gray"
    //             initial={{
    //               '--backdrop-blur': '0px',
    //               '--backdrop-opacity': '0%',
    //               opacity: 0,
    //               translateY: -15,
    //             }}
    //             animate={{
    //               '--backdrop-blur': '10px',
    //               '--backdrop-opacity': '70%',
    //               opacity: 1,
    //               translateY: 0,
    //             }}
    //             exit={{
    //               '--backdrop-blur': '1px',
    //               '--backdrop-opacity': '0%',
    //               translateY: -5,
    //               opacity: 0,
    //               transition: {
    //                 duration: .2,
    //               },
    //             }}
    //           >
    //             <FocusTrap>
    //               {activeOverlay.relationshipsOf && <RelationshipsOverlay subjectId={activeOverlay.relationshipsOf} />}
    //               {activeOverlay.edgeDetails && (
    //                 <XYFlowProvider
    //                   defaultNodes={[]}
    //                   defaultEdges={[]}>
    //                   <EdgeDetailsXYFlow edgeId={activeOverlay.edgeDetails} />
    //                 </XYFlowProvider>
    //               )}
    //               <Box pos={'absolute'} top={'1rem'} right={'1rem'}>
    //                 <ActionIcon
    //                   variant="default"
    //                   // color="gray"
    //                   size={'lg'}
    //                   // data-autofocus
    //                   // autoFocus
    //                   onClick={(e) => {
    //                     e.stopPropagation()
    //                     ctxValue.close()
    //                   }}>
    //                   <IconX />
    //                 </ActionIcon>
    //               </Box>
    //             </FocusTrap>
    //           </Box>
    //         </RemoveScroll>
    //       )}
    //     </AnimatePresence>
    //   </ErrorBoundary>
    // </OverlayContext.Provider>
  )
})

// const OverlayDialogCloseButton = () => {
//   const { close } = useOverlayDialog()
//   return (
//     <Box pos={'absolute'} top={'1rem'} right={'1rem'}>
//       <ActionIcon
//         variant="default"
//         // color="gray"
//         size={'lg'}
//         autoFocus
//         onClick={(e) => {
//           e.stopPropagation()
//           close()
//         }}>
//         <IconX />
//       </ActionIcon>
//     </Box>
//   )
// }

// type OverlayDialogProps = Pick<HTMLAttributes<HTMLDialogElement>, 'style' | 'className'> & {
//   onClose?: (() => void) | undefined
//   children: (renderProps: {
//     opened: boolean
//     close: () => void
//   }) => ReactNode
// }

// const OverlayDialog = forwardRef<HTMLDialogElement, OverlayDialogProps>(({
//   className,
//   children,
//   onClose,
//   ...props
// }, forwardedRef) => {
//   const onCloseRef = useSyncedRef(onClose)
//   const api = useDiagramStoreApi()
//   const [opened, setOpened] = useState(false)
//   const dialogRef = useRef<HTMLDialogElement>(null)
//   const ref = useMergedRef(dialogRef, forwardedRef)

//   // useDebouncedEffect(
//   //   () => {
//   //     dialogRef.current?.showModal()
//   //   },
//   //   [],
//   //   30
//   // )

//   useDebouncedEffect(
//     () => {
//       setOpened(true)
//     },
//     [],
//     80
//   )

//   const { start: triggerOnClose } = useTimeout(() => {
//     onCloseRef.current?.()
//   }, 300)

//   const ctxValue = useMemo(() => ({
//     openOverlay: api.getState().openOverlay,
//     close: () => {
//       dialogRef.current?.close()
//     }
//   }), [api])

//   return (
//     <OverlayContext.Provider value={ctxValue}>
//       <div
//         aria-modal="true"
//         ref={ref}
//         className={clsx(css.dialog, className)}
//         onClick={e => {
//           if ((e.target as any)?.nodeName?.toUpperCase() === 'DIALOG') {
//             e.stopPropagation()
//             dialogRef.current?.close()
//           }
//         }}
//         onClose={e => {
//           e.stopPropagation()
//           triggerOnClose()
//         }}
//         {...props}
//       >
//         {children({
//           opened,
//           ...ctxValue
//         })}
//       </div>
//     </OverlayContext.Provider>
//   )
// })

// const OverlayDialogCloseButton = () => {
//   const { close } = useOverlayDialog()
//   return (
//     <Box pos={'absolute'} top={'1rem'} right={'1rem'}>
//       <ActionIcon
//         variant="default"
//         // color="gray"
//         size={'lg'}
//         autoFocus
//         onClick={(e) => {
//           e.stopPropagation()
//           close()
//         }}>
//         <IconX />
//       </ActionIcon>
//     </Box>
//   )
// }
// const OverlayDialog = ({ children }: PropsWithChildren) => {
//   const overlay = useOverlayDialog()
//   const ref = useRef<HTMLDialogElement>(null)
//   useEffect(() => {
//     ref.current?.showModal()
//   }, [])
//   return (
//     <m.dialog
//       ref={ref}
//       exit={{
//         opacity: 0,
//         transition: {
//           duration: .15,
//         },
//       }}
//       onClick={e => {
//         if ((e.target as any)?.nodeName?.toUpperCase() === 'DIALOG') {
//           e.stopPropagation()
//           ref.current?.close()
//         }
//       }}
//       onClose={e => {
//         e.stopPropagation()
//         overlay.close()
//       }}
//     >
//       {children}
//     </m.dialog>
//   )
// }
