const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace(
  "                where('remainingQuantity', '>', 0),\n                orderBy('date', 'asc')\n              );",
  "                where('remainingQuantity', '>', 0)\n              );"
);

code = code.replace(
  "              const batchSnap = await getDocs(qBatches);\n              \n              for (const bDoc of batchSnap.docs) {",
  `              const batchSnap = await getDocs(qBatches);
              // In-memory sort to avoid requiring a composite index in Firestore
              const sortedDocs = batchSnap.docs.sort((a, b) => {
                const dateA = a.data().date?.toMillis() || 0;
                const dateB = b.data().date?.toMillis() || 0;
                return dateA - dateB;
              });
              
              for (const bDoc of sortedDocs) {`
);

fs.writeFileSync('src/components/SalesManager.tsx', code);
