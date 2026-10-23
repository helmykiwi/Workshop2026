import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let environment;

const listing = {
  name: 'Coffee grounds',
  category: 'By-product',
  quantity: 20,
  unit: 'kg',
  location: 'Bangsar',
  price: 40,
  sellerId: 'seller-1',
  business: 'Kopi Kita',
  status: 'available',
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'workshop2026-foodlink',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'listings', 'listing-1'), listing);
  });
});

afterAll(async () => environment.cleanup());

describe('FoodLink Firestore boundaries', () => {
  it('allows the owner to publish a correctly owned listing', async () => {
    const db = environment.authenticatedContext('seller-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'listings', 'listing-2'), listing));
  });

  it('rejects ownership transfer and arbitrary listing edits', async () => {
    const db = environment.authenticatedContext('buyer-1').firestore();
    await assertFails(updateDoc(doc(db, 'listings', 'listing-1'), {
      price: 1,
      sellerId: 'buyer-1',
    }));
  });

  it('rejects a standalone reservation without its matching order', async () => {
    const db = environment.authenticatedContext('buyer-1').firestore();
    await assertFails(updateDoc(doc(db, 'listings', 'listing-1'), {
      status: 'reserved',
      reservedBy: 'buyer-1',
      reservedAt: serverTimestamp(),
    }));
  });

  it('allows one atomic reservation with a listing-derived order', async () => {
    const db = environment.authenticatedContext('buyer-1').firestore();
    await assertSucceeds(runTransaction(db, async (transaction) => {
      const listingRef = doc(db, 'listings', 'listing-1');
      const snapshot = await transaction.get(listingRef);
      const live = snapshot.data();

      transaction.update(listingRef, {
        status: 'reserved',
        reservedBy: 'buyer-1',
        reservedAt: serverTimestamp(),
      });
      transaction.set(doc(db, 'orders', 'listing-1'), {
        listingId: 'listing-1',
        itemName: live.name,
        buyerId: 'buyer-1',
        buyerName: 'Aina Bakery',
        sellerId: live.sellerId,
        sellerName: live.business,
        total: live.price,
        status: 'reserved',
        createdAt: serverTimestamp(),
      });
    }));

    await assertSucceeds(getDoc(doc(db, 'orders', 'listing-1')));
  });

  it('rejects a forged order and immutable order changes', async () => {
    const buyerDb = environment.authenticatedContext('buyer-1').firestore();
    await assertFails(setDoc(doc(buyerDb, 'orders', 'listing-1'), {
      listingId: 'listing-1',
      itemName: listing.name,
      buyerId: 'buyer-1',
      buyerName: 'Aina Bakery',
      sellerId: 'buyer-1',
      sellerName: listing.business,
      total: 1,
      status: 'reserved',
      createdAt: serverTimestamp(),
    }));

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'orders', 'sealed-order'), {
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        status: 'reserved',
      });
    });
    await assertFails(updateDoc(doc(buyerDb, 'orders', 'sealed-order'), {
      sellerId: 'buyer-1',
    }));
  });
});
