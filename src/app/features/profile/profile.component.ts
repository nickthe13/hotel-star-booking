import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Hotel } from '../../core/models';
import { PaymentHistoryComponent } from './payment-history/payment-history.component';
import { SavedPaymentMethodsComponent } from './saved-payment-methods/saved-payment-methods.component';
import { LoyaltyCardComponent } from '../../shared/components/loyalty-card/loyalty-card.component';
import { LoyaltyHistoryComponent } from '../../shared/components/loyalty-history/loyalty-history.component';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { passwordMatchValidator } from '../../shared/utils/form-validators';

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
    FormatDatePipe,
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
    private route: ActivatedRoute,
    public authService: AuthService,
    private favoritesService: FavoritesService
  ) {
    this.user = authService.user;
    this.initForms();
  }

  ngOnInit(): void {
    this.loadFavorites();
    this.populateProfileForm();

    // Check for tab query parameter
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as ProfileTab;
      if (tab && ['profile', 'payment-methods', 'payment-history', 'loyalty'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });
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
    }, { validators: passwordMatchValidator });
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

    const updates = { name: this.profileForm.value.name };

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
    this.favoritesService.loadFavorites().subscribe({
      next: (hotels) => {
        this.favoriteHotels.set(hotels);
        this.loadingFavorites.set(false);
      },
      error: () => {
        this.loadingFavorites.set(false);
      }
    });
  }

  removeFavorite(hotelId: string): void {
    this.favoritesService.removeFromFavorites(hotelId).subscribe({
      next: () => {
        this.favoriteHotels.set(this.favoriteHotels().filter(hotel => hotel.id !== hotelId));
      },
      error: (err) => {
        console.error('Error removing favorite:', err);
      }
    });
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

  setActiveTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }
}
