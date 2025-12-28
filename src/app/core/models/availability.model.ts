export interface DayAvailability {
  date: string;
  available: boolean;
  price?: number;
  bookedRooms?: number;
  totalRooms?: number;
}

export interface DateRange {
  checkIn: string | null;
  checkOut: string | null;
}

export interface RoomAvailability {
  roomId: string;
  roomName: string;
  roomType: string;
  price: number;
  availability: DayAvailability[];
}

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isBooked: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  price?: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}
