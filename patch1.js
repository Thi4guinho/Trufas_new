const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

const stateCode = `
  // Voice Order State
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [voiceOrderData, setVoiceOrderData] = useState<any>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceError, setVoiceError] = useState("");
`;

code = code.replace(
  "  // Shopping Cart state",
  stateCode + "\n  // Shopping Cart state"
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
