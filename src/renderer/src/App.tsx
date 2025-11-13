import { ArrowLeft, ArrowRight } from '@untitledui/icons'
import { useEffect, useState } from 'react'
import CustomScrollbar from './components/Scrollbar'

const bookNames = {
  '1CH': '1 Chronicles',
  '1CO': '1 Corinthians',
  '1JN': '1 John',
  '1KI': '1 Kings',
  '1PE': '1 Peter',
  '1SA': '1 Samuel',
  '1TH': '1 Thessalonians',
  '1TI': '1 Timothy',
  '2CH': '2 Chronicles',
  '2CO': '2 Corinthians',
  '2JN': '2 John',
  '2KI': '2 Kings',
  '2PE': '2 Peter',
  '2SA': '2 Samuel',
  '2TH': '2 Thessalonians',
  '2TI': '2 Timothy',
  '3JN': '3 John',
  ACT: 'Acts',
  AMO: 'Amos',
  COL: 'Colossians',
  DAN: 'Daniel',
  DEU: 'Deuteronomy',
  ECC: 'Ecclesiastes',
  EPH: 'Ephesians',
  EST: 'Esther',
  EXO: 'Exodus',
  EZK: 'Ezekiel',
  EZR: 'Ezra',
  GAL: 'Galatians',
  GEN: 'Genesis',
  HAB: 'Habakkuk',
  HAG: 'Haggai',
  HEB: 'Hebrews',
  HOS: 'Hosea',
  ISA: 'Isaiah',
  JAS: 'James',
  JDG: 'Judges',
  JER: 'Jeremiah',
  JHN: 'John',
  JOB: 'Job',
  JOL: 'Joel',
  JON: 'Jonah',
  JOS: 'Joshua',
  JUD: 'Jude',
  LAM: 'Lamentations',
  LEV: 'Leviticus',
  LUK: 'Luke',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MIC: 'Micah',
  MRK: 'Mark',
  NAM: 'Nahum',
  NEH: 'Nehemiah',
  NUM: 'Numbers',
  OBA: 'Obadiah',
  PHM: 'Philemon',
  PHP: 'Philippians',
  PRO: 'Proverbs',
  PSA: 'Psalms',
  REV: 'Revelation',
  ROM: 'Romans',
  RUT: 'Ruth',
  SNG: 'Song',
  TIT: 'Titus',
  ZEC: 'Zechariah',
  ZEP: 'Zephaniah'
}

declare global {
  interface Window {
    bibleApi: {
      getChapter: (book: string, chapter: number) => Promise<{ verse: number; text: string }[]>
      getNextChapter: (
        book: string,
        chapter: number
      ) => Promise<{ book: string; chapter: number } | null>
      getPreviousChapter: (
        book: string,
        chapter: number
      ) => Promise<{ book: string; chapter: number } | null>
      saveCurrentChapter: (book: string, chapter: number) => Promise<void>
      loadCurrentChapter: () => Promise<{ book: string; chapter: number }>
      onNavigateChapter: (callback: (direction: 'next' | 'previous') => void) => void
    }
  }
}

function App(): React.JSX.Element {
  const [activeChapter, setActiveChapter] = useState<{ book: string; chapter: number }>({
    book: 'GEN',
    chapter: 1
  })
  const [verses, setVerses] = useState<{ verse: number; text: string }[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [direction, setDirection] = useState<'next' | 'previous' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load saved chapter on mount
  useEffect(() => {
    window.bibleApi.loadCurrentChapter().then((savedChapter) => {
      setActiveChapter(savedChapter)
      setIsLoaded(true)
    })
  }, [])

  // Fetch verses when chapter changes
  useEffect(() => {
    if (!isLoaded) return
    window.bibleApi.getChapter(activeChapter.book, activeChapter.chapter).then(setVerses)
    // Save current chapter whenever it changes
    window.bibleApi.saveCurrentChapter(activeChapter.book, activeChapter.chapter)
  }, [activeChapter, isLoaded])

  function navigatePrevious(): void {
    setActiveChapter((current) => {
      window.bibleApi.getPreviousChapter(current.book, current.chapter).then((prev) => {
        if (prev) {
          setActiveChapter(prev)
          setTimeout(() => setIsTransitioning(false), 50)
        } else {
          setIsTransitioning(false)
        }
      })
      return current
    })
  }

  function navigateNext(): void {
    setActiveChapter((current) => {
      window.bibleApi.getNextChapter(current.book, current.chapter).then((next) => {
        if (next) {
          setActiveChapter(next)
          setTimeout(() => setIsTransitioning(false), 50)
        } else {
          setIsTransitioning(false)
        }
      })
      return current
    })
  }

  // Set up navigation listener once on mount
  useEffect(() => {
    window.bibleApi.onNavigateChapter((navDirection) => {
      setIsTransitioning(true)
      setDirection(navDirection)

      // Wait for fade out animation
      setTimeout(() => {
        if (navDirection === 'next') {
          navigateNext()
        } else if (navDirection === 'previous') {
          navigatePrevious()
        }
      }, 125)
    })
  }, [])

  const renderVerseText = (text: string): React.JSX.Element[] => {
    return text.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <span className="block h-1" />}
      </span>
    ))
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-b1">
      <div className="chapter-iterate-outer left-4">
        <div onClick={navigatePrevious} className="chapter-iterate-inner">
          <ArrowLeft className="size-4" />
        </div>
      </div>
      <div className="chapter-iterate-outer right-4">
        <div onClick={navigateNext} className="chapter-iterate-inner">
          <ArrowRight className="size-4" />
        </div>
      </div>
      {/* <div className="w-full h-full overflow-y-auto items-center justify-center"> */}
      <CustomScrollbar>
        <div
          className={`overflow-visible w-full flex-col h-full  ${
            isTransitioning
              ? direction === 'next'
                ? `opacity-0 -translate-x-24 scale-x-95 -rotate-3 transition-all duration-125`
                : `opacity-0 translate-x-24 scale-x-95 rotate-3 transition-all duration-125`
              : `opacity-100 translate-x-0 rotate-0 transition-opacity duration-75 ease-in`
          }`}
        >
          <h1 className="mt-12 mb-4 text-f1 text-2xl font-bold">
            {bookNames[activeChapter.book]} {activeChapter.chapter}
          </h1>
          <p className="text-f1 font-serif text-xl leading-relaxed">
            {verses.map((v) => (
              <span className="relative" key={v.verse}>
                <span className="text-xs font-sans text-f2">{v.verse}</span>{' '}
                {renderVerseText(v.text)}
              </span>
            ))}
            <div className="h-8" />
          </p>
        </div>
      </CustomScrollbar>
      {/* </div> */}
    </div>
  )
}

export default App
