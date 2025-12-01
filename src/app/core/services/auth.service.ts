import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, delay, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, AuthResponse, LoginRequest, RegisterRequest, UserRole } from '../models';
import { STORAGE_KEYS } from '../constants/api.constants';

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

  constructor(private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (storedUser && storedToken) {
      try {
        this.currentUser.set(JSON.parse(storedUser));
        this.token.set(storedToken);
      } catch (error) {
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    // Simulate API call
    return of(null).pipe(
      delay(800),
      map(() => {
        // Mock successful login
        if (credentials.email && credentials.password) {
          const user: User = {
            id: '1',
            email: credentials.email,
            name: credentials.email.split('@')[0],
            role: credentials.email.includes('admin') ? UserRole.ADMIN : UserRole.USER,
            createdAt: new Date()
          };

          const token = this.generateMockToken();
          const refreshToken = this.generateMockToken();

          const authResponse: AuthResponse = {
            user,
            token,
            refreshToken
          };

          this.setAuthData(user, token);
          return authResponse;
        }

        throw new Error('Invalid credentials');
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    // Simulate API call
    return of(null).pipe(
      delay(800),
      map(() => {
        // Check if user already exists (mock)
        const existingUser = localStorage.getItem(`user_${data.email}`);
        if (existingUser) {
          throw new Error('User already exists');
        }

        const user: User = {
          id: Date.now().toString(),
          email: data.email,
          name: data.name,
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

        // Store user in mock database
        localStorage.setItem(`user_${data.email}`, JSON.stringify({ ...data, user }));

        this.setAuthData(user, token);
        return authResponse;
      })
    );
  }

  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);
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
        localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
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
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
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

        const updatedUser = { ...currentUser, ...updates };
        this.currentUser.set(updatedUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

        return updatedUser;
      })
    );
  }
}
