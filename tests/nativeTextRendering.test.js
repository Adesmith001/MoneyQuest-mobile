const path = require('path');
const ts = require('typescript');

const projectRoot = path.join(__dirname, '..');
const configPath = path.join(projectRoot, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const checker = program.getTypeChecker();

const typeCanRenderAsRawText = (type, seen = new Set()) => {
  if (!type || seen.has(type.id)) {
    return false;
  }

  seen.add(type.id);

  if (type.isUnionOrIntersection()) {
    return type.types.some((member) => typeCanRenderAsRawText(member, seen));
  }

  if (type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike)) {
    return true;
  }

  const indexedType = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
  return indexedType ? typeCanRenderAsRawText(indexedType, seen) : false;
};

const failures = [];

for (const sourceFile of program.getSourceFiles()) {
  if (
    !sourceFile.fileName.endsWith('.tsx') ||
    sourceFile.fileName.includes('node_modules') ||
    sourceFile.fileName.includes('school-dashboard') ||
    sourceFile.fileName.includes('moneyquest-dashboard')
  ) {
    continue;
  }

  const nativeHosts = new Set();
  const textHosts = new Set(['Animated.Text']);

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier.text !== 'react-native' ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    for (const element of statement.importClause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      const localName = element.name.text;

      nativeHosts.add(localName);
      if (importedName === 'Text') {
        textHosts.add(localName);
      }
    }
  }

  const visit = (node) => {
    const parentHost = node.parent && ts.isJsxElement(node.parent)
      ? node.parent.openingElement.tagName.getText(sourceFile)
      : node.parent && ts.isJsxFragment(node.parent)
        ? 'Fragment'
        : null;
    const isNativeTextHost = parentHost && textHosts.has(parentHost);
    const nativeNamespace = parentHost?.split('.')[0];
    const isUnsafeHost =
      parentHost === 'Fragment' ||
      (parentHost &&
        (nativeHosts.has(parentHost) ||
          (parentHost.includes('.') && nativeHosts.has(nativeNamespace))) &&
        !isNativeTextHost);

    const isRawLiteral = ts.isJsxText(node) && Boolean(node.getText(sourceFile).trim());
    const expressionType =
      ts.isJsxExpression(node) && node.expression
        ? checker.getTypeAtLocation(node.expression)
        : null;

    if (
      isUnsafeHost &&
      (isRawLiteral || (expressionType && typeCanRenderAsRawText(expressionType)))
    ) {
      const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      failures.push(
        `${path.relative(projectRoot, sourceFile.fileName)}:${location.line + 1}`
      );
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

if (failures.length > 0) {
  throw new Error(
    `Strings/numbers can create raw native text nodes:\n${failures.join('\n')}`
  );
}

console.log('Native rendering cannot leak text into non-Text hosts.');
