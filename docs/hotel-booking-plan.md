# Hotel Booking Web App — Full Professional Plan

*A modern, production-style Angular 20.x project created to demonstrate strong frontend engineering skills.*

## 🎯 Project Goal
Build a complete hotel booking platform (inspired by Booking.com) using **Angular 20.3**, showcasing:

- Routing & lazy loading
- Standalone components
- Reusable UI components
- Real-world forms + validation
- API integration (mock or real backend)
- Authentication with JWT
- Guards & role-based access
- State management with **Angular Signals**
- Clean folder structure
- Responsive UI and polished design
- Performance optimizations
- Security best practices
- Accessibility (WCAG 2.1 AA compliance)

This project is designed to impress **recruiters** and demonstrate job-ready frontend skills.

## 🏗️ Architecture Overview

### 📁 Project Folder Structure
```
src/
  app/
    core/
      services/           (API services, auth, booking)
      interceptors/       (auth, error, loading)
      guards/            (auth guard, role guard)
      models/            (interfaces & types)
      constants/         (API URLs, app constants)
      utils/             (helper functions)
    shared/
      components/        (reusable UI components)
      pipes/            (custom pipes)
      directives/       (custom directives)
    layouts/
      main-layout/      (header, footer, navigation)
      admin-layout/     (admin sidebar & layout)
    features/
      home/
      hotels/
      hotel-details/
      booking/
      auth/
      dashboard/
      admin/
    app.routes.ts
    app.config.ts
  environments/
    environment.ts
    environment.development.ts
  assets/
    images/
    icons/
    styles/
```

## 🧠 Core Concepts Demonstrated
- **Standalone Angular architecture** (no NgModules)
- **Feature-based routing + lazy loading**
- **Reusable components** (cards, carousels, filters, modals)
- **Reactive forms** (booking form, auth forms with complex validation)
- **HTTP Interceptors** for auth tokens & global error handling
- **Angular Signals** for reactive state management
- **Route Guards** (AuthGuard, RoleGuard) with CanActivate & CanDeactivate
- **Material UI + custom SCSS** with theming
- **Backend integration** (json-server initially, then optional Node/Express backend)
- **Image optimization** and lazy loading
- **Accessibility** features (ARIA labels, keyboard navigation)

## 🚀 Pages & Features

### 🏠 1. Home Page
**Purpose:** Convert visitors into users.

**Sections:**
- Full-screen hero section with island hotel background
- Transparent overlay search form
- Search bar → navigates to `/hotels?city=Athens&checkin=...`
- Featured hotels carousel (with skeleton loading)
- Popular destinations grid
- "Why Choose Us" section with icons
- Customer reviews/testimonials
- Newsletter signup footer

**Skills demonstrated:**
- SCSS layout & responsive hero section
- Reusable search form component
- Animated UI with Angular animations
- Skeleton loaders for better UX
- SEO optimization with meta tags

---

### 🏨 2. Hotels List Page (`/hotels`)
**Purpose:** Display hotel results dynamically with advanced filtering.

**Components:**
- Advanced filters sidebar
  - Location (autocomplete)
  - Price range (slider)
  - Star rating
  - Amenities (checkboxes)
  - Property type
  - Guest rating
- Hotels list (card layout)
- Sort options (price, rating, popularity)
- Pagination or virtual scrolling
- Map view toggle
- "No results" state
- Favorites/wishlist heart icon

**Logic:**
- HotelService fetches hotels with query params
- Filters managed with **Angular Signals**
- Query params persist filters in URL
- Debounced search input
- Loading & error states

**Skills demonstrated:**
- Complex UI + data filtering with Signals
- Query params synchronization
- Optimistic UI updates
- Virtual scrolling for performance
- Responsive grid layout

---

### 🏡 3. Hotel Details Page (`/hotels/:id`)
**Content:**
- Image carousel/gallery (lightbox on click)
- Hotel name, location, star rating
- Price per night
- Reviews summary with ratings breakdown
- Detailed description
- Interactive map (Google Maps or Leaflet)
- Rooms list with pricing
- Amenities with icons
- House rules
- Cancellation policy
- "Book Now" sticky CTA button
- Similar hotels section

**Skills demonstrated:**
- Dynamic data with route params
- Reusable carousel component
- Modal/dialog for image gallery
- Integration with maps API
- Structured data for SEO
- ShareService for social sharing

---

### 🧾 4. Booking System (`/booking/:hotelId`)
**Flow:**
1. User selects dates & room type
2. Guest details form (reactive)
3. Special requests (optional)
4. Payment mockup UI (Stripe-like design)
5. Booking confirmation with email mockup
6. Redirect to dashboard

**Features:**
- Date picker with disabled past dates
- Availability checker
- Price calculation with taxes
- Form validation with custom validators
- Stepper/wizard UI
- Booking summary sidebar
- Success animation

**Skills demonstrated:**
- Multi-step reactive form with FormBuilder
- Custom validators (date range, credit card)
- Dynamic price calculation
- LocalStorage/Backend persistence
- Route guards to prevent navigation loss

---

### 🔐 5. Authentication
**Pages:** Login, Register, Forgot Password

**Features:**
- Email & password validation
- Password strength indicator
- Remember me checkbox
- Social login UI (Google, Facebook mockup)
- Email verification flow (UI)
- JWT token management
- Auto-login on app load
- Session timeout handling

**Logic:**
- JWT stored in httpOnly cookies (or localStorage with XSS protection)
- Auth interceptor adds tokens to requests
- Error interceptor handles 401/403
- AuthGuard protects routes
- Role-based routing (user vs admin)

**Skills demonstrated:**
- Secure authentication flow
- Token refresh mechanism
- Protected routing with guards
- Form validation with custom patterns
- Password encryption awareness

---

### 📅 6. User Dashboard (`/dashboard`)
**Sections:**
- User profile card with avatar
- Upcoming bookings (sorted by date)
- Past bookings with "Book Again" option
- Booking details modal
- Cancel booking with confirmation
- Edit profile
- Favorites/wishlist
- Notifications center

**Skills demonstrated:**
- Protected routes with AuthGuard
- Conditional UI based on auth state
- CRUD operations on bookings
- Confirmation dialogs
- Real-time updates with Signals
- Profile image upload

---

### 🧠 7. Admin Panel (Phase 3)
**Features:**
- Dashboard with analytics
  - Total bookings chart (Chart.js or ng2-charts)
  - Revenue metrics
  - Occupancy rates
  - User growth
- Manage Hotels (CRUD)
  - Add/Edit/Delete hotels
  - Image upload (drag & drop)
  - Bulk actions
- Manage Rooms (CRUD)
- Manage Bookings
  - Approve/Cancel bookings
  - Filter by status
- User management
  - View users
  - Ban/activate users
- Admin-specific layout with sidebar nav

**Skills demonstrated:**
- Role-based access with RoleGuard
- Complete CRUD operations
- File upload handling
- Data tables with sorting & filtering
- Chart visualizations
- Separate layout pattern
- Bulk operations

---

### 🔍 8. Search Functionality
**Features:**
- Global search bar in header
- Autocomplete for cities
- Recent searches (localStorage)
- Search suggestions
- Advanced filters
- Search results count
- Empty states

**Skills demonstrated:**
- Debounced search with RxJS
- Autocomplete with API integration
- localStorage for cache
- Reactive search with Signals

---

### ❤️ 9. Favorites/Wishlist
**Features:**
- Add/remove hotels from favorites
- Dedicated favorites page
- Persist across sessions
- Share wishlist (URL)

**Skills demonstrated:**
- Toggle functionality
- LocalStorage or backend sync
- Optimistic UI updates

---

## 🗄️ Backend Strategy

### Phase 1: Mock Data (Quick Start)
**Approach:** json-server or in-memory data service
- Quick setup for prototyping
- Focus on frontend development first
- Data stored in `assets/data/*.json`

### Phase 2: Real Backend (Optional)
**Stack:** Node.js + Express + MongoDB (or Firebase)

**Collections:**
```typescript
users {
  _id, email, password (hashed), name, role, avatar, createdAt
}

hotels {
  _id, name, description, location, city, country,
  starRating, images[], amenities[], pricePerNight,
  featured, createdAt
}

rooms {
  _id, hotelId, roomType, capacity, pricePerNight,
  amenities[], images[], available
}

bookings {
  _id, userId, hotelId, roomId, checkIn, checkOut,
  guests, totalPrice, status (pending/confirmed/cancelled),
  createdAt
}

reviews {
  _id, userId, hotelId, rating, comment, createdAt
}

favorites {
  _id, userId, hotelId[], createdAt
}
```

**API Endpoints:**
```
Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/logout

Hotels
GET    /api/hotels?city=Athens&minPrice=50&maxPrice=200
GET    /api/hotels/:id
POST   /api/hotels              (admin only)
PUT    /api/hotels/:id          (admin only)
DELETE /api/hotels/:id          (admin only)

Rooms
GET    /api/hotels/:hotelId/rooms
GET    /api/rooms/:id
POST   /api/rooms               (admin only)
PUT    /api/rooms/:id           (admin only)
DELETE /api/rooms/:id           (admin only)

Bookings
GET    /api/bookings/user/:userId
GET    /api/bookings/:id
POST   /api/bookings
PUT    /api/bookings/:id
DELETE /api/bookings/:id

Reviews
GET    /api/hotels/:hotelId/reviews
POST   /api/reviews

Favorites
GET    /api/favorites/user/:userId
POST   /api/favorites
DELETE /api/favorites/:hotelId

Admin
GET    /api/admin/analytics
GET    /api/admin/bookings
GET    /api/admin/users
```

**Skills demonstrated:**
- RESTful API design
- JWT authentication
- Role-based authorization
- Database design
- API error handling

---

## 🎨 UI Design Language

**Theme:**
- Primary: Blue luxury theme (#1976D2, #0D47A1)
- Accent: Gold/amber for premium feel (#FFA726)
- Neutral: Grays for text and backgrounds

**Design System:**
- Material Design 3 components
- Custom SCSS variables and mixins
- Consistent spacing (8px grid system)
- Rounded corners (8px, 12px)
- Soft shadows (elevation system)
- Smooth transitions (200ms ease-in-out)

**Typography:**
- Headings: Poppins or Montserrat (bold, modern)
- Body: Roboto or Inter (readable)

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Components Style:**
- Cards with hover effects
- Skeleton loaders
- Loading spinners
- Toast notifications
- Smooth page transitions

---

## 🔒 Security Best Practices

**Frontend Security:**
- Sanitize all user inputs (Angular's built-in sanitization)
- Avoid innerHTML, use Angular bindings
- Store JWT in httpOnly cookies (preferred) or localStorage with XSS protection
- Implement CSRF tokens for state-changing operations
- Use Content Security Policy (CSP) headers
- Environment-based API URL configuration
- Never commit secrets (.env in .gitignore)

**Authentication:**
- Password strength validation (min 8 chars, uppercase, number, special char)
- Token expiration and refresh mechanism
- Logout on token expiry
- Rate limiting on auth endpoints (backend)
- Secure password reset flow

**Data Validation:**
- Frontend + backend validation
- Prevent SQL injection (use parameterized queries)
- Validate file uploads (type, size)
- Sanitize user-generated content

---

## ⚡ Performance Optimizations

**Angular Optimizations:**
- Lazy loading for all feature modules
- Route preloading strategy (PreloadAllModules)
- OnPush change detection for components
- TrackBy functions in *ngFor loops
- Virtual scrolling for long lists (CDK)
- Defer loading for below-fold content

**Image Optimization:**
- WebP format with fallbacks
- Responsive images (srcset)
- Lazy loading images (loading="lazy")
- CDN for static assets
- Image compression (TinyPNG, ImageOptim)

**Build Optimizations:**
- Production build with AOT compilation
- Tree-shaking unused code
- Code splitting by route
- Bundle size analysis (webpack-bundle-analyzer)
- Service worker for caching (Angular PWA)

**Runtime Optimizations:**
- Debounce search inputs (300ms)
- Throttle scroll events
- Memoization for expensive calculations
- Pagination instead of loading all data
- HTTP request caching with interceptors

**Target Metrics:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Lighthouse score: > 90

---

## ♿ Accessibility (WCAG 2.1 AA)

**Implementation:**
- Semantic HTML (header, nav, main, footer, article)
- ARIA labels for interactive elements
- Keyboard navigation support (Tab, Enter, Esc)
- Focus management in modals and dialogs
- Skip navigation link
- Alt text for all images
- Sufficient color contrast (4.5:1 ratio)
- Form labels and error messages
- Screen reader testing
- No keyboard traps

**Testing:**
- Use axe DevTools or WAVE
- Keyboard-only navigation test
- Screen reader testing (NVDA, JAWS)

---

## 🧪 Testing Strategy

### Unit Tests (Jasmine + Karma)
**Target Coverage:** 70%+

**What to test:**
- Services (auth, hotel, booking)
- Pure functions and utilities
- Pipes and directives
- Component logic (not UI)
- Guards and interceptors

**Example:**
```typescript
describe('AuthService', () => {
  it('should login user and store token');
  it('should logout user and clear token');
  it('should return true if user is authenticated');
});
```

### Component Tests
- Input/output bindings
- User interactions (click, input)
- Conditional rendering
- Form validation

### E2E Tests (Cypress or Playwright)
**Critical User Journeys:**
1. Search hotels → view results → view details
2. Complete booking flow (end-to-end)
3. User registration and login
4. Add hotel to favorites
5. User dashboard - view bookings
6. Admin - create hotel (if time permits)

**Example:**
```typescript
describe('Booking Flow', () => {
  it('should complete a hotel booking', () => {
    cy.visit('/hotels/123');
    cy.get('[data-testid="book-now"]').click();
    cy.get('[data-testid="checkin"]').type('2025-12-10');
    cy.get('[data-testid="checkout"]').type('2025-12-15');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/booking/confirmation');
  });
});
```

---

## 📋 Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup with Angular 20
- [ ] Folder structure implementation
- [ ] Core services skeleton (auth, hotel, booking)
- [ ] Routing setup with lazy loading
- [ ] Layouts (main, admin)
- [ ] Shared components (button, card, input)
- [ ] Design system (colors, typography, spacing)
- [ ] Mock data (json-server setup)
- [ ] HTTP interceptors (auth, error, loading)

### Phase 2: Core Features (Week 3-4)
- [ ] Home page with hero and search
- [ ] Hotels list with filters (Signals-based state)
- [ ] Hotel details page
- [ ] Basic booking flow
- [ ] Authentication (login, register)
- [ ] Protected routes with guards
- [ ] User dashboard (view bookings)
- [ ] Responsive design for all pages

### Phase 3: Advanced Features (Week 5-6)
- [ ] Favorites/wishlist functionality
- [ ] Search with autocomplete
- [ ] Reviews and ratings
- [ ] Advanced filters (price slider, amenities)
- [ ] Profile management
- [ ] Booking cancellation
- [ ] Admin panel basics (hotel CRUD)
- [ ] Image uploads

### Phase 4: Polish & Testing (Week 7)
- [ ] Performance optimizations
- [ ] Accessibility audit and fixes
- [ ] Unit tests for critical services
- [ ] E2E tests for main flows
- [ ] Error handling and user feedback
- [ ] Loading states and skeletons
- [ ] SEO optimization (meta tags, structured data)
- [ ] Cross-browser testing

### Phase 5: Deployment (Week 8)
- [ ] Production build optimization
- [ ] Environment configuration
- [ ] Deploy to Vercel/Netlify
- [ ] Backend deployment (if applicable)
- [ ] Performance monitoring setup
- [ ] Documentation (README, screenshots)
- [ ] Portfolio presentation

---

## 🚀 Deployment Strategy

**Frontend Hosting:**
- **Vercel** (recommended) - Zero config Angular support
- **Netlify** - Simple deployment with CI/CD
- **Firebase Hosting** - Good for Firebase backend integration
- **GitHub Pages** - Free static hosting

**Backend Hosting (if applicable):**
- **Railway** - Easy Node.js deployment
- **Render** - Free tier available
- **Heroku** - Classic PaaS option
- **MongoDB Atlas** - Free tier for database

**CI/CD:**
- Automated builds on git push
- Run tests before deployment
- Environment variables management
- Deploy previews for PR branches

**Domain:**
- Custom domain (e.g., hotel-booking-demo.com)
- SSL certificate (automatic with Vercel/Netlify)

---

## 📚 Documentation Plan

### README.md
- Project description and goals
- Screenshots/GIF demos
- Live demo link
- Tech stack overview
- Features list
- Installation instructions
- Environment setup
- npm scripts explanation

### Code Documentation
- JSDoc comments for complex functions
- Interface/type documentation
- Service method descriptions
- Component input/output docs

### Architecture Docs
- Folder structure explanation
- State management approach
- Routing strategy
- API integration guide

---

## 🎯 Success Criteria

**Technical Excellence:**
- Clean, readable code following Angular style guide
- Proper separation of concerns
- Reusable components and services
- Type safety (strict TypeScript)
- No console errors or warnings
- Lighthouse score > 90

**User Experience:**
- Fast loading times (< 3s)
- Smooth animations and transitions
- Intuitive navigation
- Clear error messages
- Responsive on all devices
- Accessible to keyboard and screen reader users

**Portfolio Impact:**
- Live demo deployed and accessible
- Professional README with screenshots
- GitHub repo with clean commit history
- Demonstrates 10+ Angular concepts
- Shows attention to detail and polish
- Includes testing and documentation

---

## 📖 Resources & References

**Angular:**
- [Angular Docs](https://angular.dev)
- [Angular Material](https://material.angular.io)
- [Angular Signals Guide](https://angular.dev/guide/signals)

**Design Inspiration:**
- Booking.com
- Airbnb
- Hotels.com
- Expedia

**Learning Resources:**
- Angular University courses
- Official Angular blog
- RxJS documentation
- TypeScript handbook

---

## 🎬 Final Notes

This plan is comprehensive but flexible. Prioritize Phase 1-2 for an MVP, then add features based on time. Focus on code quality over feature quantity. Every feature should demonstrate a specific skill. Document your decisions and be ready to explain your architecture choices in interviews.

**Remember:** The goal is to impress recruiters with production-quality code, not just to have many features. Polish matters more than quantity.

**Good luck building!** 🚀
