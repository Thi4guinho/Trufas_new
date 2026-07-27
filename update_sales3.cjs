const fs = require('fs');
let code = fs.readFileSync('src/components/SalesManager.tsx', 'utf-8');

const oldBlock = `      if (editingSale) {
        // Edit flow
        await updateDoc(doc(db, 'sales', editingSale.id), saleData);
        actionText = \`Editou a venda #\${editingSale.saleNumber} para \${normalizedCName}\`;
        
        // Stock corrections if needed, we might need a complex roll back, but to keep it safe:
        // just update to the new quantities if they edited products.
        // For security & audit integrity, we simply log it.
      } else {
        // Regular Create flow
        const docRef = await addDoc(collection(db, 'sales'), saleData);
        actionText = \`Registrou venda #\${uniqueSaleNum} para \${normalizedCName}\`;

        // Decrement product stocks and apply FIFO for traceability
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
                where('remainingQuantity', '>', 0)
              );
              
              const batchSnap = await getDocs(qBatches);
              // In-memory sort to avoid requiring a composite index in Firestore
              const sortedDocs = batchSnap.docs.sort((a, b) => {
                const dateA = a.data().date?.toMillis() || 0;
                const dateB = b.data().date?.toMillis() || 0;
                return dateA - dateB;
              });
              
              for (const bDoc of sortedDocs) {
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
        }

        setLastSale({ id: docRef.id, ...saleData } as Sale);
      }`;

const newBlock = `      if (editingSale) {
        // Edit flow
        await updateDoc(doc(db, 'sales', editingSale.id), saleData);
        actionText = \`Editou a venda #\${editingSale.saleNumber} para \${normalizedCName}\`;
      } else {
        // Regular Create flow
        
        // Decrement product stocks and apply FIFO for traceability BEFORE saving sale
        for (const item of saleData.items) {
          const matchedTruffle = truffles.find(t => t.id === item.truffleId);
          if (matchedTruffle) {
            let quantityToDeduct = item.quantity;
            let batchesUsed = [];

            try {
              const qBatches = query(
                collection(db, 'stock_batches'),
                where('ownerId', '==', profile?.companyId || auth.currentUser!.uid),
                where('itemId', '==', item.truffleId),
                where('remainingQuantity', '>', 0)
              );
              
              const batchSnap = await getDocs(qBatches);
              const sortedDocs = batchSnap.docs.sort((a, b) => {
                const dateA = a.data().date?.toMillis() || 0;
                const dateB = b.data().date?.toMillis() || 0;
                return dateA - dateB;
              });
              
              for (const bDoc of sortedDocs) {
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

            if (quantityToDeduct > 0) {
               batchesUsed.push({
                 batchId: 'avulso',
                 quantity: quantityToDeduct,
                 unitCost: matchedTruffle.cost
               });
            }

            // Save traceability info in the sale item
            (item as any).batchesUsed = batchesUsed;

            await updateDoc(doc(db, 'truffles', item.truffleId), {
              stock: Math.max(0, matchedTruffle.stock - item.quantity)
            });
          }
        }

        const docRef = await addDoc(collection(db, 'sales'), saleData);
        actionText = \`Registrou venda #\${uniqueSaleNum} para \${normalizedCName}\`;

        setLastSale({ id: docRef.id, ...saleData } as Sale);
      }`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('src/components/SalesManager.tsx', code);
