import { CompanyPermission } from './types';

export const getOwnerPermissions = (): CompanyPermission => ({
  sales_view: true,
  sales_create: true,
  sales_edit: true,
  sales_delete: true,

  customers_view: true,
  customers_create: true,
  customers_edit: true,
  customers_delete: true,

  truffles_view: true,
  truffles_create: true,
  truffles_edit: true,
  truffles_delete: true,

  stock_view: true,
  stock_move: true,
  stock_edit: true,
  stock_delete: true,

  finance_view: true,
  finance_create: true,
  finance_edit: true,
  finance_delete: true,

  reports_view: true,
  reports_export: true,

  settings_view: true,
  settings_edit: true,
  settings_members: true,
});

export const getMemberPermissions = (): CompanyPermission => ({
  sales_view: true,
  sales_create: true,
  sales_edit: false,
  sales_delete: false,

  customers_view: true,
  customers_create: true,
  customers_edit: false,
  customers_delete: false,

  truffles_view: true,
  truffles_create: false,
  truffles_edit: false,
  truffles_delete: false,

  stock_view: true,
  stock_move: true,
  stock_edit: false,
  stock_delete: false,

  finance_view: false,
  finance_create: false,
  finance_edit: false,
  finance_delete: false,

  reports_view: false,
  reports_export: false,

  settings_view: false,
  settings_edit: false,
  settings_members: false,
});

export function hasPermission(
  member: { role: string; permissions?: CompanyPermission } | null | undefined, 
  module: string, 
  action: string
): boolean {
  if (!member) return false;
  if (member.role === 'owner') return true;
  const key = `${module}_${action}` as keyof CompanyPermission;
  return !!(member.permissions && member.permissions[key] === true);
}
