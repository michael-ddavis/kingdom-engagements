export const CTG_TENANT_ID = 'a1ab45e2-1746-4d91-9de0-9cf70ae75d3a';
export const DWC_TENANT_ID = 'd1c00000-0000-4000-8000-000000000001';
export const HEYY_KING_TENANT_ID = 'e1100000-0000-4000-8000-000000000001';

export type EngagementOrganization =
  | 'ctg'
  | 'divine-world-changers'
  | 'heyy-king'
  | 'default';

export function organizationForTenant(tenantId: string | null | undefined): EngagementOrganization {
  switch (tenantId?.toLowerCase()) {
    case CTG_TENANT_ID:
      return 'ctg';
    case DWC_TENANT_ID:
      return 'divine-world-changers';
    case HEYY_KING_TENANT_ID:
      return 'heyy-king';
    default:
      return 'default';
  }
}
