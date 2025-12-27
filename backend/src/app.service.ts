import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo(): object {
    return {
      name: 'Hotel Booking API',
      version: '1.0.0',
      description: 'RESTful API for hotel booking application',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        hotels: '/api/v1/hotels',
        rooms: '/api/v1/rooms',
        bookings: '/api/v1/bookings',
        payments: '/api/v1/payments',
      },
      documentation: '/api/v1/docs',
    };
  }
}
