const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace(
  "  const [quantity, setQuantity] = useState<number | ''>(1);",
  "  const [quantity, setQuantity] = useState<number | ''>(1);\n  const [isDropdownOpen, setIsDropdownOpen] = useState(false);"
);

if (!code.includes('ChevronDown')) {
  code = code.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    "import { $1, ChevronDown } from 'lucide-react';"
  );
}

fs.writeFileSync('src/components/SalesManager.tsx', code);
