import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { installPlatformOverlayScrollLock } from './platform-overlay-scroll-lock';
import { installProfileAppearance } from './profile-appearance';

installProfileAppearance();
installPlatformOverlayScrollLock();
bootstrapApplication(App, appConfig).catch((error) => console.error(error));
