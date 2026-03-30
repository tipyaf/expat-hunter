import { test } from '@japa/runner'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import CvParserService from '#services/cv_parser_service'

const TMP_DIR = join(tmpdir(), 'cv-parser-tests')

test.group('CvParserService', (group) => {
  const service = new CvParserService()

  group.setup(async () => {
    await mkdir(TMP_DIR, { recursive: true })
  })

  group.teardown(async () => {
    await rm(TMP_DIR, { recursive: true, force: true })
  })

  // --- TXT file routing ---

  test('extracts text from a .txt file', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'resume.txt')
    await writeFile(filePath, 'Senior Developer with 10 years experience')
    const result = await service.extractText(filePath)
    assert.equal(result, 'Senior Developer with 10 years experience')
  })

  test('trims whitespace from .txt content', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'whitespace.txt')
    await writeFile(filePath, '  \n  Hello World  \n  ')
    const result = await service.extractText(filePath)
    assert.equal(result, 'Hello World')
  })

  test('handles empty .txt file', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'empty.txt')
    await writeFile(filePath, '')
    const result = await service.extractText(filePath)
    assert.equal(result, '')
  })

  test('handles .txt with only whitespace', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'spaces.txt')
    await writeFile(filePath, '   \n\n   ')
    const result = await service.extractText(filePath)
    assert.equal(result, '')
  })

  test('preserves multi-line content in .txt', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'multiline.txt')
    const content = 'Line 1\nLine 2\nLine 3'
    await writeFile(filePath, content)
    const result = await service.extractText(filePath)
    assert.equal(result, content)
  })

  // --- Unsupported format ---

  test('throws for unsupported file extension .docx', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'resume.docx')
    await writeFile(filePath, 'fake docx content')
    try {
      await service.extractText(filePath)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
      assert.include((error as Error).message, '.docx')
    }
  })

  test('throws for unsupported file extension .doc', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'resume.doc')
    await writeFile(filePath, 'fake doc content')
    try {
      await service.extractText(filePath)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
      assert.include((error as Error).message, '.doc')
    }
  })

  test('throws for unknown extension .xyz', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'file.xyz')
    await writeFile(filePath, 'random data')
    try {
      await service.extractText(filePath)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
      assert.include((error as Error).message, '.xyz')
    }
  })

  // --- Extension detection ---

  test('routes .TXT (uppercase) correctly via toLowerCase', async ({ assert }) => {
    // The service lowercases extensions, so .TXT should work
    const filePath = join(TMP_DIR, 'upper.TXT')
    await writeFile(filePath, 'Uppercase extension')
    const result = await service.extractText(filePath)
    assert.equal(result, 'Uppercase extension')
  })

  test('routes .PDF extension to PDF parser', async ({ assert }) => {
    // A valid PDF requires actual PDF bytes; an invalid buffer triggers the catch block
    const filePath = join(TMP_DIR, 'invalid.pdf')
    await writeFile(filePath, 'not a real pdf')
    try {
      await service.extractText(filePath)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })

  // --- Edge case: no extension ---

  test('throws for file without extension', async ({ assert }) => {
    const filePath = join(TMP_DIR, 'noext')
    await writeFile(filePath, 'content without extension')
    try {
      await service.extractText(filePath)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })
})
