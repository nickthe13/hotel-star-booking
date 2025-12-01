import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'hotels',
    loadComponent: () =>
      import('./features/hotels/hotels.component').then((m) => m.HotelsComponent)
  },
  {
    path: 'hotels/:id',
    loadComponent: () =>
      import('./features/hotel-details/hotel-details.component').then(
        (m) => m.HotelDetailsComponent
      )
  },
  {
    path: 'booking/:hotelId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/booking/booking.component').then((m) => m.BookingComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
