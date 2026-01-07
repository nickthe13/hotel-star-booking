import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../models';
import { STORAGE_KEYS } from '../constants/api.constants';
import { SecureStorageService } from '../security/secure-storage.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { InputSanitizer } from '../security/input-sanitizer';
import { SecurityMessages, SecurityConfig } from '../security/security.config';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUser = signal<User | null>(null);
  private token = signal<string | null>(null);
  private refreshTokenValue = signal<string | null>(null);

  // Public computed signals
  readonly user = computed(() => this.currentUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);

  constructor(
    private http: HttpClient,
    private router: Router,
    private secureStorage: SecureStorageService,
    private rateLimiter: RateLimiterService,
    private logger: LoggerService
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = this.secureStorage.getItem<User>(STORAGE_KEYS.USER);
      const storedToken = this.secureStorage.getItem<string>(STORAGE_KEYS.TOKEN);
      const storedRefreshToken = this.secureStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);

      if (storedUser && storedToken) {
        if (!this.validateUserData(storedUser)) {
          throw new Error('Invalid user data');
        }

        this.currentUser.set(storedUser);
        this.token.set(storedToken);
        this.refreshTokenValue.set(storedRefreshToken);

        // Verify token is still valid by calling /auth/me
        this.verifyToken().subscribe({
          error: () => {
            this.logger.warn('Token verification failed, attempting refresh...');
            this.tryRefreshToken();
          }
        });
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

  private verifyToken(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        this.secureStorage.setItem(STORAGE_KEYS.USER, user);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  private tryRefreshToken(): void {
    const refreshToken = this.refreshTokenValue();
    if (refreshToken) {
      this.refreshToken().subscribe({
        error: () => {
          this.logger.warn('Token refresh failed, logging out...');
          this.logout();
        }
      });
    } else {
      this.logout();
    }
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

      // Make API call to backend
      return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, {
        email: sanitizedEmail,
        password: credentials.password
      }).pipe(
        tap(response => {
          // Reset rate limiter on successful login
          this.rateLimiter.resetLoginAttempts(sanitizedEmail);

          // Map backend response to our User model
          const user: User = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role as UserRole,
            createdAt: new Date(response.user.createdAt)
          };

          this.setAuthData(user, response.tokens.accessToken, response.tokens.refreshToken);
        }),
        catchError((error: HttpErrorResponse) => {
          this.rateLimiter.recordFailedLogin(sanitizedEmail);
          const message = error.error?.message || 'Invalid email or password';
          return throwError(() => new Error(message));
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

      // Make API call to backend
      return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, {
        email: sanitizedEmail,
        name: sanitizedName,
        password: data.password
      }).pipe(
        tap(response => {
          // Map backend response to our User model
          const user: User = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role as UserRole,
            createdAt: new Date(response.user.createdAt)
          };

          this.setAuthData(user, response.tokens.accessToken, response.tokens.refreshToken);
        }),
        catchError((error: HttpErrorResponse) => {
          const message = error.error?.message || 'Registration failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);
    this.refreshTokenValue.set(null);

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

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.refreshTokenValue();

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    }).pipe(
      tap(response => {
        this.token.set(response.tokens.accessToken);
        this.refreshTokenValue.set(response.tokens.refreshToken);
        this.secureStorage.setItem(STORAGE_KEYS.TOKEN, response.tokens.accessToken);
        this.secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.tokens.refreshToken);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  getToken(): string | null {
    return this.token();
  }

  private setAuthData(user: User, token: string, refreshToken?: string): void {
    this.currentUser.set(user);
    this.token.set(token);
    if (refreshToken) {
      this.refreshTokenValue.set(refreshToken);
    }

    // Use secure storage
    this.secureStorage.setItem(STORAGE_KEYS.USER, user);
    this.secureStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (refreshToken) {
      this.secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  // Check if token is expired based on JWT decode (optional enhancement)
  isTokenExpired(): boolean {
    const token = this.token();
    if (!token) return true;

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() > expiry;
    } catch {
      // If we can't decode, assume expired
      return true;
    }
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    // Sanitize inputs
    const sanitizedUpdates = { ...updates };

    if (sanitizedUpdates.name) {
      sanitizedUpdates.name = InputSanitizer.sanitizeString(sanitizedUpdates.name);
    }

    if (sanitizedUpdates.email) {
      sanitizedUpdates.email = InputSanitizer.sanitizeEmail(sanitizedUpdates.email);
    }

    return this.http.patch<User>(`${this.API_URL}/users/profile`, sanitizedUpdates).pipe(
      tap(updatedUser => {
        const user: User = {
          ...updatedUser,
          role: updatedUser.role as UserRole,
          createdAt: new Date(updatedUser.createdAt)
        };

        if (!this.validateUserData(user)) {
          throw new Error('Invalid user data');
        }

        this.currentUser.set(user);
        this.secureStorage.setItem(STORAGE_KEYS.USER, user);
      }),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to update profile';
        return throwError(() => new Error(message));
      })
    );
  }

  // Get current user ID helper
  getCurrentUserId(): string | null {
    return this.currentUser()?.id || null;
  }
}
