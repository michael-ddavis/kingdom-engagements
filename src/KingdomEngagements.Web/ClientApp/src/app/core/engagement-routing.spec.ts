import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { EngagementDemoRoleService, engagementBookingGuard, engagementDirectorGuard } from './engagement-demo-role.service';
import { engagementAssignmentDetailGuard, engagementAssignmentListGuard } from './engagement-apostle-route.guards';

describe('Engagement session permissions and routing', () => {
  let roles: EngagementDemoRoleService;
  let session: Record<string, unknown>;

  beforeEach(() => {
    session = { role: 'minister', canManageBookings: false, canManageAssignments: false };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), {
        provide: HttpClient,
        useValue: { get: () => of(session) },
      }],
    });
    roles = TestBed.inject(EngagementDemoRoleService);
  });

  const state = {} as RouterStateSnapshot;
  const route = (id?: string) => ({ paramMap: convertToParamMap(id ? { id } : {}) }) as ActivatedRouteSnapshot;
  const url = (value: unknown) => TestBed.inject(Router).serializeUrl(value as UrlTree);

  it('denies management capabilities before a session is loaded', () => {
    expect(roles.canManageBookings()).toBe(false);
    expect(roles.canManageAssignments()).toBe(false);
    expect(roles.canViewFinancials()).toBe(false);
    expect(roles.canViewInternalNotes()).toBe(false);
    expect(roles.canCompleteEngagements()).toBe(false);
  });

  it('routes executives to their read-only assignment brief', async () => {
    session['role'] = 'apostle';
    await roles.initialize();
    expect(url(TestBed.runInInjectionContext(() => engagementAssignmentDetailGuard(route('assignment-123'), state))))
      .toBe('/organization/ctg/apostle/engagements/assignment-123');
    expect(url(TestBed.runInInjectionContext(() => engagementAssignmentListGuard(route(), state))))
      .toBe('/organization/ctg/apostle#road-ahead');
    expect(url(TestBed.runInInjectionContext(() => engagementBookingGuard(route(), state))))
      .toBe('/organization/ctg/apostle');
  });

  it('routes team members to their workspace and away from management screens', async () => {
    await roles.initialize();
    expect(url(TestBed.runInInjectionContext(() => engagementAssignmentDetailGuard(route('assignment-123'), state))))
      .toBe('/organization/ctg/engagements/assignment-123');
    expect(url(TestBed.runInInjectionContext(() => engagementDirectorGuard(route(), state))))
      .toBe('/organization/ctg/engagements');
  });

  it('uses server capabilities rather than the administrator label for management access', async () => {
    session['role'] = 'administrator';
    await roles.initialize();
    expect(TestBed.runInInjectionContext(() => engagementBookingGuard(route(), state))).not.toBe(true);
    expect(TestBed.runInInjectionContext(() => engagementDirectorGuard(route(), state))).not.toBe(true);
  });

  it('allows booking and director routes when the server grants those capabilities', async () => {
    session['canManageBookings'] = true;
    session['canManageAssignments'] = true;
    await roles.initialize();
    expect(TestBed.runInInjectionContext(() => engagementBookingGuard(route(), state))).toBe(true);
    expect(TestBed.runInInjectionContext(() => engagementDirectorGuard(route(), state))).toBe(true);
  });

  it('handles missing assignment IDs without creating an invalid detail URL', async () => {
    await roles.initialize();
    expect(url(TestBed.runInInjectionContext(() => engagementAssignmentDetailGuard(route(), state))))
      .toBe('/assignments');
  });
});
