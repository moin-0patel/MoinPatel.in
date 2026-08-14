import { describe, expect, it } from 'vitest'

import { isValidSlug, SLUG_MAX_LENGTH, slugify, uniqueSlug } from './slug'

/**
 * Slug logic — PRD 41.1: "generation, collision suffixing, validation against
 * the database pattern."
 *
 * The last clause is the important one. This module's pattern must stay
 * identical to the `projects_slug_check` CHECK constraint. If they drift, the
 * admin form accepts a slug the database then rejects and the user sees a
 * generic save failure with no field to fix.
 */

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Recipe Costing System')).toBe('recipe-costing-system')
  })

  it('folds diacritics rather than stripping them', () => {
    // "Café" must become "cafe", not "caf" — dropping the letter changes the
    // word, and a stripped slug is a different URL from the obvious one.
    expect(slugify('Café Ops')).toBe('cafe-ops')
    expect(slugify('Zoë Naïve')).toBe('zoe-naive')
  })

  it('collapses runs of punctuation and whitespace into one hyphen', () => {
    expect(slugify('AI  &  Automation --- Systems')).toBe('ai-automation-systems')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world')
  })

  it('drops characters the pattern does not allow', () => {
    expect(slugify('Gemini 2.5 Flash (OCR)')).toBe('gemini-2-5-flash-ocr')
  })

  it('never emits a trailing hyphen after truncating at the length limit', () => {
    // The slice can land mid-word and leave a dangling hyphen, which would
    // fail the database pattern.
    const long = `${'a'.repeat(SLUG_MAX_LENGTH - 1)} tail`
    const result = slugify(long)
    expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(result.endsWith('-')).toBe(false)
    expect(isValidSlug(result)).toBe(true)
  })

  it('produces a valid slug for every realistic title', () => {
    const titles = [
      'Recipe Costing & Restaurant Operations System',
      'Capiche AI Feedback Automation',
      'Exam Build Platform',
      'Petpooja / Zomato menu sync',
      '  spaced   out  ',
    ]
    for (const title of titles) {
      expect(isValidSlug(slugify(title))).toBe(true)
    }
  })
})

describe('isValidSlug — must match the database CHECK constraint', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('exam-build-platform')).toBe(true)
    expect(isValidSlug('abc')).toBe(true)
    expect(isValidSlug('a1-b2-c3')).toBe(true)
  })

  /*
   * This case is why the constraint casts to ::text. `slug` is citext, and
   * citext's ~ operator is CASE-INSENSITIVE, so the obvious SQL accepted
   * 'Not-A-Slug' and the uppercase would have flowed into canonical URLs, the
   * sitemap and every shared link. `npm run db:verify` asserts the SQL side;
   * this asserts the client side agrees.
   */
  it('rejects uppercase', () => {
    expect(isValidSlug('Not-A-Slug')).toBe(false)
    expect(isValidSlug('EXAM')).toBe(false)
  })

  it('rejects leading, trailing and doubled hyphens', () => {
    expect(isValidSlug('-leading')).toBe(false)
    expect(isValidSlug('trailing-')).toBe(false)
    expect(isValidSlug('double--hyphen')).toBe(false)
  })

  it('rejects underscores, spaces and other punctuation', () => {
    expect(isValidSlug('has_underscore')).toBe(false)
    expect(isValidSlug('has space')).toBe(false)
    expect(isValidSlug('has.dot')).toBe(false)
    expect(isValidSlug('has/slash')).toBe(false)
  })

  it('enforces the 3–80 character bounds', () => {
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('abc')).toBe(true)
    expect(isValidSlug('a'.repeat(SLUG_MAX_LENGTH))).toBe(true)
    expect(isValidSlug('a'.repeat(SLUG_MAX_LENGTH + 1))).toBe(false)
  })

  it('rejects the empty string', () => {
    expect(isValidSlug('')).toBe(false)
  })
})

describe('uniqueSlug — collision suffixing', () => {
  it('returns the plain slug when nothing collides', () => {
    expect(uniqueSlug('Exam Build Platform', [])).toBe('exam-build-platform')
  })

  it('suffixes -2 on the first collision and counts up', () => {
    expect(uniqueSlug('Exam Build', ['exam-build'])).toBe('exam-build-2')
    expect(uniqueSlug('Exam Build', ['exam-build', 'exam-build-2'])).toBe('exam-build-3')
  })

  it('compares case-insensitively, matching citext uniqueness', () => {
    // The database UNIQUE is on a citext column, so 'Exam-Build' already
    // occupies 'exam-build'. Suggesting the latter would fail on save.
    expect(uniqueSlug('Exam Build', ['EXAM-BUILD'])).toBe('exam-build-2')
  })

  it('keeps the suffixed result inside the length limit', () => {
    const root = 'a'.repeat(SLUG_MAX_LENGTH)
    const result = uniqueSlug(root, [root])
    expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(result.endsWith('-2')).toBe(true)
    // Still storable — the whole point of fitting the suffix inside the limit
    // rather than appending beyond it.
    expect(isValidSlug(result)).toBe(true)
  })
})
