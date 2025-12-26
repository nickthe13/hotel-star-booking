import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminHotelsComponent } from './admin-hotels/admin-hotels.component';
import { AdminRoomsComponent } from './admin-rooms/admin-rooms.component';
import { AdminBookingsComponent } from './admin-bookings/admin-bookings.component';

type AdminTab = 'dashboard' | 'hotels' | 'rooms' | 'bookings';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    AdminDashboardComponent,
    AdminHotelsComponent,
    AdminRoomsComponent,
    AdminBookingsComponent
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  activeTab = signal<AdminTab>('dashboard');

  selectTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }

  isActiveTab(tab: AdminTab): boolean {
    return this.activeTab() === tab;
  }
}
