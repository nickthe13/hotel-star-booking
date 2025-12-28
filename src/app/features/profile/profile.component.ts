import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { HotelService } from '../../core/services/hotel.service';
import { User } from '../../core/models/user.model';
import { Hotel } from '../../core/models';
import { PaymentHistoryComponent } from './payment-history/payment-history.component';
import { SavedPaymentMethodsComponent } from './saved-payment-methods/saved-payment-methods.component';
import { LoyaltyCardComponent } from '../../shared/components/loyalty-card/loyalty-card.component';
import { LoyaltyHistoryComponent } from '../../shared/components/loyalty-history/loyalty-history.component';

type ProfileTab = 'profile' | 'payment-methods' | 'payment-history' | 'loyalty';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaymentHistoryComponent,
    SavedPaymentMethodsComponent,
    LoyaltyCardComponent,
    LoyaltyHistoryComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user;

  // Tab navigation
  activeTab = signal<ProfileTab>('profile');

  isEditingProfile = signal<boolean>(false);
  isEditingAvatar = signal<boolean>(false);
  isChangingPassword = signal<boolean>(false);

  profileForm!: FormGroup;
  avatarForm!: FormGroup;
  passwordForm!: FormGroup;

  favoriteHotels = signal<Hotel[]>([]);
  loadingFavorites = signal<boolean>(false);

  updateSuccess = signal<boolean>(false);
  updateError = signal<string>('');

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private bookingService: BookingService,
    private hotelService: HotelService
  ) {
    this.user = authService.user;
    this.initForms();
  }

  ngOnInit(): void {
    this.loadFavorites();
    this.populateProfileForm();
  }

  initForms(): void {
    // Profile Form
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });

    // Avatar Form
    this.avatarForm = this.fb.group({
      avatar: ['', [Validators.pattern('https?://.+')]]
    });

    // Password Form
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  populateProfileForm(): void {
    const user = this.user();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        email: user.email
      });

      if (user.avatar) {
        this.avatarForm.patchValue({
          avatar: user.avatar
        });
      }
    }
  }

  toggleEditProfile(): void {
    this.isEditingProfile.set(!this.isEditingProfile());
    if (this.isEditingProfile()) {
      this.populateProfileForm();
    }
  }

  toggleEditAvatar(): void {
    this.isEditingAvatar.set(!this.isEditingAvatar());
  }

  toggleChangePassword(): void {
    this.isChangingPassword.set(!this.isChangingPassword());
    if (!this.isChangingPassword()) {
      this.passwordForm.reset();
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    const updates = this.profileForm.value;

    this.authService.updateProfile(updates).subscribe({
      next: () => {
        this.updateSuccess.set(true);
        this.isEditingProfile.set(false);
        setTimeout(() => this.updateSuccess.set(false), 3000);
      },
      error: (error) => {
        this.updateError.set('Failed to update profile. Please try again.');
        setTimeout(() => this.updateError.set(''), 3000);
      }
    });
  }

  saveAvatar(): void {
    if (this.avatarForm.invalid) {
      this.avatarForm.get('avatar')?.markAsTouched();
      return;
    }

    const avatar = this.avatarForm.value.avatar || '';

    this.authService.updateProfile({ avatar }).subscribe({
      next: () => {
        this.updateSuccess.set(true);
        this.isEditingAvatar.set(false);
        setTimeout(() => this.updateSuccess.set(false), 3000);
      },
      error: (error) => {
        this.updateError.set('Failed to update avatar. Please try again.');
        setTimeout(() => this.updateError.set(''), 3000);
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    // In a real app, this would call an API endpoint to change the password
    // For now, we'll simulate success
    setTimeout(() => {
      this.updateSuccess.set(true);
      this.isChangingPassword.set(false);
      this.passwordForm.reset();
      setTimeout(() => this.updateSuccess.set(false), 3000);
    }, 500);
  }

  loadFavorites(): void {
    this.loadingFavorites.set(true);

    // Load favorite hotel IDs from localStorage
    const favoritesKey = 'user_favorites';
    const storedFavorites = localStorage.getItem(favoritesKey);

    if (storedFavorites) {
      try {
        const favoriteIds: string[] = JSON.parse(storedFavorites);

        // Load hotel details for each favorite
        this.hotelService.getHotels().subscribe({
          next: (hotels) => {
            const favorites = hotels.filter(hotel => favoriteIds.includes(hotel.id));
            this.favoriteHotels.set(favorites);
            this.loadingFavorites.set(false);
          },
          error: () => {
            this.loadingFavorites.set(false);
          }
        });
      } catch (error) {
        this.loadingFavorites.set(false);
      }
    } else {
      this.loadingFavorites.set(false);
    }
  }

  removeFavorite(hotelId: string): void {
    const favoritesKey = 'user_favorites';
    const storedFavorites = localStorage.getItem(favoritesKey);

    if (storedFavorites) {
      try {
        let favoriteIds: string[] = JSON.parse(storedFavorites);
        favoriteIds = favoriteIds.filter(id => id !== hotelId);
        localStorage.setItem(favoritesKey, JSON.stringify(favoriteIds));

        // Update the displayed favorites
        this.favoriteHotels.set(this.favoriteHotels().filter(hotel => hotel.id !== hotelId));
      } catch (error) {
        console.error('Error removing favorite:', error);
      }
    }
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (!field || !field.touched || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return 'This field is required';
    }
    if (field.errors['minlength']) {
      return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    if (field.errors['email']) {
      return 'Please enter a valid email';
    }
    if (field.errors['pattern']) {
      return 'Please enter a valid URL';
    }
    if (field.errors['passwordMismatch']) {
      return 'Passwords do not match';
    }

    return '';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  setActiveTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }
}
