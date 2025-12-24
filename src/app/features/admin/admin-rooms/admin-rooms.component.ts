import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HotelService } from '../../../core/services/hotel.service';
import { Hotel, Room } from '../../../core/models';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TableColumn, TableAction } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-rooms',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    ModalComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './admin-rooms.component.html',
  styleUrl: './admin-rooms.component.scss'
})
export class AdminRoomsComponent implements OnInit {
  hotels = signal<Hotel[]>([]);
  selectedHotelId = signal<string>('');
  loading = signal<boolean>(false);
  showRoomModal = signal<boolean>(false);
  showDeleteDialog = signal<boolean>(false);
  selectedRoom = signal<Room | null>(null);
  isEditMode = signal<boolean>(false);

  roomForm!: FormGroup;

  selectedHotel = computed(() => {
    const hotelId = this.selectedHotelId();
    return this.hotels().find(h => h.id === hotelId);
  });

  rooms = computed<Room[]>(() => {
    const hotel = this.selectedHotel();
    return hotel?.rooms || [];
  });

  columns: TableColumn<Room>[] = [
    { key: 'roomType', label: 'Room Type', sortable: true },
    { key: 'capacity', label: 'Capacity', sortable: true },
    {
      key: 'pricePerNight',
      label: 'Price/Night',
      sortable: true,
      render: (room: Room) => `$${room.pricePerNight}`
    },
    {
      key: 'amenities',
      label: 'Amenities',
      sortable: false,
      render: (room: Room) => room.amenities?.slice(0, 2).join(', ') || 'None'
    },
    {
      key: 'available',
      label: 'Status',
      sortable: true,
      render: (room: Room) => room.available ? '✅ Available' : '❌ Unavailable'
    }
  ];

  actions: TableAction<Room>[] = [
    {
      label: 'Toggle',
      icon: '🔄',
      onClick: (room: Room) => this.toggleAvailability(room),
      variant: 'secondary'
    },
    {
      label: 'Edit',
      icon: '✏️',
      onClick: (room: Room) => this.openEditModal(room),
      variant: 'primary'
    },
    {
      label: 'Delete',
      icon: '🗑️',
      onClick: (room: Room) => this.openDeleteDialog(room),
      variant: 'danger'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService
  ) {
    this.initForm();

    // Auto-load rooms when hotel selection changes
    effect(() => {
      const hotelId = this.selectedHotelId();
      if (hotelId) {
        console.log('Selected hotel changed:', hotelId);
      }
    });
  }

  ngOnInit(): void {
    this.loadHotels();
  }

  initForm(): void {
    this.roomForm = this.fb.group({
      roomType: ['', [Validators.required, Validators.minLength(3)]],
      capacity: [2, [Validators.required, Validators.min(1)]],
      pricePerNight: [0, [Validators.required, Validators.min(1)]],
      images: this.fb.array([this.createImageControl()]),
      amenities: this.fb.array([this.createAmenityControl()]),
      available: [true]
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
    return this.roomForm.get('images') as FormArray;
  }

  get amenities(): FormArray {
    return this.roomForm.get('amenities') as FormArray;
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
        if (hotels.length > 0 && !this.selectedHotelId()) {
          this.selectedHotelId.set(hotels[0].id);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading hotels:', error);
        this.loading.set(false);
      }
    });
  }

  onHotelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedHotelId.set(select.value);
  }

  openAddModal(): void {
    if (!this.selectedHotelId()) {
      alert('Please select a hotel first');
      return;
    }

    this.isEditMode.set(false);
    this.selectedRoom.set(null);
    this.roomForm.reset({
      capacity: 2,
      pricePerNight: 0,
      available: true
    });

    // Reset arrays
    while (this.images.length > 1) {
      this.images.removeAt(1);
    }
    while (this.amenities.length > 1) {
      this.amenities.removeAt(1);
    }

    this.showRoomModal.set(true);
  }

  openEditModal(room: Room): void {
    this.isEditMode.set(true);
    this.selectedRoom.set(room);

    // Reset arrays first
    while (this.images.length > 0) {
      this.images.removeAt(0);
    }
    while (this.amenities.length > 0) {
      this.amenities.removeAt(0);
    }

    // Populate form
    this.roomForm.patchValue({
      roomType: room.roomType,
      capacity: room.capacity,
      pricePerNight: room.pricePerNight,
      available: room.available
    });

    // Add images
    if (room.images && room.images.length > 0) {
      room.images.forEach(img => {
        this.images.push(this.fb.group({ url: [img, [Validators.required, Validators.pattern('https?://.+')]] }));
      });
    } else {
      this.images.push(this.createImageControl());
    }

    // Add amenities
    if (room.amenities && room.amenities.length > 0) {
      room.amenities.forEach(amenity => {
        this.amenities.push(this.fb.group({ name: [amenity, Validators.required] }));
      });
    } else {
      this.amenities.push(this.createAmenityControl());
    }

    this.showRoomModal.set(true);
  }

  openDeleteDialog(room: Room): void {
    this.selectedRoom.set(room);
    this.showDeleteDialog.set(true);
  }

  closeModal(): void {
    this.showRoomModal.set(false);
    this.selectedRoom.set(null);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedRoom.set(null);
  }

  saveRoom(): void {
    if (this.roomForm.invalid) {
      Object.keys(this.roomForm.controls).forEach(key => {
        this.roomForm.get(key)?.markAsTouched();
      });
      return;
    }

    const hotelId = this.selectedHotelId();
    if (!hotelId) {
      alert('Please select a hotel');
      return;
    }

    const formValue = this.roomForm.value;
    const roomData = {
      ...formValue,
      images: formValue.images.map((img: any) => img.url).filter((url: string) => url),
      amenities: formValue.amenities.map((amenity: any) => amenity.name).filter((name: string) => name)
    };

    if (this.isEditMode() && this.selectedRoom()) {
      // Update existing room
      this.hotelService.updateRoom(hotelId, this.selectedRoom()!.id, roomData).subscribe({
        next: () => {
          this.loadHotels();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating room:', error);
        }
      });
    } else {
      // Add new room
      this.hotelService.addRoom(hotelId, roomData).subscribe({
        next: () => {
          this.loadHotels();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error adding room:', error);
        }
      });
    }
  }

  confirmDelete(): void {
    const room = this.selectedRoom();
    const hotelId = this.selectedHotelId();
    if (!room || !hotelId) return;

    this.hotelService.deleteRoom(hotelId, room.id).subscribe({
      next: () => {
        this.loadHotels();
        this.closeDeleteDialog();
      },
      error: (error) => {
        console.error('Error deleting room:', error);
      }
    });
  }

  toggleAvailability(room: Room): void {
    const hotelId = this.selectedHotelId();
    if (!hotelId) return;

    this.hotelService.toggleRoomAvailability(hotelId, room.id).subscribe({
      next: () => {
        this.loadHotels();
      },
      error: (error) => {
        console.error('Error toggling room availability:', error);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.roomForm.get(fieldName);
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
    if (field.errors['pattern']) {
      return 'Invalid format';
    }

    return '';
  }
}
