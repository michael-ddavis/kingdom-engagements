import { engagementRoutes } from './app.config';

describe('Engagements route contract', () => {
  it('preserves the verified browser routes', () => {
    const paths = engagementRoutes.map(route => route.path);

    expect(paths).toEqual([
      '',
      'invitations',
      'assignments',
      'assignments/:id',
      'organization/ctg/apostle/engagements/:id',
      'organization/ctg/apostle',
      'organization/ctg',
      'organization/ctg/bookings',
      'organization/ctg/start-invitation',
      'organization/ctg/programs',
      'register/:eventId',
      'join-the-12',
      'organization/dwc/formation',
      'organization/dwc/formation/tools',
      'organization/dwc/my-group',
      'organization/dwc/groups',
      'organization/dwc/admin',
      'organization/dwc',
      'organization/:org',
      '**',
    ]);
  });

  it('keeps booking and assignment workspaces role-aware', () => {
    const guardedPaths = engagementRoutes
      .filter(route => route.canActivate?.length)
      .map(route => route.path);

    expect(guardedPaths).toEqual([
      'invitations',
      'assignments',
      'assignments/:id',
      'organization/ctg',
      'organization/ctg/bookings',
      'organization/ctg/start-invitation',
      'organization/ctg/programs',
      'organization/dwc/formation',
      'organization/dwc/formation/tools',
      'organization/dwc/my-group',
      'organization/dwc/groups',
      'organization/dwc/admin',
      'organization/dwc',
      'organization/:org',
    ]);
  });

  it('matches the Apostle engagement brief before the dashboard route', () => {
    const paths = engagementRoutes.map(route => route.path);

    expect(paths.indexOf('organization/ctg/apostle/engagements/:id'))
      .toBeLessThan(paths.indexOf('organization/ctg/apostle'));
  });
});
