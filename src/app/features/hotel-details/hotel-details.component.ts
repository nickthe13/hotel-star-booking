import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HotelService } from '../../core/services/hotel.service';
import { Hotel } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-hotel-details',
  imports: [CommonModule, RouterLink, LoaderComponent],
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit {
  @Input() id!: string;

  hotel = signal<Hotel | undefined>(undefined);
  loading = signal<boolean>(true);
  selectedImageIndex = signal<number>(0);

  constructor(private hotelService: HotelService, private router: Router) {}

  ngOnInit(): void {
    if (this.id) {
      this.loadHotel();
    }
  }

  private loadHotel(): void {
    this.loading.set(true);
    this.hotelService.getHotelById(this.id).subscribe({
      next: (hotel) => {
        this.hotel.set(hotel);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/hotels']);
      }
    });
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  bookNow(): void {
    if (this.hotel()) {
      this.router.navigate(['/booking', this.hotel()!.id]);
    }
  }
}
