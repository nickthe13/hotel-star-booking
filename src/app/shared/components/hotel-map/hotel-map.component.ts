import { Component, input, ElementRef, viewChild, afterNextRender, OnDestroy } from '@angular/core';
import type * as L from 'leaflet';

@Component({
  selector: 'app-hotel-map',
  template: `<div #mapContainer class="hotel-map__container"></div>`,
  styleUrl: './hotel-map.component.scss'
})
export class HotelMapComponent implements OnDestroy {
  latitude = input.required<number>();
  longitude = input.required<number>();
  hotelName = input<string>('');
  zoom = input<number>(15);

  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map: L.Map | null = null;

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    const L = await import('leaflet');

    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.map = L.map(this.mapContainer().nativeElement).setView(
      [this.latitude(), this.longitude()],
      this.zoom()
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    L.marker([this.latitude(), this.longitude()], { icon: iconDefault })
      .addTo(this.map)
      .bindPopup(`
        <strong>${this.hotelName()}</strong><br>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${this.latitude()},${this.longitude()}"
           target="_blank" rel="noopener noreferrer"
           style="color: #1a73e8; text-decoration: none; font-size: 13px;">
           Get Directions ↗
        </a>
      `)
      .openPopup();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
