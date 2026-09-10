const path = require('path');
const ts = require('typescript');

const projectRoot = path.join(__dirname, '..');
const configPath = path.join(projectRoot, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const checker = program.getTypeChecker();

const textHosts = new Set(['Text', 'Animated.Text']);

const typeCanRenderAsRawText = (type) => {
  if (type.isUnion()) {
    return type.types.some(typeCanRenderAsRawText);
  }

  return Boolean(type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike));
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

  const visit = (node) => {
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      ts.isJsxElement(node.parent)
    ) {
      const hostName = node.parent.openingElement.tagName.getText(sourceFile);
      const expressionType = checker.getTypeAtLocation(node.expression);

      if (!textHosts.has(hostName) && typeCanRenderAsRawText(expressionType)) {
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        failures.push(
          `${path.relative(projectRoot, sourceFile.fileName)}:${location.line + 1}`
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

if (failures.length > 0) {
  throw new Error(
    `String/number conditionals can create raw native text nodes:\n${failures.join('\n')}`
  );
}

console.log('Native conditional rendering cannot leak text into non-Text hosts.');
