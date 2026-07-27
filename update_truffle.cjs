const fs = require('fs');
let code = fs.readFileSync('src/components/TruffleManager.tsx', 'utf-8');

code = code.replace(
  "interface TruffleManagerProps {\n  truffles: Truffle[];\n  profile: any;\n  lowStockLimit?: number;\n}",
  "interface TruffleManagerProps {\n  truffles: Truffle[];\n  profile: any;\n  materials?: any[];\n  lowStockLimit?: number;\n}"
);

code = code.replace(
  "  lowStockLimit = 5 \n}) => {",
  "  materials = [],\n  lowStockLimit = 5 \n}) => {"
);

code = code.replace(
  "const [stock, setStock] = useState<number | ''>('');",
  "const [stock, setStock] = useState<number | ''>('');\n  const [composition, setComposition] = useState<any>(null);"
);

code = code.replace(
  "      const data = {\n        name,\n        price: Number(price),\n        cost: Number(cost),\n        stock: Number(stock),\n        ownerId: profile?.companyId || auth.currentUser!.uid\n      };",
  "      const data = {\n        name,\n        price: Number(price),\n        cost: Number(cost),\n        stock: Number(stock),\n        ownerId: profile?.companyId || auth.currentUser!.uid,\n        ...(composition ? { composition } : {})\n      };"
);

code = code.replace(
  "    setEditingId(null);\n  };",
  "    setEditingId(null);\n    setComposition(null);\n  };"
);

code = code.replace(
  "    setEditingId(truffle.id);\n  };",
  "    setEditingId(truffle.id);\n    setComposition(truffle.composition || null);\n  };"
);

fs.writeFileSync('src/components/TruffleManager.tsx', code);
