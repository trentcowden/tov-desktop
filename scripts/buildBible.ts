import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import chaptersData from '../data/bsb_chapters.json'

const chapters = chaptersData as Array<{
  translationId: string
  bookName: string
  chapterId: string
  reference: string
  verses: Array<{
    verseId: string
    text: string
  }>
}>

const outputFile = path.join(__dirname, '../data/bible.sqlite')

// Remove existing DB if it exists
try {
  fs.unlinkSync(outputFile)
} catch {
  // File doesn't exist, which is fine
}

const db = new Database(outputFile)

// Define canonical Bible book order
const BOOK_ORDER: Record<string, number> = {
  // Old Testament
  GEN: 1,
  EXO: 2,
  LEV: 3,
  NUM: 4,
  DEU: 5,
  JOS: 6,
  JDG: 7,
  RUT: 8,
  '1SA': 9,
  '2SA': 10,
  '1KI': 11,
  '2KI': 12,
  '1CH': 13,
  '2CH': 14,
  EZR: 15,
  NEH: 16,
  EST: 17,
  JOB: 18,
  PSA: 19,
  PRO: 20,
  ECC: 21,
  SNG: 22,
  ISA: 23,
  JER: 24,
  LAM: 25,
  EZK: 26,
  DAN: 27,
  HOS: 28,
  JOL: 29,
  AMO: 30,
  OBA: 31,
  JON: 32,
  MIC: 33,
  NAM: 34,
  HAB: 35,
  ZEP: 36,
  HAG: 37,
  ZEC: 38,
  MAL: 39,
  // New Testament
  MAT: 40,
  MRK: 41,
  LUK: 42,
  JHN: 43,
  ACT: 44,
  ROM: 45,
  '1CO': 46,
  '2CO': 47,
  GAL: 48,
  EPH: 49,
  PHP: 50,
  COL: 51,
  '1TH': 52,
  '2TH': 53,
  '1TI': 54,
  '2TI': 55,
  TIT: 56,
  PHM: 57,
  HEB: 58,
  JAS: 59,
  '1PE': 60,
  '2PE': 61,
  '1JN': 62,
  '2JN': 63,
  '3JN': 64,
  JUD: 65,
  REV: 66
}

// Create table and index
db.exec(`
  CREATE TABLE verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book TEXT NOT NULL,
    book_order INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL
  );
  CREATE INDEX idx_ref ON verses(book, chapter, verse);
  CREATE INDEX idx_order ON verses(book_order, chapter, verse);
`)

// Prepare insert statement (faster than repeated prepare)
const insert = db.prepare(`
  INSERT INTO verses (book, book_order, chapter, verse, text)
  VALUES (?, ?, ?, ?, ?)
`)

// Sort chapters by canonical book order, then by chapter number
const sortedChapters = [...chapters].sort((a, b) => {
  const [bookA, chapterStrA] = a.chapterId.split('.')
  const [bookB, chapterStrB] = b.chapterId.split('.')

  const bookOrderA = BOOK_ORDER[bookA] ?? 999
  const bookOrderB = BOOK_ORDER[bookB] ?? 999

  if (bookOrderA !== bookOrderB) {
    return bookOrderA - bookOrderB
  }

  return parseInt(chapterStrA, 10) - parseInt(chapterStrB, 10)
})

const insertMany = db.transaction((allChapters) => {
  for (const chapter of allChapters) {
    const [book, chapterStr] = chapter.chapterId.split('.')
    const chapterNum = parseInt(chapterStr, 10)
    const bookOrder = BOOK_ORDER[book] ?? 999

    for (const verse of chapter.verses) {
      const [, , verseStr] = verse.verseId.split('.')
      const verseNum = parseInt(verseStr, 10)
      insert.run(book, bookOrder, chapterNum, verseNum, verse.text)
    }
  }
})

insertMany(sortedChapters)

console.log('✅ Bible SQLite database created at', outputFile)
db.close()
