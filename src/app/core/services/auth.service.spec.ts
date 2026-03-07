import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SecureStorageService } from '../security/secure-storage.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { LoggerService } from './logger.service';
import { InputSanitizer } from '../security/input-sanitizer';
import { UserRole } from '../models';
import { STORAGE_KEYS } from '../constants/api.constants';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let secureStorageSpy: jasmine.SpyObj<SecureStorageService>;
  let rateLimiterSpy: jasmine.SpyObj<RateLimiterService>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  function createTestJwt(payload: object): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fake-signature`;
  }

  const mockUser = {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as UserRole,
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const mockAuthResponse = {
    user: mockUser,
    tokens: {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 3600
    }
  };

  function setupWithNoStoredUser(): void {
    secureStorageSpy.getItem.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: SecureStorageService, useValue: secureStorageSpy },
        { provide: RateLimiterService, useValue: rateLimiterSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  }

  function setupWithStoredUser(): void {
        (secureStorageSpy.getItem as jasmine.Spy).and.callFake((key: string) => {
      if (key === STORAGE_KEYS.USER) return mockUser;
      if (key === STORAGE_KEYS.TOKEN) return 'stored-token';
      if (key === STORAGE_KEYS.REFRESH_TOKEN) return 'stored-refresh-token';
      return null;
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: SecureStorageService, useValue: secureStorageSpy },
        { provide: RateLimiterService, useValue: rateLimiterSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    secureStorageSpy = jasmine.createSpyObj('SecureStorageService', ['getItem', 'setItem', 'removeItem']);
    rateLimiterSpy = jasmine.createSpyObj('RateLimiterService', ['checkLoginAttempt', 'recordFailedLogin', 'resetLoginAttempts']);
    loggerSpy = jasmine.createSpyObj('LoggerService', ['log', 'warn', 'error', 'debug']);

    // Default rate limiter allows all
    rateLimiterSpy.checkLoginAttempt.and.returnValue({ allowed: true });
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- Constructor / loadUserFromStorage ---

  describe('constructor with no stored user', () => {
    beforeEach(() => setupWithNoStoredUser());

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not be authenticated', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should have null user', () => {
      expect(service.user()).toBeNull();
    });

    it('should not make any HTTP calls', () => {
      httpMock.expectNone(() => true);
    });
  });

  describe('constructor with stored user', () => {
    beforeEach(() => setupWithStoredUser());

    it('should set user from storage', () => {
      // Constructor fires /auth/me to verify
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);

      expect(service.isAuthenticated()).toBeTrue();
      expect(service.user()?.email).toBe('test@example.com');
    });

    it('should call /auth/me to verify token', () => {
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should attempt refresh when /auth/me fails', () => {
      const meReq = httpMock.expectOne(r => r.url.includes('/auth/me'));
      meReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Should try /auth/refresh since stored refresh token exists
      const refreshReq = httpMock.expectOne(r => r.url.includes('/auth/refresh'));
      refreshReq.flush(mockAuthResponse);
    });

    it('should logout when /auth/me fails and no refresh token', () => {
      // Flush the /auth/me from setupWithStoredUser beforeEach
      const initialMeReq = httpMock.expectOne(r => r.url.includes('/auth/me'));
      initialMeReq.flush(mockUser);
      httpMock.verify();

      // Now reset and reconfigure with no refresh token
      TestBed.resetTestingModule();

      routerSpy = jasmine.createSpyObj('Router', ['navigate']);
      secureStorageSpy = jasmine.createSpyObj('SecureStorageService', ['getItem', 'setItem', 'removeItem']);
      rateLimiterSpy = jasmine.createSpyObj('RateLimiterService', ['checkLoginAttempt', 'recordFailedLogin', 'resetLoginAttempts']);
      loggerSpy = jasmine.createSpyObj('LoggerService', ['log', 'warn', 'error', 'debug']);
      rateLimiterSpy.checkLoginAttempt.and.returnValue({ allowed: true });

      (secureStorageSpy.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === STORAGE_KEYS.USER) return mockUser;
        if (key === STORAGE_KEYS.TOKEN) return 'stored-token';
        return null; // no refresh token
      });

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AuthService,
          { provide: Router, useValue: routerSpy },
          { provide: SecureStorageService, useValue: secureStorageSpy },
          { provide: RateLimiterService, useValue: rateLimiterSpy },
          { provide: LoggerService, useValue: loggerSpy }
        ]
      });

      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);

      const meReq = httpMock.expectOne(r => r.url.includes('/auth/me'));
      meReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      // No refresh token → should have called logout → navigate to /home
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('constructor with invalid stored user', () => {
    it('should logout when stored user is missing required fields', () => {
          (secureStorageSpy.getItem as jasmine.Spy).and.callFake((key: string) => {
        if (key === STORAGE_KEYS.USER) return { id: 'u1' }; // missing email, name, role
        if (key === STORAGE_KEYS.TOKEN) return 'token';
        return null;
      });

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AuthService,
          { provide: Router, useValue: routerSpy },
          { provide: SecureStorageService, useValue: secureStorageSpy },
          { provide: RateLimiterService, useValue: rateLimiterSpy },
          { provide: LoggerService, useValue: loggerSpy }
        ]
      });

      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // --- login ---

  describe('login', () => {
    beforeEach(() => setupWithNoStoredUser());

    it('should POST to /auth/login and set auth data', () => {
      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe(response => {
        expect(response.tokens.accessToken).toBe('access-token-123');
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);

      expect(service.isAuthenticated()).toBeTrue();
      expect(service.user()?.email).toBe('test@example.com');
      expect(secureStorageSpy.setItem).toHaveBeenCalled();
      expect(rateLimiterSpy.resetLoginAttempts).toHaveBeenCalled();
    });

    it('should block when rate limiter denies', () => {
      rateLimiterSpy.checkLoginAttempt.and.returnValue({ allowed: false, message: 'Too many attempts' });

      service.login({ email: 'test@example.com', password: 'pass' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Too many attempts');
        }
      });

      httpMock.expectNone(r => r.url.includes('/auth/login'));
    });

    it('should error when password is empty', () => {
      service.login({ email: 'test@example.com', password: '' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Password is required');
        }
      });

      expect(rateLimiterSpy.recordFailedLogin).toHaveBeenCalled();
      httpMock.expectNone(r => r.url.includes('/auth/login'));
    });

    it('should record failed login on HTTP 401', () => {
      service.login({ email: 'test@example.com', password: 'wrong' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Wrong credentials');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({ message: 'Wrong credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(rateLimiterSpy.recordFailedLogin).toHaveBeenCalled();
    });

    it('should return generic message on HTTP 500', () => {
      service.login({ email: 'test@example.com', password: 'pass' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Invalid email or password');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('should sanitize email before sending', () => {
      spyOn(InputSanitizer, 'sanitizeEmail').and.returnValue('clean@example.com');

      service.login({ email: 'dirty@example.com', password: 'Password1!' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      expect(req.request.body.email).toBe('clean@example.com');
      req.flush(mockAuthResponse);
    });
  });

  // --- register ---

  describe('register', () => {
    beforeEach(() => setupWithNoStoredUser());

    it('should POST to /auth/register and set auth data', () => {
      spyOn(InputSanitizer, 'validatePassword').and.returnValue({ valid: true, errors: [] });

      service.register({ email: 'new@example.com', password: 'StrongP@ss1', name: 'New User' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/register'));
      req.flush(mockAuthResponse);

      expect(service.isAuthenticated()).toBeTrue();
      expect(secureStorageSpy.setItem).toHaveBeenCalled();
    });

    it('should error for weak password', () => {
      spyOn(InputSanitizer, 'validatePassword').and.returnValue({
        valid: false,
        errors: ['Password must be at least 8 characters']
      });

      service.register({ email: 'new@example.com', password: 'short', name: 'User' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('at least 8 characters');
        }
      });

      httpMock.expectNone(r => r.url.includes('/auth/register'));
    });

    it('should sanitize name before sending', () => {
      spyOn(InputSanitizer, 'sanitizeEmail').and.returnValue('clean@example.com');
      spyOn(InputSanitizer, 'sanitizeString').and.returnValue('Clean Name');
      spyOn(InputSanitizer, 'validatePassword').and.returnValue({ valid: true, errors: [] });

      service.register({ email: 'test@example.com', password: 'StrongP@ss1', name: '<script>hack</script>' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/register'));
      expect(req.request.body.name).toBe('Clean Name');
      req.flush(mockAuthResponse);
    });

    it('should return backend error message', () => {
      spyOn(InputSanitizer, 'validatePassword').and.returnValue({ valid: true, errors: [] });

      service.register({ email: 'existing@example.com', password: 'StrongP@ss1', name: 'User' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Email already exists');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/auth/register'));
      req.flush({ message: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  // --- logout ---

  describe('logout', () => {
    beforeEach(() => {
      setupWithStoredUser();
      // Flush the constructor's /auth/me
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);
    });

    it('should clear user state', () => {
      expect(service.isAuthenticated()).toBeTrue();

      service.logout();

      expect(service.isAuthenticated()).toBeFalse();
      expect(service.user()).toBeNull();
      expect(service.getToken()).toBeNull();
    });

    it('should clear secure storage', () => {
      service.logout();

      expect(secureStorageSpy.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(secureStorageSpy.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN);
      expect(secureStorageSpy.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('should clear legacy localStorage', () => {
      spyOn(localStorage, 'removeItem');

      service.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN);
      expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('should navigate to /home', () => {
      service.logout();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  // --- refreshToken ---

  describe('refreshToken', () => {
    beforeEach(() => {
      setupWithStoredUser();
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);
    });

    it('should POST to /auth/refresh and update tokens', () => {
      service.refreshToken().subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/refresh'));
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);

      expect(secureStorageSpy.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN, 'access-token-123');
      expect(secureStorageSpy.setItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token-456');
    });

    it('should logout on refresh failure', () => {
      service.refreshToken().subscribe({ error: () => {} });

      const req = httpMock.expectOne(r => r.url.includes('/auth/refresh'));
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(service.isAuthenticated()).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  // --- getToken ---

  describe('getToken', () => {
    it('should return null when not authenticated', () => {
      setupWithNoStoredUser();
      expect(service.getToken()).toBeNull();
    });

    it('should return token when authenticated', () => {
      setupWithStoredUser();
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);

      expect(service.getToken()).toBe('stored-token');
    });
  });

  // --- isTokenExpired ---

  describe('isTokenExpired', () => {
    beforeEach(() => setupWithNoStoredUser());

    it('should return true when no token', () => {
      expect(service.isTokenExpired()).toBeTrue();
    });

    it('should return false for valid non-expired JWT', () => {
      // Login to set a token
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const jwt = createTestJwt({ exp: futureExp });

      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({
        ...mockAuthResponse,
        tokens: { ...mockAuthResponse.tokens, accessToken: jwt }
      });

      expect(service.isTokenExpired()).toBeFalse();
    });

    it('should return true for expired JWT', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const jwt = createTestJwt({ exp: pastExp });

      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({
        ...mockAuthResponse,
        tokens: { ...mockAuthResponse.tokens, accessToken: jwt }
      });

      expect(service.isTokenExpired()).toBeTrue();
    });

    it('should return true for malformed token', () => {
      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({
        ...mockAuthResponse,
        tokens: { ...mockAuthResponse.tokens, accessToken: 'not-a-jwt' }
      });

      expect(service.isTokenExpired()).toBeTrue();
    });
  });

  // --- updateProfile ---

  describe('updateProfile', () => {
    beforeEach(() => {
      setupWithStoredUser();
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);
    });

    it('should PATCH /users/profile and update user', () => {
      service.updateProfile({ name: 'Updated Name' }).subscribe(user => {
        expect(user.name).toBe('Updated Name');
      });

      const req = httpMock.expectOne(r => r.url.includes('/users/profile'));
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockUser, name: 'Updated Name' });

      expect(service.user()?.name).toBe('Updated Name');
    });

    it('should sanitize email in updates', () => {
      spyOn(InputSanitizer, 'sanitizeEmail').and.returnValue('sanitized@example.com');

      service.updateProfile({ email: 'dirty@example.com' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/users/profile'));
      expect(req.request.body.email).toBe('sanitized@example.com');
      req.flush({ ...mockUser, email: 'sanitized@example.com' });
    });

    it('should return error on failure', () => {
      service.updateProfile({ name: 'New' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Profile update failed');
        }
      });

      const req = httpMock.expectOne(r => r.url.includes('/users/profile'));
      req.flush({ message: 'Profile update failed' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // --- getCurrentUserId ---

  describe('getCurrentUserId', () => {
    it('should return null when not authenticated', () => {
      setupWithNoStoredUser();
      expect(service.getCurrentUserId()).toBeNull();
    });

    it('should return user id when authenticated', () => {
      setupWithStoredUser();
      const req = httpMock.expectOne(r => r.url.includes('/auth/me'));
      req.flush(mockUser);

      expect(service.getCurrentUserId()).toBe('u1');
    });
  });

  // --- Computed signals ---

  describe('computed signals', () => {
    beforeEach(() => setupWithNoStoredUser());

    it('isAdmin should be false for regular user', () => {
      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush(mockAuthResponse);

      expect(service.isAdmin()).toBeFalse();
    });

    it('isAdmin should be true for admin user', () => {
      service.login({ email: 'admin@example.com', password: 'Password1!' }).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush({
        ...mockAuthResponse,
        user: { ...mockUser, role: 'ADMIN' }
      });

      expect(service.isAdmin()).toBeTrue();
    });

    it('isAuthenticated should toggle on login/logout', () => {
      expect(service.isAuthenticated()).toBeFalse();

      service.login({ email: 'test@example.com', password: 'Password1!' }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
      req.flush(mockAuthResponse);

      expect(service.isAuthenticated()).toBeTrue();

      service.logout();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });
});
