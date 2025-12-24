import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HotelService } from '../../../core/services/hotel.service';
import { Hotel } from '../../../core/models';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TableColumn, TableAction } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-hotels',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    ModalComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './admin-hotels.component.html',
  styleUrl: './admin-hotels.component.scss'
})
export class AdminHotelsComponent implements OnInit {
  hotels = signal<Hotel[]>([]);
  loading = signal<boolean>(false);
  showHotelModal = signal<boolean>(false);
  showDeleteDialog = signal<boolean>(false);
  selectedHotel = signal<Hotel | null>(null);
  isEditMode = signal<boolean>(false);

  hotelForm!: FormGroup;

  columns: TableColumn<Hotel>[] = [
    { key: 'name', label: 'Hotel Name', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'location', label: 'Location', sortable: false },
    { key: 'starRating', label: 'Stars', sortable: true },
    {
      key: 'pricePerNight',
      label: 'Price/Night',
      sortable: true,
      render: (hotel: Hotel) => `$${hotel.pricePerNight}`
    },
    {
      key: 'rooms',
      label: 'Rooms',
      sortable: false,
      render: (hotel: Hotel) => hotel.rooms?.length.toString() || '0'
    },
    {
      key: 'featured',
      label: 'Featured',
      sortable: true,
      render: (hotel: Hotel) => hotel.featured ? '⭐' : ''
    }
  ];

  actions: TableAction<Hotel>[] = [
    {
      label: 'Edit',
      icon: '✏️',
      onClick: (hotel: Hotel) => this.openEditModal(hotel),
      variant: 'primary'
    },
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: (hotel: Hotel) => this.openDeleteDialog(hotel),
      variant: 'danger'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadHotels();
  }

  initForm(): void {
    this.hotelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      location: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      starRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      pricePerNight: [0, [Validators.required, Validators.min(1)]],
      images: this.fb.array([this.createImageControl()]),
      amenities: this.fb.array([this.createAmenityControl()]),
      featured: [false]
    });
  }

  createImageControl(): FormGroup {
    return this.fb.group({
      url: ['', [Validators.required, Validators.pattern('https?://.+')]]
    });
  }

  createAmenityControl(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required]
    });
  }

  get images(): FormArray {
    return this.hotelForm.get('images') as FormArray;
  }

  get amenities(): FormArray {
    return this.hotelForm.get('amenities') as FormArray;
  }

  addImage(): void {
    this.images.push(this.createImageControl());
  }

  removeImage(index: number): void {
    if (this.images.length > 1) {
      this.images.removeAt(index);
    }
  }

  addAmenity(): void {
    this.amenities.push(this.createAmenityControl());
  }

  removeAmenity(index: number): void {
    if (this.amenities.length > 1) {
      this.amenities.removeAt(index);
    }
  }

  loadHotels(): void {
    this.loading.set(true);
    this.hotelService.getHotels().subscribe({
      next: (hotels) => {
        this.hotels.set(hotels);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading hotels:', error);
        this.loading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedHotel.set(null);
    this.hotelForm.reset({
      starRating: 5,
      pricePerNight: 0,
      featured: false
    });

    // Reset arrays
    while (this.images.length > 1) {
      this.images.removeAt(1);
    }
    while (this.amenities.length > 1) {
      this.amenities.removeAt(1);
    }

    this.showHotelModal.set(true);
  }

  openEditModal(hotel: Hotel): void {
    this.isEditMode.set(true);
    this.selectedHotel.set(hotel);

    // Reset arrays first
    while (this.images.length > 0) {
      this.images.removeAt(0);
    }
    while (this.amenities.length > 0) {
      this.amenities.removeAt(0);
    }

    // Populate form
    this.hotelForm.patchValue({
      name: hotel.name,
      description: hotel.description,
      location: hotel.location,
      city: hotel.city,
      country: hotel.country,
      starRating: hotel.starRating,
      pricePerNight: hotel.pricePerNight,
      featured: hotel.featured || false
    });

    // Add images
    if (hotel.images && hotel.images.length > 0) {
      hotel.images.forEach(img => {
        this.images.push(this.fb.group({ url: [img, [Validators.required, Validators.pattern('https?://.+')]] }));
      });
    } else {
      this.images.push(this.createImageControl());
    }

    // Add amenities
    if (hotel.amenities && hotel.amenities.length > 0) {
      hotel.amenities.forEach(amenity => {
        this.amenities.push(this.fb.group({ name: [amenity, Validators.required] }));
      });
    } else {
      this.amenities.push(this.createAmenityControl());
    }

    this.showHotelModal.set(true);
  }

  openDeleteDialog(hotel: Hotel): void {
    this.selectedHotel.set(hotel);
    this.showDeleteDialog.set(true);
  }

  closeModal(): void {
    this.showHotelModal.set(false);
    this.selectedHotel.set(null);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedHotel.set(null);
  }

  saveHotel(): void {
    if (this.hotelForm.invalid) {
      Object.keys(this.hotelForm.controls).forEach(key => {
        this.hotelForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.hotelForm.value;
    const hotelData = {
      ...formValue,
      images: formValue.images.map((img: any) => img.url).filter((url: string) => url),
      amenities: formValue.amenities.map((amenity: any) => amenity.name).filter((name: string) => name)
    };

    if (this.isEditMode() && this.selectedHotel()) {
      // Update existing hotel
      this.hotelService.updateHotel(this.selectedHotel()!.id, hotelData).subscribe({
        next: () => {
          this.loadHotels();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating hotel:', error);
        }
      });
    } else {
      // Add new hotel
      this.hotelService.addHotel(hotelData).subscribe({
        next: () => {
          this.loadHotels();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error adding hotel:', error);
        }
      });
    }
  }

  confirmDelete(): void {
    const hotel = this.selectedHotel();
    if (!hotel) return;

    this.hotelService.deleteHotel(hotel.id).subscribe({
      next: () => {
        this.loadHotels();
        this.closeDeleteDialog();
      },
      error: (error) => {
        console.error('Error deleting hotel:', error);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.hotelForm.get(fieldName);
    if (!field || !field.touched || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return 'This field is required';
    }
    if (field.errors['minlength']) {
      return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    if (field.errors['min']) {
      return `Minimum value is ${field.errors['min'].min}`;
    }
    if (field.errors['max']) {
      return `Maximum value is ${field.errors['max'].max}`;
    }
    if (field.errors['pattern']) {
      return 'Invalid format';
    }

    return '';
  }
}
