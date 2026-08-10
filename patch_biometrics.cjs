const fs = require('fs');
let code = fs.readFileSync('src/components/PasswordGate.tsx', 'utf-8');

code = code.replace(
  /const handleBiometricAuth = async \(\) => \{\s*try \{/,
  `const handleBiometricAuth = async () => {
    try {
      if (window.self !== window.top) {
        alert("A biometria por digital está bloqueada na visualização de prévia. Por favor, clique no botão 'Open in New Tab' (ícone de janela) no topo da tela para abrir o sistema em uma aba independente e usar a digital.");
        return;
      }`
);

code = code.replace(
  /      console\.error\(err\);\s*if \(err instanceof Error && \(err\.name === 'NotAllowedError' \|\| err\.message\.includes\('feature is not enabled'\)\)\) \{[\s\S]*?\} else \{[\s\S]*?\}\s*\}/,
  `      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('feature is not enabled'))) {
        alert("A biometria está bloqueada na visualização atual. Para usar a digital, clique no botão 'Open in New Tab' (ícone de janela) no topo da tela do AI Studio para abrir o aplicativo em uma nova aba.");
      } else {
        console.error(err);
        alert("Autenticação biométrica falhou ou foi cancelada.");
      }
    }`
);

fs.writeFileSync('src/components/PasswordGate.tsx', code);
