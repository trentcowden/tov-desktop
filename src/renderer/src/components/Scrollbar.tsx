import { useEffect, useRef, useState } from 'react'

interface Props {
  children?: React.ReactNode
}

export default function CustomScrollbar({ children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)

  useEffect(() => {
    const updateScrollbar = (): void => {
      if (!contentRef.current || !containerRef.current) return
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current

      const padding = 16 // 16px padding top and bottom
      const availableHeight = clientHeight - padding * 2

      // Calculate thumb height based on viewport-to-content ratio
      const thumbHeightCalc = (clientHeight / scrollHeight) * availableHeight
      setThumbHeight(thumbHeightCalc)

      // Calculate thumb position relative to the container
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
      const thumbTopCalc = padding + scrollPercentage * (availableHeight - thumbHeightCalc)
      setThumbTop(thumbTopCalc)
    }

    const element = contentRef.current

    // Initial calculation
    updateScrollbar()

    element?.addEventListener('scroll', updateScrollbar)

    // Update on content changes (e.g., when verses load)
    const resizeObserver = new ResizeObserver(updateScrollbar)
    if (element) {
      resizeObserver.observe(element)
    }

    return () => {
      element?.removeEventListener('scroll', updateScrollbar)
      resizeObserver.disconnect()
    }
  }, [children])

  return (
    <div className="relative w-full h-full justify-center items-center" ref={containerRef}>
      <div
        className="w-full h-full overflow-x-visible overflow-y-scroll flex-col max-w-2xl scroll-smooth"
        ref={contentRef}
      >
        {children}
      </div>
      {thumbHeight > 0 && contentRef.current && thumbHeight < contentRef.current.clientHeight && (
        <div
          className="transition-normal absolute right-20 w-4 bg-p1/20 rounded-md duration-200 pointer-events-none"
          style={{
            height: `${thumbHeight}px`,
            top: `${thumbTop}px`
          }}
        />
      )}
    </div>
  )
}
