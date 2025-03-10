import { createBrowserInspector } from '@statelyai/inspect'
import { useRef } from 'react'
import type { InspectionEvent, Observer } from 'xstate'

const useInspector: () => { inspect?: Observer<InspectionEvent> } =
  // @ts-ignore
  process.env.NODE_ENV === 'production'
    ? () => ({})
    : () => {
      const inspectorRef = useRef<ReturnType<typeof createBrowserInspector>>(null)
      if (!inspectorRef.current) {
        inspectorRef.current = createBrowserInspector({
          filter: (event) => {
            return event.type !== '@xstate.event' || !event.event.type.startsWith('xyflow.apply')
          },
        })
      }
      return {
        inspect: inspectorRef.current.inspect,
      }
    }

export { useInspector }
