# Hotel Star Booking - Codebase Explanation

This document explains the codebase we've built over the past months. Let's start with the backend.

---

## Part 1: Backend Overview

### What is the Backend?

The backend is a **NestJS application** - a Node.js framework that helps us build server-side applications. Think of it as the "brain" of our hotel booking system. It:

- Handles all business logic (booking rules, payments, loyalty points)
- Manages the database (storing users, hotels, bookings)
- Provides an API that the frontend calls
- Handles security (authentication, authorization)

### Technology Stack

| What | Technology | Why |
|------|------------|-----|
| Framework | NestJS | Structured, TypeScript-first, great for APIs |
| Language | TypeScript | Type safety, better developer experience |
| Database | PostgreSQL (Supabase) | Reliable, relational database |
| ORM | Prisma | Easy database queries, type-safe |
| Payments | Stripe | Industry standard for payments |
| Auth | JWT + Passport | Secure token-based authentication |

---

## Part 2: Project Structure

```
backend/
├── src/
│   ├── auth/           # Login, register, JWT tokens
│   ├── bookings/       # Creating and managing bookings
│   ├── hotels/         # Hotel listings and details
│   ├── rooms/          # Room management
│   ├── payments/       # Stripe payment processing
│   ├── loyalty/        # Points and rewards program
│   ├── reviews/        # Hotel reviews
│   ├── users/          # User profiles
│   ├── email/          # Sending emails
│   ├── contact/        # Contact form
│   ├── common/         # Shared utilities
│   ├── prisma/         # Database connection
│   ├── app.module.ts   # Root module (connects everything)
│   └── main.ts         # Entry point (starts the server)
├── prisma/
│   └── schema.prisma   # Database structure definition
└── package.json        # Dependencies
```

### How NestJS Works

NestJS uses a **modular architecture**. Each feature (auth, bookings, hotels) is a "module" with:

1. **Controller** - Handles HTTP requests (GET, POST, etc.)
2. **Service** - Contains business logic
3. **DTOs** - Define what data is expected/returned
4. **Module** - Ties everything together

Example flow when a user books a room:
```
Frontend → POST /api/v1/bookings → BookingsController → BookingsService → Database
```

---

## Part 3: The Entry Point (main.ts)

The `main.ts` file is where everything starts. Here's what it does:

```typescript
// 1. Creates the NestJS application
const app = await NestFactory.create(AppModule);

// 2. Sets up security headers (Helmet)
app.use(helmet({...}));

// 3. Enables CORS for frontend communication
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
});

// 4. Adds global prefix to all routes
app.setGlobalPrefix('api/v1');  // All routes start with /api/v1

// 5. Adds validation for all incoming requests
app.useGlobalPipes(new ValidationPipe({...}));

// 6. Adds global guards (authentication, rate limiting)
app.useGlobalGuards(throttlerGuard, jwtAuthGuard, rolesGuard);

// 7. Starts the server
await app.listen(3000);
```

**Key Security Features:**
- **Helmet** - Adds security headers (prevents XSS, clickjacking, etc.)
- **CORS** - Controls which domains can access our API
- **Rate Limiting** - Prevents abuse (100 requests per minute by default)
- **JWT Guard** - Protects routes (requires login)
- **Roles Guard** - Checks user permissions (admin vs regular user)

---

## Part 4: Database Schema (Prisma)

Our database has these main tables:

### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed, never plain text!
  name      String
  phone     String?
  role      Role     @default(USER)  // USER or ADMIN

  // Relations
  bookings       Booking[]
  reviews        Review[]
  favoriteHotels FavoriteHotel[]
  loyaltyAccount LoyaltyAccount?
}
```

### Hotel
```prisma
model Hotel {
  id          String   @id @default(cuid())
  name        String
  description String
  address     String
  city        String
  country     String
  rating      Float    @default(0)
  images      String[] // Array of image URLs
  amenities   String[] // ["wifi", "pool", "gym"]

  // Relations
  rooms   Room[]
  reviews Review[]
}
```

### Room
```prisma
model Room {
  id          String   @id @default(cuid())
  hotelId     String
  type        RoomType // STANDARD, DELUXE, SUITE, PRESIDENTIAL
  name        String
  price       Float
  capacity    Int
  isAvailable Boolean  @default(true)

  // Relations
  hotel    Hotel     @relation(...)
  bookings Booking[]
}
```

### Booking
```prisma
model Booking {
  id              String        @id @default(cuid())
  userId          String
  roomId          String
  checkIn         DateTime
  checkOut        DateTime
  numberOfGuests  Int
  totalPrice      Float
  status          BookingStatus // PENDING_PAYMENT, CONFIRMED, CHECKED_IN, etc.
  paymentStatus   PaymentStatus // PENDING, SUCCEEDED, FAILED, REFUNDED

  // Loyalty integration
  pointsEarned    Int @default(0)
  pointsRedeemed  Int @default(0)

  // Relations
  user   User @relation(...)
  room   Room @relation(...)
}
```

### LoyaltyAccount
```prisma
model LoyaltyAccount {
  id              String      @id @default(cuid())
  userId          String      @unique
  currentPoints   Int         @default(0)
  lifetimePoints  Int         @default(0)
  lifetimeSpending Float      @default(0)
  tier            LoyaltyTier @default(BRONZE)  // BRONZE, SILVER, GOLD, PLATINUM
}
```

---

## Part 5: Authentication System

### How Login Works

1. **User sends credentials** → POST /api/v1/auth/login
2. **AuthService validates** → Checks email exists, verifies password with bcrypt
3. **Generates JWT tokens** → Access token (24h) + Refresh token (7 days)
4. **Returns tokens** → Frontend stores them

```typescript
// auth.service.ts - simplified
async login(email: string, password: string) {
  // 1. Find user
  const user = await this.prisma.user.findUnique({ where: { email } });

  // 2. Verify password (bcrypt compares hashes)
  const isValid = await bcrypt.compare(password, user.password);

  // 3. Generate tokens
  const accessToken = this.jwtService.sign({ sub: user.id, email, role: user.role });
  const refreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' });

  return { accessToken, refreshToken, user };
}
```

### How Protected Routes Work

```typescript
// Most routes require authentication (JWT token)
@Controller('bookings')
export class BookingsController {

  @Get()  // GET /api/v1/bookings - requires valid JWT
  findAll(@CurrentUser() user: User) {
    return this.bookingsService.findAll(user);
  }

  @Post(':id/check-in')
  @Roles(Role.ADMIN)  // Only admins can check-in guests
  checkIn(@Param('id') id: string) {
    return this.bookingsService.checkIn(id);
  }
}

// Some routes are public (no auth needed)
@Controller('auth')
export class AuthController {

  @Public()  // Anyone can access
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

---

## Part 6: Booking Flow

Here's the complete booking flow:

### Step 1: Create Booking
```
POST /api/v1/bookings
{
  "roomId": "room123",
  "checkIn": "2024-03-15",
  "checkOut": "2024-03-18",
  "numberOfGuests": 2
}
```

The service:
1. Validates dates (check-out after check-in, not in past)
2. Checks room capacity
3. Checks for overlapping bookings
4. Calculates total price (nights × room price)
5. Creates booking with status: `PENDING_PAYMENT`

### Step 2: Create Payment Intent
```
POST /api/v1/payments/create-intent
{
  "bookingId": "booking123",
  "amount": 450.00
}
```

Creates a Stripe PaymentIntent that the frontend uses.

### Step 3: Confirm Payment
```
POST /api/v1/payments/confirm
{
  "paymentIntentId": "pi_xxx",
  "bookingId": "booking123"
}
```

After Stripe processes the card:
1. Updates booking status to `CONFIRMED`
2. Updates payment status to `SUCCEEDED`
3. Awards loyalty points

### Step 4: Check-in (Admin)
```
POST /api/v1/bookings/:id/check-in
```

Updates status to `CHECKED_IN`.

### Step 5: Check-out (Admin)
```
POST /api/v1/bookings/:id/check-out
```

Updates status to `CHECKED_OUT`.

---

## Part 7: Loyalty System

### Tier Levels
| Tier | Required Spending | Points Multiplier |
|------|------------------|-------------------|
| Bronze | $0+ | 1.0x |
| Silver | $500+ | 1.25x |
| Gold | $2,000+ | 1.5x |
| Platinum | $5,000+ | 2.0x |

### How Points Work

**Earning Points:**
- Base: 10 points per $1 spent
- Multiplied by tier (e.g., Gold gets 15 points per $1)

**Redeeming Points:**
- 100 points = $1 discount
- Maximum 50% of booking can be paid with points

```typescript
// loyalty.service.ts - simplified
async awardPointsForBooking(bookingId: string) {
  const booking = await this.prisma.booking.findUnique({...});
  const account = await this.getOrCreateAccount(booking.userId);

  // Calculate points with tier multiplier
  const basePoints = Math.floor(booking.totalPrice * 10);
  const multiplier = this.getTierMultiplier(account.tier);
  const points = Math.floor(basePoints * multiplier);

  // Update account
  await this.prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      currentPoints: { increment: points },
      lifetimePoints: { increment: points },
      lifetimeSpending: { increment: booking.totalPrice },
    }
  });

  // Check for tier upgrade
  await this.checkAndUpdateTier(account.id);
}
```

---

## Part 8: API Routes Summary

### Public Routes (No Auth)
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/hotels` - List hotels
- `GET /api/v1/hotels/:id` - Hotel details
- `POST /api/v1/contact` - Contact form
- `POST /api/v1/payments/webhook` - Stripe webhooks

### Protected Routes (Require Login)
- `GET /api/v1/auth/profile` - Get my profile
- `GET /api/v1/bookings` - My bookings
- `POST /api/v1/bookings` - Create booking
- `POST /api/v1/bookings/:id/cancel` - Cancel booking
- `POST /api/v1/reviews` - Write review
- `POST /api/v1/hotels/:id/favorites` - Add to favorites

### Admin Routes (Admin Only)
- `POST /api/v1/hotels` - Create hotel
- `PATCH /api/v1/hotels/:id` - Update hotel
- `DELETE /api/v1/hotels/:id` - Delete hotel
- `POST /api/v1/rooms` - Create room
- `POST /api/v1/bookings/:id/check-in` - Check-in guest
- `POST /api/v1/bookings/:id/check-out` - Check-out guest

---

## Part 9: Error Handling

We have a global exception filter that catches all errors:

```typescript
// http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Handle different error types

    // Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        // Unique constraint violation
        return { statusCode: 409, message: 'Resource already exists' };
      }
      if (exception.code === 'P2025') {
        // Record not found
        return { statusCode: 404, message: 'Resource not found' };
      }
    }

    // NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      return exception.getResponse();
    }

    // Unknown errors (hide details in production)
    return { statusCode: 500, message: 'Internal server error' };
  }
}
```

---

# FRONTEND

---

## Part 10: Frontend Overview

### What is the Frontend?

The frontend is an **Angular application** - a TypeScript framework for building web apps. It's what the user sees and interacts with:

- Displays hotels, rooms, and booking forms
- Handles user interactions (clicks, form inputs)
- Communicates with the backend API
- Manages client-side state (logged in user, cart, etc.)

### Technology Stack

| What | Technology | Why |
|------|------------|-----|
| Framework | Angular 20+ | Powerful, TypeScript-first, enterprise-ready |
| Language | TypeScript | Type safety, better tooling |
| Styling | SCSS (custom) | No UI library - full control over design |
| State | Angular Signals | Modern, reactive state management |
| HTTP | HttpClient + RxJS | Async API communication |
| Security | TweetNaCl | Encrypted local storage |

---

## Part 11: Project Structure

```
src/
├── app/
│   ├── core/                 # Core application logic
│   │   ├── constants/        # API endpoints, storage keys
│   │   ├── guards/           # Route protection (auth, admin)
│   │   ├── interceptors/     # HTTP request/response handlers
│   │   ├── models/           # TypeScript interfaces
│   │   ├── security/         # Encryption, validation
│   │   ├── services/         # API communication services
│   │   └── utils/            # Helper functions
│   ├── features/             # Feature pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── auth/             # Login, register pages
│   │   ├── booking/          # Booking flow
│   │   ├── dashboard/        # User dashboard
│   │   ├── favorites/        # Saved hotels
│   │   ├── home/             # Landing page
│   │   ├── hotel-details/    # Single hotel view
│   │   ├── hotels/           # Hotel search/listing
│   │   ├── profile/          # User profile
│   │   └── contact/          # Contact page
│   ├── layouts/              # Page layouts
│   │   ├── main-layout/      # Standard header/footer
│   │   └── admin-layout/     # Admin sidebar layout
│   ├── shared/               # Reusable components
│   │   └── components/       # Modal, toast, cards, etc.
│   ├── app.config.ts         # App configuration
│   ├── app.routes.ts         # Route definitions
│   └── app.ts                # Root component
├── assets/                   # Images, icons, data
├── environments/             # Environment configs
└── styles.scss               # Global styles
```

### How Angular Works

Angular uses **standalone components** (modern approach, no NgModules needed):

```typescript
@Component({
  selector: 'app-hotel-card',
  imports: [CommonModule, RouterLink],  // Dependencies declared here
  templateUrl: './hotel-card.component.html',
  styleUrl: './hotel-card.component.scss'
})
export class HotelCardComponent {
  @Input() hotel!: Hotel;  // Data passed from parent
}
```

Each component has:
1. **TypeScript class** - Logic and data
2. **HTML template** - What to render
3. **SCSS styles** - How it looks
4. **Imports** - Dependencies it needs

---

## Part 12: The Entry Point (main.ts & app.config.ts)

### main.ts - Application Bootstrap

```typescript
// 1. Validate environment configuration
const validationResult = EnvironmentValidator.validate(environment);
if (!validationResult.isValid) {
  // Show error page if config is invalid
  showErrorPage(validationResult.errors);
  throw new Error('Invalid environment configuration');
}

// 2. Bootstrap the Angular app
bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
```

### app.config.ts - App Configuration

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Optimized change detection
    provideZoneChangeDetection({ eventCoalescing: true }),

    // 2. Router with lazy loading
    provideRouter(routes, withComponentInputBinding()),

    // 3. HTTP client with interceptors
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),

    // 4. PWA service worker (production only)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
```

---

## Part 13: Services - API Communication

Services are **singleton classes** that handle business logic and API calls.

### AuthService - User Authentication

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Signals for reactive state
  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);

  // Computed values (derived from signals)
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  // Login method
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Store tokens securely
          this.secureStorage.setItem('token', response.accessToken);
          this.secureStorage.setItem('refreshToken', response.refreshToken);

          // Update signals
          this.token.set(response.accessToken);
          this.currentUser.set(response.user);
        })
      );
  }

  // Logout method
  logout(): void {
    this.secureStorage.clear();
    this.currentUser.set(null);
    this.token.set(null);
    this.router.navigate(['/login']);
  }
}
```

### HotelService - Hotel Data

```typescript
@Injectable({ providedIn: 'root' })
export class HotelService {
  private http = inject(HttpClient);

  // State signals
  hotels = signal<Hotel[]>([]);
  loading = signal<boolean>(false);

  // Get all hotels with filters
  getHotels(filters?: HotelFilters): Observable<Hotel[]> {
    this.loading.set(true);

    return this.http.get<Hotel[]>(`${API_URL}/hotels`, { params: filters })
      .pipe(
        tap(hotels => {
          this.hotels.set(hotels);
          this.loading.set(false);
        }),
        catchError(error => {
          this.loading.set(false);
          throw error;
        })
      );
  }

  // Get single hotel
  getHotel(id: string): Observable<Hotel> {
    return this.http.get<Hotel>(`${API_URL}/hotels/${id}`);
  }
}
```

### BookingService - Booking Management

```typescript
@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);

  loading = signal<boolean>(false);

  createBooking(data: CreateBookingDto): Observable<Booking> {
    return this.http.post<Booking>(`${API_URL}/bookings`, data);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${API_URL}/bookings`);
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.http.post<Booking>(`${API_URL}/bookings/${id}/cancel`, {});
  }
}
```

### PaymentService - Stripe Integration

```typescript
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  stripeLoaded = signal<boolean>(false);

  // Create payment intent (server-side)
  createPaymentIntent(bookingId: string, amount: number): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${API_URL}/payments/create-intent`, {
      bookingId,
      amount,
      currency: 'usd'
    });
  }

  // Confirm payment after Stripe processes
  confirmPayment(paymentIntentId: string, bookingId: string): Observable<Payment> {
    return this.http.post<Payment>(`${API_URL}/payments/confirm`, {
      paymentIntentId,
      bookingId
    });
  }
}
```

---

## Part 14: State Management with Signals

Angular Signals are a **modern reactive primitive** (like React's useState but better).

### What are Signals?

```typescript
// Create a signal with initial value
const count = signal(0);

// Read the value
console.log(count());  // 0

// Update the value
count.set(5);
count.update(n => n + 1);

// Computed signals (derived values)
const doubled = computed(() => count() * 2);
```

### How We Use Signals

**In Services (global state):**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // These are available app-wide
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
}
```

**In Components (local state):**
```typescript
@Component({...})
export class HotelListComponent {
  private hotelService = inject(HotelService);

  // Local component state
  searchQuery = signal('');
  selectedCity = signal<string | null>(null);

  // Derived from service signals
  filteredHotels = computed(() => {
    const hotels = this.hotelService.hotels();
    const query = this.searchQuery().toLowerCase();
    const city = this.selectedCity();

    return hotels.filter(h =>
      h.name.toLowerCase().includes(query) &&
      (!city || h.city === city)
    );
  });
}
```

**In Templates:**
```html
<!-- Reading signals -->
<p>Welcome, {{ authService.currentUser()?.name }}</p>

<!-- Conditional rendering -->
@if (authService.isAuthenticated()) {
  <button (click)="logout()">Logout</button>
} @else {
  <a routerLink="/login">Login</a>
}

<!-- Looping -->
@for (hotel of filteredHotels(); track hotel.id) {
  <app-hotel-card [hotel]="hotel" />
}
```

---

## Part 15: Routing

### Route Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Public routes
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'hotels',
    loadComponent: () => import('./features/hotels/hotels.component')
      .then(m => m.HotelsComponent)
  },
  {
    path: 'hotels/:id',
    loadComponent: () => import('./features/hotel-details/hotel-details.component')
      .then(m => m.HotelDetailsComponent)
  },

  // Auth routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component')
      .then(m => m.RegisterComponent)
  },

  // Protected routes (require login)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]  // Must be logged in
  },
  {
    path: 'booking/:roomId',
    loadComponent: () => import('./features/booking/booking.component')
      .then(m => m.BookingComponent),
    canActivate: [authGuard]
  },

  // Admin routes (require admin role)
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],  // Must be admin
    children: [
      { path: 'hotels', loadComponent: () => import('./features/admin/hotels/...') },
      { path: 'bookings', loadComponent: () => import('./features/admin/bookings/...') },
      { path: 'users', loadComponent: () => import('./features/admin/users/...') },
    ]
  },

  // 404
  { path: '**', loadComponent: () => import('./features/not-found/...') }
];
```

### Route Guards

**authGuard - Requires Login:**
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;  // Allow access
  }

  // Redirect to login with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
```

**adminGuard - Requires Admin Role:**
```typescript
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;  // Allow access
  }

  router.navigate(['/']);
  return false;
};
```

---

## Part 16: HTTP Interceptors

Interceptors are **middleware** for HTTP requests/responses.

### authInterceptor - Adds JWT Token

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  if (token) {
    // Clone request and add Authorization header
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};
```

### errorInterceptor - Global Error Handling

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401) {
        // Token expired - try to refresh
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Retry with new token
            const newReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${authService.token()}`)
            });
            return next(newReq);
          }),
          catchError(() => {
            // Refresh failed - logout
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => error);
          })
        );
      }

      if (error.status === 403) {
        router.navigate(['/']);  // Access denied
      }

      if (error.status === 404) {
        router.navigate(['/not-found']);
      }

      return throwError(() => error);
    })
  );
};
```

---

## Part 17: Shared Components

Reusable components used across the app.

### Modal Component

```typescript
@Component({
  selector: 'app-modal',
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="close()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>{{ title() }}</h2>
            <button (click)="close()">×</button>
          </header>
          <div class="modal-body">
            <ng-content />  <!-- Content projection -->
          </div>
          @if (!hideFooter()) {
            <footer class="modal-footer">
              <ng-content select="[footer]" />
            </footer>
          }
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  hideFooter = input<boolean>(false);

  closed = output<void>();

  close() {
    this.closed.emit();
  }
}
```

**Usage:**
```html
<app-modal [isOpen]="showModal()" title="Confirm Booking" (closed)="showModal.set(false)">
  <p>Are you sure you want to book this room?</p>

  <div footer>
    <button (click)="showModal.set(false)">Cancel</button>
    <button (click)="confirmBooking()">Confirm</button>
  </div>
</app-modal>
```

### Toast Component (Notifications)

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toast = { id: Date.now(), message, type };
    this.toasts.update(t => [...t, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => this.remove(toast.id), 5000);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
```

### Hotel Card Component

```typescript
@Component({
  selector: 'app-hotel-card',
  template: `
    <article class="hotel-card" [routerLink]="['/hotels', hotel().id]">
      <img [src]="hotel().images[0]" [alt]="hotel().name">

      <div class="hotel-info">
        <h3>{{ hotel().name }}</h3>
        <p class="location">{{ hotel().city }}, {{ hotel().country }}</p>

        <div class="rating">
          @for (star of stars(); track $index) {
            <span class="star filled">★</span>
          }
          <span>({{ hotel().rating }})</span>
        </div>

        <p class="price">From ${{ lowestPrice() }}/night</p>
      </div>

      @if (showFavorite()) {
        <button class="favorite-btn" (click)="toggleFavorite($event)">
          {{ isFavorite() ? '♥' : '♡' }}
        </button>
      }
    </article>
  `
})
export class HotelCardComponent {
  hotel = input.required<Hotel>();
  showFavorite = input<boolean>(true);
  isFavorite = input<boolean>(false);

  favoriteToggled = output<string>();

  stars = computed(() => Array(Math.round(this.hotel().rating)));

  lowestPrice = computed(() => {
    const rooms = this.hotel().rooms || [];
    return rooms.length ? Math.min(...rooms.map(r => r.price)) : 0;
  });

  toggleFavorite(event: Event) {
    event.stopPropagation();
    this.favoriteToggled.emit(this.hotel().id);
  }
}
```

---

## Part 18: Security Features

### Secure Storage (Encrypted localStorage)

```typescript
@Injectable({ providedIn: 'root' })
export class SecureStorageService {
  private key: Uint8Array;

  constructor() {
    // Generate or retrieve encryption key
    this.key = this.getOrCreateKey();
  }

  setItem(key: string, value: string): void {
    // Generate random nonce
    const nonce = nacl.randomBytes(24);

    // Encrypt value
    const encrypted = nacl.secretbox(
      new TextEncoder().encode(value),
      nonce,
      this.key
    );

    // Store as base64
    localStorage.setItem(key, JSON.stringify({
      nonce: this.toBase64(nonce),
      data: this.toBase64(encrypted)
    }));
  }

  getItem(key: string): string | null {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const { nonce, data } = JSON.parse(stored);

    // Decrypt
    const decrypted = nacl.secretbox.open(
      this.fromBase64(data),
      this.fromBase64(nonce),
      this.key
    );

    return decrypted ? new TextDecoder().decode(decrypted) : null;
  }
}
```

### Input Sanitization

```typescript
export class InputSanitizer {
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static sanitizeString(input: string): string {
    // Remove potential XSS
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim();
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) errors.push('Must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase');
    if (!/[a-z]/.test(password)) errors.push('Must contain lowercase');
    if (!/[0-9]/.test(password)) errors.push('Must contain number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('Must contain special character');

    return { isValid: errors.length === 0, errors };
  }
}
```

### Rate Limiting (Brute Force Protection)

```typescript
@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  private attempts = new Map<string, { count: number; lastAttempt: number }>();

  canAttempt(identifier: string, maxAttempts = 5, windowMs = 300000): boolean {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window expired
    if (now - record.lastAttempt > windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if under limit
    if (record.count < maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }

    return false;  // Rate limited
  }
}
```

---

## Part 19: Styling Architecture

We use **custom SCSS** (no UI framework like Bootstrap or Tailwind).

### Variables (assets/styles/_variables.scss)

```scss
// Colors
$primary: #1976D2;      // Blue
$primary-dark: #1565C0;
$accent: #FFA726;       // Orange
$success: #4CAF50;
$warning: #FF9800;
$error: #F44336;

// Neutrals
$white: #FFFFFF;
$gray-100: #F5F5F5;
$gray-500: #9E9E9E;
$gray-900: #212121;
$black: #000000;

// Spacing (8px grid)
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// Breakpoints
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
```

### Mixins (assets/styles/_mixins.scss)

```scss
// Responsive
@mixin mobile {
  @media (max-width: #{$breakpoint-sm - 1}) { @content; }
}

@mixin tablet {
  @media (min-width: $breakpoint-sm) and (max-width: #{$breakpoint-lg - 1}) { @content; }
}

@mixin desktop {
  @media (min-width: $breakpoint-lg) { @content; }
}

// Flexbox
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// Button
@mixin button-primary {
  background: $primary;
  color: $white;
  padding: $spacing-sm $spacing-md;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: $primary-dark;
  }

  &:disabled {
    background: $gray-500;
    cursor: not-allowed;
  }
}
```

### Example Component Styles

```scss
// hotel-card.component.scss
@import 'variables';
@import 'mixins';

.hotel-card {
  background: $white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  img {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .hotel-info {
    padding: $spacing-md;

    h3 {
      margin: 0 0 $spacing-xs;
      color: $gray-900;
    }

    .location {
      color: $gray-500;
      font-size: 0.9rem;
    }

    .price {
      color: $primary;
      font-weight: bold;
      font-size: 1.1rem;
    }
  }

  @include mobile {
    img {
      height: 150px;
    }
  }
}
```

---

## Part 20: Complete Data Flow Example

Let's trace a complete booking from user click to confirmation:

### 1. User Clicks "Book Now" on Hotel Page

```typescript
// hotel-details.component.ts
bookRoom(room: Room) {
  if (!this.authService.isAuthenticated()) {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/booking/${room.id}` }
    });
    return;
  }

  this.router.navigate(['/booking', room.id]);
}
```

### 2. Booking Page Loads

```typescript
// booking.component.ts
export class BookingComponent implements OnInit {
  roomId = input.required<string>();  // From route param

  room = signal<Room | null>(null);
  checkIn = signal<Date | null>(null);
  checkOut = signal<Date | null>(null);
  guests = signal(1);

  totalPrice = computed(() => {
    const room = this.room();
    const checkIn = this.checkIn();
    const checkOut = this.checkOut();

    if (!room || !checkIn || !checkOut) return 0;

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return room.price * nights;
  });

  ngOnInit() {
    // Load room details
    this.roomService.getRoom(this.roomId()).subscribe(room => {
      this.room.set(room);
    });
  }
}
```

### 3. User Fills Form and Submits

```typescript
// booking.component.ts
submitBooking() {
  const booking: CreateBookingDto = {
    roomId: this.roomId(),
    checkIn: this.checkIn()!.toISOString(),
    checkOut: this.checkOut()!.toISOString(),
    numberOfGuests: this.guests()
  };

  this.bookingService.createBooking(booking).subscribe({
    next: (createdBooking) => {
      // Booking created with PENDING_PAYMENT status
      // Now show payment modal
      this.pendingBooking.set(createdBooking);
      this.showPaymentModal.set(true);
    },
    error: (err) => {
      this.toastService.show(err.message, 'error');
    }
  });
}
```

### 4. Backend Creates Booking

```typescript
// bookings.service.ts (backend)
async create(userId: string, dto: CreateBookingDto) {
  // Validate room exists and is available
  const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });

  // Check for overlapping bookings
  const overlapping = await this.prisma.booking.findFirst({
    where: {
      roomId: dto.roomId,
      status: { notIn: ['CANCELLED'] },
      OR: [
        { checkIn: { lte: dto.checkOut }, checkOut: { gte: dto.checkIn } }
      ]
    }
  });

  if (overlapping) throw new ConflictException('Room not available');

  // Calculate price
  const nights = this.calculateNights(dto.checkIn, dto.checkOut);
  const totalPrice = room.price * nights;

  // Create booking
  return this.prisma.booking.create({
    data: {
      userId,
      roomId: dto.roomId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      numberOfGuests: dto.numberOfGuests,
      totalPrice,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING'
    }
  });
}
```

### 5. Payment Modal Opens

```html
<!-- booking.component.html -->
<app-payment-modal
  [isOpen]="showPaymentModal()"
  [booking]="pendingBooking()"
  [amount]="totalPrice()"
  (paymentComplete)="onPaymentComplete($event)"
  (closed)="showPaymentModal.set(false)"
/>
```

### 6. Stripe Payment Processing

```typescript
// stripe-payment.component.ts
async handlePayment() {
  this.processing.set(true);

  // 1. Create payment intent on backend
  const intent = await firstValueFrom(
    this.paymentService.createPaymentIntent(this.booking().id, this.amount())
  );

  // 2. Confirm payment with Stripe
  const result = await this.stripe.confirmCardPayment(intent.clientSecret, {
    payment_method: {
      card: this.cardElement,
      billing_details: { name: this.cardholderName() }
    }
  });

  if (result.error) {
    this.error.set(result.error.message);
    this.processing.set(false);
    return;
  }

  // 3. Confirm with backend
  this.paymentService.confirmPayment(result.paymentIntent.id, this.booking().id)
    .subscribe({
      next: () => {
        this.paymentComplete.emit({ success: true });
      },
      error: (err) => {
        this.error.set(err.message);
      }
    });
}
```

### 7. Backend Confirms Payment

```typescript
// payments.service.ts (backend)
async confirmPayment(paymentIntentId: string, bookingId: string) {
  // Verify payment with Stripe
  const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new BadRequestException('Payment not successful');
  }

  // Update booking
  const booking = await this.prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'SUCCEEDED',
      isPaid: true,
      paidAt: new Date()
    }
  });

  // Award loyalty points
  await this.loyaltyService.awardPointsForBooking(bookingId);

  // Send confirmation email
  await this.emailService.sendBookingConfirmation(booking);

  return booking;
}
```

### 8. Success - Redirect to Dashboard

```typescript
// booking.component.ts
onPaymentComplete(result: PaymentResult) {
  if (result.success) {
    this.toastService.show('Booking confirmed!', 'success');
    this.router.navigate(['/dashboard']);
  }
}
```

---

## Summary

You now have a complete picture of the hotel booking system:

**Backend (NestJS):**
- Modular architecture with controllers, services, DTOs
- PostgreSQL database with Prisma ORM
- JWT authentication with refresh tokens
- Stripe payment integration
- Loyalty points system
- Global error handling and validation

**Frontend (Angular):**
- Standalone components with signals for state
- Lazy-loaded routes with guards
- HTTP interceptors for auth and errors
- Secure encrypted storage
- Custom SCSS styling system
- Reusable shared components

**Key Flows:**
- Authentication (register, login, token refresh)
- Hotel browsing and search
- Booking creation and payment
- Loyalty points earning and redemption
- Admin management

---

*Document created: January 2026*
*Last updated: January 26, 2026*
