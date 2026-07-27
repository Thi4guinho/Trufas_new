const fs = require('fs');
let code = fs.readFileSync('src/utils.ts', 'utf-8');

code = code.replace(
  "  console.error('Firestore Error: ', JSON.stringify(errInfo));\n  throw new Error(JSON.stringify(errInfo));",
  "  console.error('Firestore Error: ', JSON.stringify(errInfo));\n  return errInfo;"
);

fs.writeFileSync('src/utils.ts', code);
