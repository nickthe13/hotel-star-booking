# Hotel Booking Backend API

NestJS-based REST API for the hotel booking application with Prisma ORM, PostgreSQL, JWT authentication, and Stripe payments.

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: PostgreSQL
- **ORM**: Prisma 5
- **Authentication**: JWT with Passport
- **Payments**: Stripe
- **Email**: Nodemailer
- **Security**: Helmet, Throttler, bcrypt
- **Validation**: class-validator

## Project Structure

```
backend/
├── src/
│   ├── auth/              # Authentication module (JWT, guards)
│   ├── users/             # User management
│   ├── hotels/            # Hotel CRUD operations
│   ├── rooms/             # Room management
│   ├── bookings/          # Booking operations
│   ├── payments/          # Stripe payment integration
│   ├── email/             # Email notifications
│   ├── prisma/            # Prisma service and module
│   ├── common/            # Shared resources
│   │   ├── guards/        # Auth guards
│   │   ├── interceptors/  # Request/response interceptors
│   │   ├── filters/       # Exception filters
│   │   ├── decorators/    # Custom decorators
│   │   ├── dto/           # Shared DTOs
│   │   └── pipes/         # Custom validation pipes
│   ├── app.module.ts      # Root module
│   ├── app.controller.ts  # Health check endpoints
│   ├── app.service.ts     # App service
│   └── main.ts            # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Database seeding script
│   └── migrations/        # Database migrations
├── .env.example           # Environment variables template
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Database Schema

### Models
- **User**: User accounts with roles (USER, ADMIN)
- **Hotel**: Hotel information with ratings and amenities
- **Room**: Hotel rooms with types, pricing, and availability
- **Booking**: Reservations with status tracking
- **PaymentTransaction**: Stripe payment records
- **PaymentMethod**: Saved payment methods
- **Review**: Hotel reviews and ratings
- **FavoriteHotel**: User's favorite hotels

### Enums
- UserRole: `USER`, `ADMIN`
- BookingStatus: `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `NO_SHOW`
- PaymentStatus: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`
- RoomType: `STANDARD`, `DELUXE`, `SUITE`, `PRESIDENTIAL`

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ installed and running
- Stripe account (for payments)
- Gmail account (for emails) or other SMTP service

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hotel_booking?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

### 4. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Create database
createdb hotel_booking

# Or using psql
psql -U postgres
CREATE DATABASE hotel_booking;
```

**Option B: Docker PostgreSQL**
```bash
docker run --name hotel-booking-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hotel_booking \
  -p 5432:5432 \
  -d postgres:15
```

**Option C: Cloud PostgreSQL (Supabase - Free)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings → Database
4. Update `DATABASE_URL` in `.env`

### 5. Run Prisma Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio to view database
npm run prisma:studio
```

### 6. Start the Server

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000/api/v1`

## API Endpoints

### Health Check
- `GET /api/v1` - API information
- `GET /api/v1/health` - Health status

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/profile` - Get current user profile

### Users
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Hotels
- `GET /api/v1/hotels` - List hotels (with filters, pagination)
- `GET /api/v1/hotels/:id` - Get hotel details
- `POST /api/v1/hotels` - Create hotel (admin only)
- `PATCH /api/v1/hotels/:id` - Update hotel (admin only)
- `DELETE /api/v1/hotels/:id` - Delete hotel (admin only)

### Rooms
- `GET /api/v1/rooms` - List rooms (by hotel, availability)
- `GET /api/v1/rooms/:id` - Get room details
- `POST /api/v1/rooms` - Create room (admin only)
- `PATCH /api/v1/rooms/:id` - Update room (admin only)
- `DELETE /api/v1/rooms/:id` - Delete room (admin only)

### Bookings
- `GET /api/v1/bookings` - List user's bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings` - Create booking
- `PATCH /api/v1/bookings/:id` - Update booking
- `DELETE /api/v1/bookings/:id` - Cancel booking

### Payments
- `POST /api/v1/payments/create-intent` - Create Stripe payment intent
- `POST /api/v1/payments/confirm` - Confirm payment
- `GET /api/v1/payments/methods` - Get saved payment methods
- `POST /api/v1/payments/methods` - Save payment method
- `DELETE /api/v1/payments/methods/:id` - Delete payment method
- `POST /api/v1/payments/refund` - Process refund (admin only)

## Security Features

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (User/Admin)
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: class-validator DTOs
- **SQL Injection Prevention**: Prisma parameterized queries
- **CORS**: Configured for frontend origin
- **Security Headers**: Helmet middleware
- **Environment Isolation**: Separate configs for dev/prod

## Development

### Available Scripts

```bash
# Development
npm run start:dev       # Start with hot reload
npm run start:debug     # Start with debugger

# Build
npm run build           # Build for production

# Prisma
npm run prisma:generate # Generate Prisma Client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio GUI
npm run prisma:seed     # Seed database

# Formatting
npm run format          # Format code with Prettier
```

### Creating a New Module

```bash
# Use NestJS CLI
npx nest generate module feature-name
npx nest generate controller feature-name
npx nest generate service feature-name
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Environment Variables for Production

Ensure these are set in production:

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=strong-production-secret
STRIPE_SECRET_KEY=sk_live_your_live_key
FRONTEND_URL=https://your-frontend-domain.com
```

### Deployment Platforms

**Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

**Render**
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

**Docker**
```dockerfile
# Create Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d hotel_booking

# Check if PostgreSQL is running
sudo service postgresql status  # Linux
brew services list              # macOS
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npx prisma generate --force
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
# Linux/macOS
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Next Steps

1. Complete implementation of all modules (Auth, Hotels, Rooms, Bookings, Payments)
2. Add database seeding script for sample data
3. Implement email templates
4. Add API documentation (Swagger)
5. Write unit and e2e tests
6. Set up CI/CD pipeline
7. Configure logging and monitoring

## Support

For issues or questions, please refer to:
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe API Reference](https://stripe.com/docs/api)

## License

MIT
