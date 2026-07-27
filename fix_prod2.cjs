const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionManager.tsx', 'utf-8');

code = code.replace(
  "      updatedAt: Timestamp.now()\n    };",
  "      updatedAt: Timestamp.now(),\n      createdAt: Timestamp.now()\n    };"
);

fs.writeFileSync('src/components/ProductionManager.tsx', code);
