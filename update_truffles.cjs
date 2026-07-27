const fs = require('fs');
let code = fs.readFileSync('src/components/TruffleManager.tsx', 'utf-8');

const regex = /\/\* Composition Editor \*\/.+?(?=\/\* Live margin previews \*\/)/s;
code = code.replace(regex, '');

fs.writeFileSync('src/components/TruffleManager.tsx', code);
