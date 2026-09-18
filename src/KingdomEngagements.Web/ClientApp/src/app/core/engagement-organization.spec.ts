import {
  CTG_TENANT_ID,
  DWC_TENANT_ID,
  HEYY_KING_TENANT_ID,
  organizationForTenant,
} from './engagement-organization';

describe('Engagements tenant presentation boundary', () => {
  it('selects the CTG experience only for the CTG tenant', () => {
    expect(organizationForTenant(CTG_TENANT_ID)).toBe('ctg');
    expect(organizationForTenant(CTG_TENANT_ID.toUpperCase())).toBe('ctg');
  });

  it('preserves the existing organization experiences', () => {
    expect(organizationForTenant(DWC_TENANT_ID)).toBe('divine-world-changers');
    expect(organizationForTenant(HEYY_KING_TENANT_ID)).toBe('heyy-king');
  });

  it('keeps missing and unknown tenants on the neutral experience', () => {
    expect(organizationForTenant(null)).toBe('default');
    expect(organizationForTenant(undefined)).toBe('default');
    expect(organizationForTenant('00000000-0000-0000-0000-000000000000')).toBe('default');
  });
});
