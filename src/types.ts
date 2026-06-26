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
  role: 'admin' | 'employee' | 'user';
  displayName?: string;
  companyId?: string;
}

export interface CompanyPermission {
  sales_view: boolean;
  sales_create: boolean;
  sales_edit: boolean;
  sales_delete: boolean;
  customers_view: boolean;
  customers_create: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  truffles_view: boolean;
  truffles_create: boolean;
  truffles_edit: boolean;
  truffles_delete: boolean;
  stock_view: boolean;
  stock_move: boolean;
  stock_edit: boolean;
  stock_delete: boolean;
  finance_view: boolean;
  finance_create: boolean;
  finance_edit: boolean;
  finance_delete: boolean;
  reports_view: boolean;
  reports_export: boolean;
  settings_view: boolean;
  settings_edit: boolean;
  settings_members: boolean;
}

export interface CompanyMember {
  email: string;
  uid?: string;
  name: string;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  permissions: CompanyPermission;
  joinedAt?: string;
  lastAccess?: string;
}

export interface Company {
  id: string; // matches ownerId
  name: string;
  ownerId: string; // original owner's UID
  createdAt: Timestamp | string | Date;
  memberEmails: string[];
  members: Record<string, CompanyMember>;
}

export interface Truffle {
  id: string;
  name: string;
  price: number;
  cost: number; // cost of production
  stock: number;
  ownerId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  description: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface SaleItem {
  truffleId: string;
  truffleName: string;
  quantity: number;
  pricePerUnit: number;
  costPerUnit: number; // to calculate exact profit at the time of sale
}

export interface Sale {
  id: string;
  saleNumber: string; // unique sale number (simple prefix + sequential or timestamp-based ID)
  items: SaleItem[];
  quantity: number; // total quantity of all items
  totalPrice: number;
  paidAmount: number;
  discount: number;
  isCredit: boolean;
  customerName: string;
  customerId?: string;
  date: Timestamp;
  ownerId: string;
  sellerName?: string;
  status: 'preparing' | 'finished' | 'cancelled'; // Em preparo, Finalizado, Cancelado
  paymentStatus: 'paid' | 'pending'; // Paga ou Pendente
  paymentMethod: 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'fiado';
  notes?: string;
  // Legacy fields for backward compatibility, so we don't break old documents
  truffleId?: string;
  truffleName?: string;
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

export interface CashflowRecord {
  id: string;
  type: 'income' | 'expense'; // Entrada ou Saída
  value: number;
  category: string; // Vendas, Recebimentos, Compra de Ingredientes, etc.
  date: Timestamp;
  description: string;
  responsible: string;
  ownerId: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  date: Timestamp;
  ownerId: string;
}
