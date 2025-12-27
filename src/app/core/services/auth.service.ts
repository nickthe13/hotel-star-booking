import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, delay, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../models';
import { STORAGE_KEYS } from '../constants/api.constants';
import { SecureStorageService } from '../security/secure-storage.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { InputSanitizer } from '../security/input-sanitizer';
import { SecurityMessages, SecurityConfig } from '../security/security.config';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private token = signal<string | null>(null);

  // Public computed signals
  readonly user = computed(() => this.currentUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  constructor(
    private router: Router,
    private secureStorage: SecureStorageService,
    private rateLimiter: RateLimiterService,
    private logger: LoggerService
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      // Use secure storage instead of localStorage
      const storedUser = this.secureStorage.getItem<User>(STORAGE_KEYS.USER);
      const storedToken = this.secureStorage.getItem<string>(STORAGE_KEYS.TOKEN);

      if (storedUser && storedToken) {
        // Validate stored data integrity
        if (!this.validateUserData(storedUser)) {
          throw new Error('Invalid user data');
        }

        this.currentUser.set(storedUser);
        this.token.set(storedToken);

        // Check if token is expired
        if (this.isTokenExpired()) {
          this.logger.warn('Stored token is expired, logging out...');
          this.logout();
        }
      }
    } catch (error) {
      this.logger.error('Error loading user from storage:', error);
      this.logout();
    }
  }

  private validateUserData(user: User): boolean {
    return !!(
      user &&
      user.id &&
      user.email &&
      user.name &&
      user.role
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    try {
      // Sanitize input
      const sanitizedEmail = InputSanitizer.sanitizeEmail(credentials.email);

      // Check rate limiting
      const rateLimitCheck = this.rateLimiter.checkLoginAttempt(sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        return throwError(() => new Error(rateLimitCheck.message || SecurityMessages.accountLocked));
      }

      // Validate password format
      if (!credentials.password || credentials.password.length < SecurityConfig.auth.password.minLength) {
        this.rateLimiter.recordFailedLogin(sanitizedEmail);
        return throwError(() => new Error('Invalid credentials'));
      }

      // Simulate API call
      return of(null).pipe(
        delay(800),
        map(() => {
          // Mock successful login
          if (sanitizedEmail && credentials.password) {
            const user: User = {
              id: '1',
              email: sanitizedEmail,
              name: InputSanitizer.sanitizeString(sanitizedEmail.split('@')[0]),
              role: sanitizedEmail.includes('admin') ? UserRole.ADMIN : UserRole.USER,
              createdAt: new Date()
            };

            const token = this.generateMockToken();
            const refreshToken = this.generateMockToken();

            const authResponse: AuthResponse = {
              user,
              token,
              refreshToken
            };

            // Reset rate limiter on successful login
            this.rateLimiter.resetLoginAttempts(sanitizedEmail);

            this.setAuthData(user, token);
            return authResponse;
          }

          // Record failed login
          this.rateLimiter.recordFailedLogin(sanitizedEmail);
          throw new Error('Invalid credentials');
        }),
        catchError(error => {
          // Record failed login on error
          this.rateLimiter.recordFailedLogin(sanitizedEmail);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    try {
      // Sanitize input
      const sanitizedEmail = InputSanitizer.sanitizeEmail(data.email);
      const sanitizedName = InputSanitizer.sanitizeString(data.name);

      // Validate password strength
      const passwordValidation = InputSanitizer.validatePassword(data.password);
      if (!passwordValidation.valid) {
        return throwError(() => new Error(passwordValidation.errors.join('. ')));
      }

      // Simulate API call
      return of(null).pipe(
        delay(800),
        map(() => {
          // Check if user already exists (mock)
          const existingUser = this.secureStorage.getItem<any>(`user_${sanitizedEmail}`);
          if (existingUser) {
            throw new Error('User already exists');
          }

          const user: User = {
            id: Date.now().toString(),
            email: sanitizedEmail,
            name: sanitizedName,
            role: UserRole.USER,
            createdAt: new Date()
          };

          const token = this.generateMockToken();
          const refreshToken = this.generateMockToken();

          const authResponse: AuthResponse = {
            user,
            token,
            refreshToken
          };

          // Store user in mock database using secure storage
          this.secureStorage.setItem(`user_${sanitizedEmail}`, { ...data, user });

          this.setAuthData(user, token);
          return authResponse;
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);

    // Clear secure storage
    if (SecurityConfig.dataProtection.clearDataOnLogout) {
      this.secureStorage.removeItem(STORAGE_KEYS.USER);
      this.secureStorage.removeItem(STORAGE_KEYS.TOKEN);
      this.secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    // Also clear any legacy localStorage entries
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

    this.router.navigate(['/home']);
  }

  refreshToken(): Observable<string> {
    // Simulate token refresh
    return of(this.generateMockToken()).pipe(
      delay(300),
      map(newToken => {
        this.token.set(newToken);
        this.secureStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
        return newToken;
      })
    );
  }

  getToken(): string | null {
    return this.token();
  }

  private setAuthData(user: User, token: string): void {
    this.currentUser.set(user);
    this.token.set(token);

    // Use secure storage
    this.secureStorage.setItem(STORAGE_KEYS.USER, user);
    this.secureStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  private generateMockToken(): string {
    return 'mock_jwt_token_' + Math.random().toString(36).substring(7) + '_' + Date.now();
  }

  // Check if token is expired (mock implementation)
  isTokenExpired(): boolean {
    const token = this.token();
    if (!token) return true;

    // Mock: tokens expire after 1 hour
    const tokenParts = token.split('_');
    const timestamp = parseInt(tokenParts[tokenParts.length - 1]);
    const expiryTime = timestamp + 3600000; // 1 hour

    return Date.now() > expiryTime;
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const currentUser = this.currentUser();
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        // Sanitize inputs
        const sanitizedUpdates = { ...updates };

        if (sanitizedUpdates.name) {
          sanitizedUpdates.name = InputSanitizer.sanitizeString(sanitizedUpdates.name);
        }

        if (sanitizedUpdates.email) {
          sanitizedUpdates.email = InputSanitizer.sanitizeEmail(sanitizedUpdates.email);
        }

        const updatedUser = { ...currentUser, ...sanitizedUpdates };

        // Validate updated user data
        if (!this.validateUserData(updatedUser)) {
          throw new Error('Invalid user data');
        }

        this.currentUser.set(updatedUser);
        this.secureStorage.setItem(STORAGE_KEYS.USER, updatedUser);

        return updatedUser;
      })
    );
  }
}
