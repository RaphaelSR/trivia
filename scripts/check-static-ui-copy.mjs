import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const root = path.resolve(process.cwd(), 'src')
const ignoredSegments = ['/__tests__/', '/shared/i18n/', '/data/']
const userFacingAttributes = new Set([
  'alt',
  'aria-label',
  'description',
  'emptyMessage',
  'label',
  'placeholder',
  'searchPlaceholder',
  'suffix',
  'title',
  'valueLabel',
])
const userFacingObjectProperties = new Set(['description', 'label', 'subtitle', 'title'])
const allowedLiteralCopy = new Set(['Trivia'])

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectFiles(fullPath)
    return entry.isFile() && /\.tsx?$/.test(fullPath) ? [fullPath] : []
  })
}

function normalizeCopy(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function isUserCopy(value) {
  const normalized = normalizeCopy(value)
  return /\p{L}/u.test(normalized) && !allowedLiteralCopy.has(normalized)
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
  }
  return null
}

const findings = []

for (const filePath of collectFiles(root)) {
  const normalizedPath = filePath.split(path.sep).join('/')
  if (ignoredSegments.some((segment) => normalizedPath.includes(segment))) continue

  const source = fs.readFileSync(filePath, 'utf8')
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind)

  function report(node, value, kind) {
    if (!isUserCopy(value)) return
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    findings.push({
      file: path.relative(process.cwd(), filePath),
      line: line + 1,
      column: character + 1,
      kind,
      copy: normalizeCopy(value),
    })
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      report(node, node.getText(sourceFile), 'texto JSX')
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile)
      if (userFacingAttributes.has(name) && node.initializer && ts.isStringLiteral(node.initializer)) {
        report(node.initializer, node.initializer.text, `atributo ${name}`)
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      const value = literalValue(node.expression)
      if (value !== null) report(node.expression, value, 'expressão JSX')
    } else if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, '')
      if (userFacingObjectProperties.has(name)) {
        const value = literalValue(node.initializer)
        if (value !== null) report(node.initializer, value, `propriedade ${name}`)
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile)
      const isToast = callee === 'toast' || callee.startsWith('toast.')
      const isErrorSetter = /^set[A-Za-z]+Error$/.test(callee)
      const isDialog = callee === 'window.confirm' || callee === 'window.alert'
      const isImportIssue = callee === 'errors.push' || callee === 'warnings.push'
      if ((isToast || isErrorSetter || isDialog || isImportIssue) && node.arguments[0]) {
        const value = literalValue(node.arguments[0])
        if (value !== null) {
          const kind = isToast
            ? 'toast'
            : isDialog
              ? 'diálogo do navegador'
              : isImportIssue
                ? 'retorno de importação'
                : 'mensagem de erro'
          report(node.arguments[0], value, kind)
        }
      }
    } else if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      const value = literalValue(node.right)
      if (value !== null && /^\p{Lu}/u.test(normalizeCopy(value))) {
        report(node.right, value, 'fallback apresentado ao usuário')
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

if (findings.length > 0) {
  console.error('Textos estáticos encontrados fora dos catálogos de i18n:\n')
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}:${finding.column} [${finding.kind}] ${finding.copy}`)
  }
  process.exit(1)
}

console.log('i18n: nenhum texto estático de interface encontrado fora dos catálogos.')
