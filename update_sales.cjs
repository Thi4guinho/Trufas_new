const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

code = code.replace(
  "import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore';",
  "import { Timestamp, addDoc, collection, doc, updateDoc, getDocs, query, where, orderBy } from 'firebase/firestore';"
);

// We need to make sure handleConfirmSale function can use FIFO.
const oldDecrement = `        // Decrement product stocks
        for (const item of finalItemsList) {
          const matchedTruffle = truffles.find(t => t.id === item.truffleId);
          if (matchedTruffle) {
            await updateDoc(doc(db, 'truffles', item.truffleId), {
              stock: Math.max(0, matchedTruffle.stock - item.quantity)
            });
          }
        }`;

const newDecrement = `        // Decrement product stocks and apply FIFO for traceability
        for (const item of finalItemsList) {
          const matchedTruffle = truffles.find(t => t.id === item.truffleId);
          if (matchedTruffle) {
            let quantityToDeduct = item.quantity;
            let batchesUsed = [];

            try {
              const qBatches = query(
                collection(db, 'stock_batches'),
                where('ownerId', '==', profile?.companyId || auth.currentUser!.uid),
                where('itemId', '==', item.truffleId),
                where('remainingQuantity', '>', 0),
                orderBy('date', 'asc')
              );
              
              const batchSnap = await getDocs(qBatches);
              
              for (const bDoc of batchSnap.docs) {
                if (quantityToDeduct <= 0) break;
                
                const batchData = bDoc.data();
                const available = batchData.remainingQuantity;
                const deductFromBatch = Math.min(available, quantityToDeduct);
                
                batchesUsed.push({
                  batchId: batchData.batchId || bDoc.id,
                  quantity: deductFromBatch,
                  unitCost: batchData.unitCost
                });

                await updateDoc(doc(db, 'stock_batches', bDoc.id), {
                  remainingQuantity: available - deductFromBatch
                });
                
                quantityToDeduct -= deductFromBatch;
              }
            } catch (err) {
              console.error("FIFO Error:", err);
            }

            // Fallback traceability if we couldn't find batches or not enough batches
            if (quantityToDeduct > 0) {
               batchesUsed.push({
                 batchId: 'avulso',
                 quantity: quantityToDeduct,
                 unitCost: matchedTruffle.cost
               });
            }

            // Save traceability info in the sale item
            item.batchesUsed = batchesUsed;

            await updateDoc(doc(db, 'truffles', item.truffleId), {
              stock: Math.max(0, matchedTruffle.stock - item.quantity)
            });
          }
        }`;

code = code.replace(oldDecrement, newDecrement);

fs.writeFileSync('src/components/SalesManager.tsx', code);
