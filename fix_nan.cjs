const fs = require('fs');
let code = fs.readFileSync('src/components/TruffleManager.tsx', 'utf-8');

code = code.replace(
  "value={ing.quantity}",
  "value={Number.isNaN(ing.quantity) ? '' : ing.quantity}"
);
code = code.replace(
  "newIngs[index].quantity = parseFloat(e.target.value);",
  "newIngs[index].quantity = e.target.value === '' ? '' : parseFloat(e.target.value);"
);

code = code.replace(
  "value={composition.expectedYield}",
  "value={Number.isNaN(composition.expectedYield) ? '' : composition.expectedYield}"
);
code = code.replace(
  "expectedYield: parseFloat(e.target.value)",
  "expectedYield: e.target.value === '' ? '' : parseFloat(e.target.value)"
);

fs.writeFileSync('src/components/TruffleManager.tsx', code);
