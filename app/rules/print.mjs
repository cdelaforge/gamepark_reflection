// Prints app/public/rules-<lang>.pdf from rules.html, with the texts of the game translations and texts.json
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
const languages = ['fr', 'en']

// ponytail: usual Windows paths of Chrome and Edge, set CHROME to the browser executable elsewhere
const browsers = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
]
const browser = browsers.find(path => path && existsSync(path))
if (!browser) throw new Error('Chrome or Edge not found: set CHROME to the browser executable')

const template = readFileSync(join(dir, 'rules.html'), 'utf8')
const texts = JSON.parse(readFileSync(join(dir, 'texts.json'), 'utf8'))
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tmp = mkdtempSync(join(tmpdir(), 'reflection-rules-'))

try {
  for (const lang of languages) {
    const translation = JSON.parse(readFileSync(join(dir, `../public/translation/${lang}.json`), 'utf8'))
    const values = { ...translation, ...texts[lang], lang, base: pathToFileURL(dir).href }
    const html = template.replace(/{{([\w.-]+)}}/g, (_, key) => {
      if (values[key] === undefined) throw new Error(`Missing text ${key} in ${lang}`)
      return escape(values[key])
    })
    const page = join(tmp, `rules-${lang}.html`)
    writeFileSync(page, html)
    const pdf = join(dir, `../public/rules-${lang}.pdf`)
    execFileSync(browser, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${join(tmp, 'profile')}`, `--print-to-pdf=${pdf}`, pathToFileURL(page).href], { stdio: 'ignore' })
    console.log(`${pdf} printed`)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
