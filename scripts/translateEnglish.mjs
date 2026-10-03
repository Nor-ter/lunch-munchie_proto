import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const dictionaryFile = path.join(root, "shared/englishCopy.ts");
const dictionarySource = ts.createSourceFile(
  dictionaryFile,
  fs.readFileSync(dictionaryFile, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const copy = new Map();
function readCopy(node) {
  if (
    ts.isPropertyAssignment(node) &&
    (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) &&
    ts.isStringLiteral(node.initializer)
  )
    copy.set(node.name.text, node.initializer.text);
  ts.forEachChild(node, readCopy);
}
readCopy(dictionarySource);

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? files(target)
      : /\.[jt]sx?$/.test(entry.name) && !/\.test\.|\.d\.ts$/.test(entry.name)
        ? [target]
        : [];
  });
}
const targets = ["client/src", "shared", "functions/api", "server"]
  .flatMap((directory) => files(path.join(root, directory)))
  .filter((file) => file !== dictionaryFile);
const input = process.argv.find((arg) => arg.startsWith("--path="))?.slice(7);
const keys = new Set();
const edited = [];
function isInternal(node, file) {
  if (
    ts.isLiteralTypeNode(node.parent) ||
    (ts.isPropertyAssignment(node.parent) && node.parent.name === node)
  )
    return true;
  if (
    ts.isBinaryExpression(node.parent) &&
    [
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ].includes(node.parent.operatorToken.kind)
  )
    return true;
  if (
    ts.isPropertyAssignment(node.parent) &&
    ["category", "tag", "tags", "region", "theme", "placeId", "id"].includes(
      node.parent.name.text,
    )
  )
    return true;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isPropertyAssignment(parent) &&
      ["category", "tag", "tags", "region", "theme", "placeId", "id"].includes(
        parent.name.text,
      )
    )
      return true;
    if (
      ts.isFunctionDeclaration(parent) &&
      /categoryFromTypes|normalizeFoodTag/.test(parent.name?.getText() ?? "")
    )
      return true;
    if (
      ts.isVariableDeclaration(parent) &&
      /KEYWORDS|ALIASES|_MAP|NORMALIZE|EMOJI|CUISINE|BUDGET|THEMES|FOOD_TAGS/.test(
        parent.name.getText(),
      ) &&
      !/CHOICES|OPTIONS/.test(parent.name.getText())
    )
      return true;
    if (
      ts.isCallExpression(parent) &&
      /^(console\.|logEvent|logSwipe|logWinner)/.test(
        parent.expression.getText(),
      )
    )
      return true;
    if (
      ts.isCallExpression(parent) &&
      parent.arguments.includes(node) &&
      /\.(includes|indexOf|startsWith|endsWith|replace|test|has|get|set|prepare)$/.test(
        parent.expression.getText(),
      )
    )
      return true;
    if (ts.isTypeNode(parent)) return true;
  }
  if (file.includes("/shared/") || file.includes("/server/")) {
    let parent = node.parent;
    while (
      parent &&
      !ts.isPropertyAssignment(parent) &&
      !ts.isCallExpression(parent)
    )
      parent = parent.parent;
    if (
      !parent ||
      (ts.isPropertyAssignment(parent) &&
        ![
          "label",
          "error",
          "message",
          "hint",
          "description",
          "name",
          "title",
        ].includes(parent.name.getText()))
    )
      return true;
    if (
      ts.isCallExpression(parent) &&
      !/Error|json/.test(parent.expression.getText())
    )
      return true;
  }
  return false;
}

for (const file of targets) {
  if (input && !path.relative(root, file).startsWith(input)) continue;
  const original = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    original,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const changes = [];
  const wrappers = [];
  let needsDisplay = false;
  function visit(node) {
    const literal =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (literal && /[가-힣]/.test(node.text) && !isInternal(node, file)) {
      const key = node.text.trim();
      if (key) {
        keys.add(key);
        const translated = copy.get(key);
        if (translated !== undefined && process.argv.includes("--apply")) {
          const text = node.text.replace(key, translated);
          let replacement;
          if (ts.isJsxText(node)) replacement = text;
          else if (ts.isStringLiteral(node)) {
            if (ts.isJsxAttribute(node.parent))
              replacement = JSON.stringify(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;");
            else replacement = JSON.stringify(text);
          } else {
            const leading =
              ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ? "}" : "`";
            const trailing =
              ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? "${" : "`";
            replacement =
              leading +
              text
                .replace(/\\/g, "\\\\")
                .replace(/`/g, "\\`")
                .replace(/\$\{/g, "\\${") +
              trailing;
          }
          changes.push({
            start: ts.isJsxText(node) ? node.getFullStart() : node.getStart(source),
            end: node.end,
            text: replacement,
          });
        }
      }
    }
    if (
      process.argv.includes("--apply") &&
      ts.isJsxExpression(node) &&
      node.expression &&
      !node.dotDotDotToken &&
      !/^englishText\(/.test(node.expression.getText(source))
    ) {
      const parent = node.parent;
      const attribute =
        ts.isJsxAttribute(parent) &&
        /^(aria-label|title|alt|placeholder)$/.test(parent.name.getText());
      const expressionText = node.expression.getText(source);
      const leafText =
        (ts.isIdentifier(node.expression) ||
          ts.isPropertyAccessExpression(node.expression) ||
          ts.isElementAccessExpression(node.expression)) &&
        !/^(children|icon|index|count)$/.test(expressionText);
      if (attribute || (!ts.isJsxAttribute(parent) && leafText)) {
        const expression = node.expression;
        wrappers.push({
          start: expression.getStart(source),
          end: expression.end,
        });
        needsDisplay = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (process.argv.includes("--apply")) {
    // Insert display calls independently of literal edits, retaining original offsets.
    for (const wrapper of wrappers) {
      changes.push({
        start: wrapper.start,
        end: wrapper.start,
        text: "englishText(",
      });
      changes.push({ start: wrapper.end, end: wrapper.end, text: ")" });
    }
    changes.sort((a, b) => b.start - a.start || b.end - a.end);
    let updated = original;
    for (const change of changes)
      updated =
        updated.slice(0, change.start) +
        change.text +
        updated.slice(change.end);
    if (
      needsDisplay &&
      !/import.*englishText.*from ['"]@shared\/englishCopy['"]/.test(updated)
    )
      updated =
        "import { englishText } from '@shared/englishCopy';\n" + updated;
    if (updated !== original) {
      fs.writeFileSync(file, updated);
      edited.push(path.relative(root, file));
    }
  }
}
if (process.argv.includes("--apply"))
  console.log(`Updated ${edited.length} files`);
else {
  const remaining = [...keys].filter((key) => !copy.has(key));
  console.log(`${remaining.length} untranslated display segments`);
  console.log(remaining.map((key) => JSON.stringify(key)).join("\n"));
}
