# Engagements tenant themes

Tenant themes provide branded presentation without forking the Engagements UI.
Shared components continue to own layout, responsive behavior, accessibility,
routes, permissions, and workflows.

To add a reviewed tenant theme:

1. Copy `engagements-tenant-theme.template.css` to
   `engagements-{tenant-key}.theme.css`.
2. Replace `body.eng-org-tenant-key` with the body class assigned by the trusted
   tenant mapping in `engagement-organization.ts` and `app.ts`.
3. Supply every token declared by `engagements-theme-contract.css`.
4. Add the stylesheet after the contract in `angular.json`.
5. Add tenant-isolation, contrast, responsive, and high-value workflow tests.

Tenant styles may change color, typography, radii, shadows, and approved visual
details. They must not hide controls, move required workflow steps, encode roles,
or alter component behavior. Unknown tenants retain the default theme.
