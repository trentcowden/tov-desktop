import { useEffect, useRef, useState } from 'react'

interface Props {
  children?: React.ReactNode
}

const THUMB_HEIGHT = 100

export default function CustomScrollbar({ children }: Props): React.ReactElement {
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbTop, setThumbTop] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const thumbStartTop = useRef(0)

  useEffect(() => {
    const updateScrollbar = (): void => {
      if (!contentRef.current || !containerRef.current) return
      const { scrollHeight, clientHeight, scrollTop } = contentRef.current

      const padding = 16 // 16px padding top and bottom
      const availableHeight = clientHeight - padding * 2

      // Calculate thumb position relative to the container
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
      const thumbTopCalc = padding + scrollPercentage * (availableHeight - THUMB_HEIGHT)
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

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    setIsDragging(true)
    dragStartY.current = e.clientY
    thumbStartTop.current = thumbTop
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging || !contentRef.current || !containerRef.current) return

      const deltaY = e.clientY - dragStartY.current
      const { scrollHeight, clientHeight } = contentRef.current
      const padding = 16
      const availableHeight = clientHeight - padding * 2

      // Calculate new thumb position
      const newThumbTop = thumbStartTop.current + deltaY
      const clampedThumbTop = Math.max(
        padding,
        Math.min(newThumbTop, padding + availableHeight - THUMB_HEIGHT)
      )

      // Convert thumb position to scroll position
      const thumbPercentage = (clampedThumbTop - padding) / (availableHeight - THUMB_HEIGHT)
      const newScrollTop = thumbPercentage * (scrollHeight - clientHeight)

      contentRef.current.scrollTop = Math.max(
        0,
        Math.min(newScrollTop, scrollHeight - clientHeight)
      )
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div className="relative w-full h-full justify-center items-center" ref={containerRef}>
      <div
        className={`w-full h-full overflow-x-visible overflow-y-scroll flex-col max-w-2xl ${!isDragging ? 'scroll-smooth' : ''}`}
        ref={contentRef}
      >
        {children}
      </div>
      {contentRef.current && 24 < contentRef.current.clientHeight && (
        <div
          className={`h-24 absolute right-20 w-4 hover:bg-p1 active:bg-p2 rounded-md cursor-pointer bg-p1/30 hover:animate-smooth-pulse ${!isDragging ? 'duration-200' : ''}`}
          style={{
            height: `${THUMB_HEIGHT}px`,
            top: `${thumbTop}px`
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}
