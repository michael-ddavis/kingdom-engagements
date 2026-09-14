import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EngagementDemoRoleService } from './engagement-demo-role.service';

export const engagementAssignmentListGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  if (!roles.isApostle()) return true;

  return inject(Router).createUrlTree(['/organization/ctg/apostle'], {
    fragment: 'road-ahead',
  });
};

export const engagementAssignmentDetailGuard: CanActivateFn = route => {
  const roles = inject(EngagementDemoRoleService);
  if (!roles.isApostle()) return true;

  const id = route.paramMap.get('id');
  if (!id) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle']);
  }

  return inject(Router).createUrlTree([
    '/organization/ctg/apostle/engagements',
    id,
  ]);
};
