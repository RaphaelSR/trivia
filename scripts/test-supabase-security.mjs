import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const pgBin = process.env.PG_BIN || '/opt/homebrew/opt/postgresql@15/bin'
const directory = mkdtempSync(join(tmpdir(), 'trivia-security-'))
const database = join(directory, 'database')
let started = false

function run(binary, args, input) {
  const result = spawnSync(join(pgBin, binary), args, { input, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${binary}: ${result.stderr || result.stdout}`)
  return result.stdout
}

function sql(source) {
  return run('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-h', directory, '-p', '55471', '-U', 'postgres', 'postgres'], source)
}

try {
  run('initdb', ['-D', database, '-U', 'postgres', '-A', 'trust', '--no-locale'])
  run('pg_ctl', ['-D', database, '-l', join(directory, 'server.log'), '-o', `-k ${directory} -p 55471 -c listen_addresses=''`, '-w', 'start'])
  started = true
  sql(readFileSync(resolve('supabase/tests/security-bootstrap.sql'), 'utf8'))
  const tests = readFileSync(resolve('supabase/tests/invite-and-snapshot-privacy.sql'), 'utf8')
  const assertionStart = tests.indexOf('\nset role authenticated;')
  if (assertionStart < 0) throw new Error('Missing database security assertions')
  let seeded = false
  for (const file of readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()) {
    if (file.startsWith('0012_')) {
      sql(tests.slice(0, assertionStart))
      seeded = true
    }
    if (process.env.SECURITY_BASELINE === '1' && Number.parseInt(file, 10) >= 12) continue
    sql(readFileSync(resolve('supabase/migrations', file), 'utf8'))
  }
  if (!seeded) sql(tests.slice(0, assertionStart))
  console.log(sql(tests.slice(assertionStart)).trim())
} finally {
  if (started) run('pg_ctl', ['-D', database, '-m', 'immediate', '-w', 'stop'])
  rmSync(directory, { recursive: true, force: true })
}
