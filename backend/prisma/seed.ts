import { PrismaClient, UserRole, RoomType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface RoomData {
  type: RoomType;
  name: string;
  price: number;
  capacity: number;
  amenities: string[];
  available?: boolean;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in correct order due to foreign keys)
  console.log('🗑️  Clearing existing data...');
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favoriteHotel.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating users...');
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const userPassword = await bcrypt.hash('User123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hotelstar.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      password: userPassword,
      name: 'John Doe',
      role: UserRole.USER,
    },
  });

  console.log(`✅ Created admin: ${admin.email}`);
  console.log(`✅ Created user: ${user.email}`);

  // Create loyalty accounts for users
  await prisma.loyaltyAccount.create({
    data: {
      userId: user.id,
      currentPoints: 500,
      lifetimePoints: 1500,
      lifetimeSpending: 1500,
      tier: 'SILVER',
    },
  });

  // Hotels data
  const hotelsData: Array<{
    name: string;
    description: string;
    address: string;
    city: string;
    country: string;
    rating: number;
    images: string[];
    amenities: string[];
    rooms: RoomData[];
  }> = [
    {
      name: 'Santorini Paradise Resort',
      description: 'Luxury resort with stunning caldera views, infinity pools, and world-class dining. Experience the magic of Santorini\'s famous sunsets from your private terrace.',
      address: 'Oia Village',
      city: 'Santorini',
      country: 'Greece',
      rating: 4.9,
      images: [
        'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800',
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Bar', 'Room Service', 'Beach Access'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Standard Room', price: 315, capacity: 2, amenities: ['Sea View', 'Balcony', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Deluxe Room', price: 450, capacity: 3, amenities: ['Caldera View', 'Private Terrace', 'Jacuzzi', 'Mini Bar', 'Butler Service'] },
        { type: RoomType.SUITE, name: 'Infinity Suite', price: 675, capacity: 4, amenities: ['Panoramic Caldera View', 'Private Pool', 'Jacuzzi', 'Living Room', 'Butler Service', 'Premium Bar'], available: false },
      ],
    },
    {
      name: 'Athens Grand Hotel',
      description: 'Historic luxury hotel in the heart of Athens with views of the Acropolis. Blend of classical elegance and modern comfort.',
      address: 'Syntagma Square',
      city: 'Athens',
      country: 'Greece',
      rating: 4.7,
      images: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      ],
      amenities: ['Wi-Fi', 'Gym', 'Restaurant', 'Bar', 'Business Center', 'Parking'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Classic Room', price: 196, capacity: 2, amenities: ['City View', 'Work Desk', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Executive Room', price: 280, capacity: 3, amenities: ['Acropolis View', 'Balcony', 'Mini Bar', 'Nespresso Machine', 'Bathrobe'] },
        { type: RoomType.PRESIDENTIAL, name: 'Presidential Suite', price: 420, capacity: 4, amenities: ['Panoramic Acropolis View', 'Living Room', 'Dining Area', 'Jacuzzi', 'Butler Service', 'Premium Bar'] },
      ],
    },
    {
      name: 'Mykonos Beach Villa',
      description: 'Exclusive beachfront villa with private pool and direct beach access. Perfect for families and groups seeking privacy and luxury.',
      address: 'Paradise Beach',
      city: 'Mykonos',
      country: 'Greece',
      rating: 4.8,
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Beach Access', 'Parking', 'Air Conditioning'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Beach View Room', price: 266, capacity: 2, amenities: ['Beach View', 'Balcony', 'Mini Fridge', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Beachfront Villa', price: 380, capacity: 4, amenities: ['Direct Beach Access', 'Private Pool', 'Kitchen', 'Living Room', '2 Bedrooms'] },
        { type: RoomType.SUITE, name: 'Luxury Beach Villa', price: 570, capacity: 6, amenities: ['Private Beach Access', 'Infinity Pool', 'Full Kitchen', '3 Bedrooms', 'BBQ Area', 'Butler Service'], available: false },
      ],
    },
    {
      name: 'Crete Seaside Resort',
      description: 'All-inclusive resort on the beautiful beaches of Crete. Family-friendly with kids clubs, water sports, and entertainment.',
      address: 'Elounda Bay',
      city: 'Crete',
      country: 'Greece',
      rating: 4.6,
      images: [
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Bar', 'Gym', 'Beach Access', 'Pet Friendly'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Standard Room', price: 154, capacity: 2, amenities: ['Garden View', 'Balcony', 'Mini Fridge'] },
        { type: RoomType.DELUXE, name: 'Family Room', price: 220, capacity: 4, amenities: ['Sea View', 'Balcony', '2 Bathrooms', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.SUITE, name: 'Beach Suite', price: 330, capacity: 5, amenities: ['Direct Beach Access', 'Private Terrace', 'Living Room', 'Jacuzzi', 'Mini Bar'] },
      ],
    },
    {
      name: 'Rhodes Old Town Inn',
      description: 'Charming boutique hotel in the medieval old town. Traditional architecture with modern amenities and rooftop terrace.',
      address: 'Old Town',
      city: 'Rhodes',
      country: 'Greece',
      rating: 4.4,
      images: [
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      ],
      amenities: ['Wi-Fi', 'Restaurant', 'Bar', 'Air Conditioning'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Cozy Room', price: 84, capacity: 2, amenities: ['Old Town View', 'Traditional Decor', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Superior Room', price: 120, capacity: 2, amenities: ['Castle View', 'Balcony', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.SUITE, name: 'Rooftop Suite', price: 180, capacity: 3, amenities: ['Rooftop Terrace', 'Panoramic View', 'Living Area', 'Mini Bar', 'Bathrobe'], available: false },
      ],
    },
    {
      name: 'Thessaloniki City Hotel',
      description: 'Modern business hotel in the city center. Perfect for business travelers and city explorers with easy access to attractions.',
      address: 'City Center',
      city: 'Thessaloniki',
      country: 'Greece',
      rating: 4.5,
      images: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      ],
      amenities: ['Wi-Fi', 'Gym', 'Restaurant', 'Business Center', 'Parking', 'Laundry Service'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Business Room', price: 105, capacity: 2, amenities: ['City View', 'Work Desk', 'Coffee Maker', 'Fast Wi-Fi'] },
        { type: RoomType.DELUXE, name: 'Deluxe Room', price: 150, capacity: 3, amenities: ['City View', 'Balcony', 'Mini Bar', 'Coffee Maker', 'Bathrobe'] },
        { type: RoomType.SUITE, name: 'Executive Suite', price: 225, capacity: 4, amenities: ['Panoramic View', 'Living Room', 'Work Area', 'Mini Bar', 'Nespresso Machine'] },
      ],
    },
    {
      name: 'Corfu Luxury Apartments',
      description: 'Modern apartments with sea views and private balconies. Self-catering facilities with hotel services available.',
      address: 'Paleokastritsa',
      city: 'Corfu',
      country: 'Greece',
      rating: 4.7,
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Parking', 'Beach Access', 'Air Conditioning'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Studio Apartment', price: 126, capacity: 2, amenities: ['Sea View', 'Kitchenette', 'Balcony', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'One Bedroom Apartment', price: 180, capacity: 4, amenities: ['Sea View', 'Full Kitchen', 'Living Room', 'Balcony', 'Washing Machine'] },
        { type: RoomType.SUITE, name: 'Two Bedroom Penthouse', price: 270, capacity: 6, amenities: ['Panoramic Sea View', 'Full Kitchen', '2 Bathrooms', 'Large Terrace', 'BBQ', 'Washing Machine'] },
      ],
    },
    {
      name: 'Zakynthos Sunset Hotel',
      description: 'Beautiful hotel overlooking the famous Navagio Beach. Romantic setting perfect for couples and honeymooners.',
      address: 'Navagio Beach',
      city: 'Zakynthos',
      country: 'Greece',
      rating: 4.8,
      images: [
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Restaurant', 'Bar', 'Spa', 'Beach Access'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Sunset Room', price: 140, capacity: 2, amenities: ['Sea View', 'Balcony', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Honeymoon Suite', price: 200, capacity: 2, amenities: ['Panoramic Beach View', 'Private Balcony', 'Jacuzzi', 'Champagne on Arrival', 'Mini Bar'] },
        { type: RoomType.SUITE, name: 'Premium Suite', price: 300, capacity: 4, amenities: ['Navagio Beach View', 'Large Terrace', 'Jacuzzi', 'Living Room', 'Butler Service', 'Premium Bar'], available: false },
      ],
    },
    {
      name: 'Nafplio Heritage Hotel',
      description: 'Restored mansion in the historic town of Nafplio. Authentic Greek hospitality with antique furnishings and modern comfort.',
      address: 'Old Town',
      city: 'Nafplio',
      country: 'Greece',
      rating: 4.6,
      images: [
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      ],
      amenities: ['Wi-Fi', 'Restaurant', 'Bar', 'Air Conditioning'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Heritage Room', price: 91, capacity: 2, amenities: ['Old Town View', 'Antique Decor', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Deluxe Heritage Room', price: 130, capacity: 3, amenities: ['Castle View', 'Balcony', 'Antique Furniture', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.SUITE, name: 'Mansion Suite', price: 195, capacity: 4, amenities: ['Panoramic View', 'Living Area', 'Antique Furnishings', 'Fireplace', 'Mini Bar'] },
      ],
    },
    {
      name: 'Paros Island Resort',
      description: 'Traditional Cycladic resort with white-washed buildings and blue domes. Peaceful retreat with stunning Aegean views.',
      address: 'Naoussa',
      city: 'Paros',
      country: 'Greece',
      rating: 4.7,
      images: [
        'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      ],
      amenities: ['Wi-Fi', 'Pool', 'Restaurant', 'Bar', 'Beach Access', 'Spa'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Cycladic Room', price: 175, capacity: 2, amenities: ['Aegean View', 'Traditional Decor', 'Balcony', 'Mini Fridge'] },
        { type: RoomType.DELUXE, name: 'Sea View Suite', price: 250, capacity: 3, amenities: ['Panoramic Sea View', 'Private Terrace', 'Mini Bar', 'Coffee Maker', 'Bathrobe'] },
        { type: RoomType.SUITE, name: 'Aegean Villa', price: 375, capacity: 4, amenities: ['Private Pool', 'Sea View', 'Living Room', 'Kitchen', 'Private Garden', 'Butler Service'] },
      ],
    },
    {
      name: 'Meteora Valley Lodge',
      description: 'Mountain lodge with views of the famous Meteora monasteries. Hiking trails and nature experiences.',
      address: 'Kalambaka',
      city: 'Meteora',
      country: 'Greece',
      rating: 4.5,
      images: [
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      ],
      amenities: ['Wi-Fi', 'Restaurant', 'Parking', 'Gym', 'Air Conditioning'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Mountain View Room', price: 77, capacity: 2, amenities: ['Mountain View', 'Balcony', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Monastery View Room', price: 110, capacity: 3, amenities: ['Meteora Monastery View', 'Balcony', 'Mini Bar', 'Coffee Maker'] },
        { type: RoomType.SUITE, name: 'Valley Suite', price: 165, capacity: 4, amenities: ['Panoramic Valley View', 'Living Area', 'Fireplace', 'Mini Bar', 'Bathrobe'], available: false },
      ],
    },
    {
      name: 'Delphi Mountain Resort',
      description: 'Ski resort and spa retreat in the mountains. Summer hiking and winter skiing with therapeutic hot springs.',
      address: 'Delphi',
      city: 'Delphi',
      country: 'Greece',
      rating: 4.6,
      images: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      ],
      amenities: ['Wi-Fi', 'Spa', 'Restaurant', 'Bar', 'Gym', 'Parking'],
      rooms: [
        { type: RoomType.STANDARD, name: 'Mountain Room', price: 133, capacity: 2, amenities: ['Mountain View', 'Balcony', 'Coffee Maker'] },
        { type: RoomType.DELUXE, name: 'Spa Suite', price: 190, capacity: 3, amenities: ['Mountain View', 'Private Hot Tub', 'Balcony', 'Mini Bar', 'Bathrobe'] },
        { type: RoomType.SUITE, name: 'Premium Chalet', price: 285, capacity: 5, amenities: ['Panoramic Mountain View', 'Private Sauna', 'Fireplace', 'Living Room', 'Kitchen', '2 Bedrooms'] },
      ],
    },
  ];

  // Create hotels with rooms
  console.log('🏨 Creating hotels and rooms...');
  for (const hotelData of hotelsData) {
    const { rooms, ...hotelInfo } = hotelData;

    const hotel = await prisma.hotel.create({
      data: hotelInfo,
    });

    // Create rooms for this hotel
    for (const roomData of rooms) {
      await prisma.room.create({
        data: {
          hotelId: hotel.id,
          type: roomData.type,
          name: roomData.name,
          description: `${roomData.name} - Capacity for ${roomData.capacity} guests`,
          price: roomData.price,
          capacity: roomData.capacity,
          amenities: roomData.amenities,
          images: [hotelInfo.images[0]],
          isAvailable: roomData.available !== false,
        },
      });
    }

    console.log(`✅ Created hotel: ${hotel.name} with ${rooms.length} rooms`);
  }

  // Create some sample reviews
  console.log('⭐ Creating sample reviews...');
  const hotels = await prisma.hotel.findMany({ take: 5 });

  const reviews = [
    { rating: 5, comment: 'Amazing experience! The views were breathtaking and the staff was incredibly helpful.' },
    { rating: 4, comment: 'Great location and comfortable rooms. Would definitely come back.' },
    { rating: 5, comment: 'Perfect getaway! Everything exceeded our expectations.' },
    { rating: 4, comment: 'Beautiful property with excellent amenities. Highly recommended.' },
    { rating: 5, comment: 'One of the best hotels I have ever stayed at. Truly world-class service.' },
  ];

  for (let i = 0; i < hotels.length; i++) {
    await prisma.review.create({
      data: {
        userId: user.id,
        hotelId: hotels[i].id,
        rating: reviews[i].rating,
        comment: reviews[i].comment,
      },
    });
  }

  console.log(`✅ Created ${hotels.length} sample reviews`);

  // Summary
  const hotelCount = await prisma.hotel.count();
  const roomCount = await prisma.room.count();
  const userCount = await prisma.user.count();
  const reviewCount = await prisma.review.count();

  console.log('\n📊 Seed Summary:');
  console.log(`   Hotels: ${hotelCount}`);
  console.log(`   Rooms: ${roomCount}`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Reviews: ${reviewCount}`);
  console.log('\n✨ Database seeding completed successfully!');
  console.log('\n🔐 Test Credentials:');
  console.log('   Admin: admin@hotelstar.com / Admin123!');
  console.log('   User:  user@example.com / User123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
