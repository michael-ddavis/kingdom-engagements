import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EngagementDemoRoleService } from './engagement-demo-role.service';

export const engagementAssignmentListGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);

  if (roles.isApostle()) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle'], {
      fragment: 'road-ahead',
    });
  }

  return inject(Router).createUrlTree(['/organization/ctg/engagements']);
};

export const engagementAssignmentDetailGuard: CanActivateFn = route => {
  const roles = inject(EngagementDemoRoleService);
  const id = route.paramMap.get('id');

  if (!id) {
    return roles.isApostle()
      ? inject(Router).createUrlTree(['/organization/ctg/apostle'])
      : inject(Router).createUrlTree(['/assignments']);
  }

  if (roles.isApostle()) {
    return inject(Router).createUrlTree([
      '/organization/ctg/apostle/engagements',
      id,
    ]);
  }

  return inject(Router).createUrlTree([
    '/organization/ctg/engagements',
    id,
  ]);
};
