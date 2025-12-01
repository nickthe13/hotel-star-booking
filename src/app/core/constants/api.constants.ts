export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  },
  HOTELS: {
    BASE: '/hotels',
    DETAILS: (id: string) => `/hotels/${id}`,
    ROOMS: (hotelId: string) => `/hotels/${hotelId}/rooms`,
    REVIEWS: (hotelId: string) => `/hotels/${hotelId}/reviews`
  },
  ROOMS: {
    BASE: '/rooms',
    DETAILS: (id: string) => `/rooms/${id}`
  },
  BOOKINGS: {
    BASE: '/bookings',
    DETAILS: (id: string) => `/bookings/${id}`,
    USER: (userId: string) => `/bookings/user/${userId}`
  },
  FAVORITES: {
    BASE: '/favorites',
    USER: (userId: string) => `/favorites/user/${userId}`,
    DELETE: (hotelId: string) => `/favorites/${hotelId}`
  },
  ADMIN: {
    ANALYTICS: '/admin/analytics',
    BOOKINGS: '/admin/bookings',
    USERS: '/admin/users'
  }
};

export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  FAVORITES: 'user_favorites',
  RECENT_SEARCHES: 'recent_searches'
};
