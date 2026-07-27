const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf-8');

code = code.replace(
  "    match /truffles/{truffleId} {",
  `    match /materials/{materialId} {
      allow read, write: if isAuthenticated();
    }
    match /production_batches/{batchId} {
      allow read, write: if isAuthenticated();
    }
    match /stock_batches/{batchId} {
      allow read, write: if isAuthenticated();
    }
    match /loss_records/{lossId} {
      allow read, write: if isAuthenticated();
    }
    match /truffles/{truffleId} {`
);

fs.writeFileSync('firestore.rules', code);
