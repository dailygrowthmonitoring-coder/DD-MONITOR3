import type { MTreeData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// Matches mtree list row: "/data/col1/backup                   0.0   RW"
// or: "/data/col1/ntrkbsr_new         423971.7   RW"
const RE_MTREE_LIST_ROW = /^\/data\/col1\/(\S+)\s+([\d.]+|-)\s+(\w[\w\s]*\w|\w)/gm

// Matches dm_mtree entry: "1: backup,1574169456,#Inode=4,...,RW"
// or: "2: ntrkbsr_new,1589978419,...,RW"
const RE_DM_MTREE = /^\d+:\s+(\w+),(\d+),#Inode=/gm

function safeFloat(val: string): number {
  if (val === '-') return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

function buildIdMap(text: string): Map<string, string> {
  const idMap = new Map<string, string>()
  const re = /^\d+:\s+(\w+),(\d+),#Inode=/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    idMap.set(match[1], match[2])
  }
  return idMap
}

export function parseMtrees(text: string): SectionResult<MTreeData[]> {
  try {
    const sectionIdx = text.indexOf('Mtree List')
    if (sectionIdx === -1) {
      return { value: [], error: 'Mtree List section not found' }
    }

    // Bound the search strictly between "Mtree List" and "Mtree Show Compression"
    const afterSection = text.slice(sectionIdx)
    const nextSectionIdx = afterSection.indexOf('Mtree Show Compression')
    const window = nextSectionIdx > 0
      ? afterSection.slice(0, nextSectionIdx)
      : afterSection.slice(0, 1000)

    // Build ID lookup from dm_mtree entries (found throughout the file)
    const idMap = buildIdMap(text)

    const mtrees: MTreeData[] = []
    const re = RE_MTREE_LIST_ROW

    // Reset lastIndex since it's a /g regex reused across calls
    re.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = re.exec(window)) !== null) {
      const name = match[1].trim()
      const pre_comp_gib = safeFloat(match[2])
      const rawStatus = match[3].trim()
      // Keep only the first token as status (handles trailing spaces in file)
      const status = rawStatus.split(/\s+/)[0]

      const id = idMap.get(name) ?? ''

      mtrees.push({
        name,
        id,
        status,
        pre_comp_gib,
        post_comp_gib: null,
      })
    }

    if (mtrees.length === 0) {
      return { value: [], error: 'No mtree rows found in Mtree List section' }
    }

    return { value: mtrees, error: null }
  } catch (err) {
    return {
      value: [],
      error: `mtrees parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
