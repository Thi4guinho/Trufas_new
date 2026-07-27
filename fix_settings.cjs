const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

code = code.replace(
  "const [lowStockAlert, setLowStockAlert] = useState<number>(settings?.lowStockAlert || 5);",
  "const [lowStockAlert, setLowStockAlert] = useState<number>(settings?.lowStockAlert || 5);\n  const [businessModel, setBusinessModel] = useState<string>(settings?.businessModel || 'production');"
);

code = code.replace(
  "        lowStockAlert: Number(lowStockAlert)\n      };",
  "        lowStockAlert: Number(lowStockAlert),\n        businessModel: businessModel as any\n      };"
);

fs.writeFileSync('src/components/Settings.tsx', code);
