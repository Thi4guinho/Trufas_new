import { Timestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string;
}

export interface Truffle {
  id: string;
  name: string;
  price: number;
  stock: number;
  ownerId: string;
}

export interface Sale {
  id: string;
  truffleId: string;
  truffleName?: string;
  quantity: number;
  totalPrice: number;
  paidAmount: number;
  discount: number;
  isCredit: boolean;
  customerName: string;
  date: Timestamp;
  ownerId: string;
  status: 'paid' | 'pending';
}

export interface PricingRule {
  minQty: number;
  price: number;
}

export interface UserSettings {
  ownerId: string;
  progressivePricing: PricingRule[];
  businessName?: string;
  businessPhone?: string;
  lowStockAlert?: number;
}
