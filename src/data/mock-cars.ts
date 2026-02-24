import type { CarRentalSearchResult, VehicleType } from '../types/index.js';

const mockCars: CarRentalSearchResult[] = [
  // Paris
  { id: 'car-1', company: 'Europcar', vehicleType: 'economy', vehicleName: 'Renault Clio', city: 'Paris', country: 'France', pricePerDay: 32, features: ['air_conditioning', 'bluetooth'], availableUnits: 8, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'manual' },
  { id: 'car-2', company: 'Sixt', vehicleType: 'sedan', vehicleName: 'Peugeot 508', city: 'Paris', country: 'France', pricePerDay: 65, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control'], availableUnits: 4, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-3', company: 'Hertz', vehicleType: 'luxury', vehicleName: 'Mercedes E-Class', city: 'Paris', country: 'France', pricePerDay: 180, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'heated_seats'], availableUnits: 2, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 5, transmission: 'automatic' },

  // London
  { id: 'car-4', company: 'Avis', vehicleType: 'compact', vehicleName: 'Vauxhall Corsa', city: 'London', country: 'United Kingdom', pricePerDay: 38, features: ['air_conditioning', 'bluetooth'], availableUnits: 10, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'manual' },
  { id: 'car-5', company: 'Enterprise', vehicleType: 'suv', vehicleName: 'Range Rover Sport', city: 'London', country: 'United Kingdom', pricePerDay: 110, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'parking_sensors'], availableUnits: 3, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 5, transmission: 'automatic' },

  // Tokyo
  { id: 'car-6', company: 'Budget', vehicleType: 'economy', vehicleName: 'Toyota Yaris', city: 'Tokyo', country: 'Japan', pricePerDay: 28, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 12, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'automatic' },
  { id: 'car-7', company: 'National', vehicleType: 'sedan', vehicleName: 'Toyota Camry', city: 'Tokyo', country: 'Japan', pricePerDay: 55, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control'], availableUnits: 6, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-8', company: 'Hertz', vehicleType: 'van', vehicleName: 'Toyota HiAce', city: 'Tokyo', country: 'Japan', pricePerDay: 95, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 3, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 8, transmission: 'automatic' },

  // Bali
  { id: 'car-9', company: 'Europcar', vehicleType: 'compact', vehicleName: 'Toyota Avanza', city: 'Bali', country: 'Indonesia', pricePerDay: 25, features: ['air_conditioning'], availableUnits: 15, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'manual' },
  { id: 'car-10', company: 'Avis', vehicleType: 'suv', vehicleName: 'Toyota Fortuner', city: 'Bali', country: 'Indonesia', pricePerDay: 70, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 5, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 7, transmission: 'automatic' },

  // New York
  { id: 'car-11', company: 'Hertz', vehicleType: 'economy', vehicleName: 'Nissan Versa', city: 'New York', country: 'United States', pricePerDay: 40, features: ['air_conditioning', 'bluetooth'], availableUnits: 9, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-12', company: 'Enterprise', vehicleType: 'sedan', vehicleName: 'Chevrolet Malibu', city: 'New York', country: 'United States', pricePerDay: 72, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control'], availableUnits: 5, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-13', company: 'Sixt', vehicleType: 'luxury', vehicleName: 'BMW 5 Series', city: 'New York', country: 'United States', pricePerDay: 200, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'heated_seats', 'sunroof'], availableUnits: 2, source: 'mock', cancellationPolicy: 'non_refundable', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-14', company: 'Budget', vehicleType: 'convertible', vehicleName: 'Ford Mustang Convertible', city: 'New York', country: 'United States', pricePerDay: 150, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control'], availableUnits: 3, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 4, transmission: 'automatic' },

  // Dubai
  { id: 'car-15', company: 'Hertz', vehicleType: 'luxury', vehicleName: 'Audi A6', city: 'Dubai', country: 'United Arab Emirates', pricePerDay: 160, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'heated_seats'], availableUnits: 4, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-16', company: 'Sixt', vehicleType: 'convertible', vehicleName: 'Porsche 911 Cabriolet', city: 'Dubai', country: 'United Arab Emirates', pricePerDay: 300, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'sport_mode'], availableUnits: 1, source: 'mock', cancellationPolicy: 'non_refundable', passengerCapacity: 2, transmission: 'automatic' },
  { id: 'car-17', company: 'Enterprise', vehicleType: 'suv', vehicleName: 'Nissan Patrol', city: 'Dubai', country: 'United Arab Emirates', pricePerDay: 120, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control', 'parking_sensors'], availableUnits: 6, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 7, transmission: 'automatic' },

  // Barcelona
  { id: 'car-18', company: 'Europcar', vehicleType: 'economy', vehicleName: 'SEAT Ibiza', city: 'Barcelona', country: 'Spain', pricePerDay: 30, features: ['air_conditioning', 'bluetooth'], availableUnits: 11, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'manual' },
  { id: 'car-19', company: 'Avis', vehicleType: 'compact', vehicleName: 'Volkswagen Golf', city: 'Barcelona', country: 'Spain', pricePerDay: 45, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 7, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },

  // Bangkok
  { id: 'car-20', company: 'Budget', vehicleType: 'economy', vehicleName: 'Honda City', city: 'Bangkok', country: 'Thailand', pricePerDay: 22, features: ['air_conditioning', 'bluetooth'], availableUnits: 14, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'automatic' },
  { id: 'car-21', company: 'National', vehicleType: 'van', vehicleName: 'Toyota Commuter', city: 'Bangkok', country: 'Thailand', pricePerDay: 85, features: ['air_conditioning', 'bluetooth'], availableUnits: 4, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 12, transmission: 'automatic' },

  // Rome
  { id: 'car-22', company: 'Hertz', vehicleType: 'compact', vehicleName: 'Fiat 500', city: 'Rome', country: 'Italy', pricePerDay: 35, features: ['air_conditioning', 'bluetooth'], availableUnits: 9, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 4, transmission: 'manual' },
  { id: 'car-23', company: 'Sixt', vehicleType: 'convertible', vehicleName: 'Fiat 500C', city: 'Rome', country: 'Italy', pricePerDay: 100, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 3, source: 'mock', cancellationPolicy: 'partial', passengerCapacity: 4, transmission: 'manual' },

  // Sydney
  { id: 'car-24', company: 'Avis', vehicleType: 'sedan', vehicleName: 'Hyundai Sonata', city: 'Sydney', country: 'Australia', pricePerDay: 58, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control'], availableUnits: 7, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-25', company: 'Enterprise', vehicleType: 'suv', vehicleName: 'Toyota RAV4', city: 'Sydney', country: 'Australia', pricePerDay: 85, features: ['air_conditioning', 'bluetooth', 'gps', 'cruise_control', 'parking_sensors'], availableUnits: 5, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },

  // Singapore
  { id: 'car-26', company: 'Hertz', vehicleType: 'sedan', vehicleName: 'Honda Civic', city: 'Singapore', country: 'Singapore', pricePerDay: 68, features: ['air_conditioning', 'bluetooth', 'gps'], availableUnits: 6, source: 'mock', cancellationPolicy: 'free', passengerCapacity: 5, transmission: 'automatic' },
  { id: 'car-27', company: 'Sixt', vehicleType: 'luxury', vehicleName: 'Mercedes S-Class', city: 'Singapore', country: 'Singapore', pricePerDay: 250, features: ['air_conditioning', 'bluetooth', 'gps', 'leather_seats', 'cruise_control', 'heated_seats', 'massage_seats'], availableUnits: 1, source: 'mock', cancellationPolicy: 'non_refundable', passengerCapacity: 5, transmission: 'automatic' },
];

export function generateMockCars(params?: {
  city?: string;
  vehicleType?: VehicleType;
  minPrice?: number;
  maxPrice?: number;
  transmission?: 'automatic' | 'manual';
}): CarRentalSearchResult[] {
  let results = [...mockCars];

  if (params?.city) {
    const city = params.city.toLowerCase();
    results = results.filter((c) => c.city.toLowerCase().includes(city));
  }
  if (params?.vehicleType) {
    results = results.filter((c) => c.vehicleType === params.vehicleType);
  }
  if (params?.minPrice != null) {
    results = results.filter((c) => c.pricePerDay >= params.minPrice!);
  }
  if (params?.maxPrice != null) {
    results = results.filter((c) => c.pricePerDay <= params.maxPrice!);
  }
  if (params?.transmission) {
    results = results.filter((c) => c.transmission === params.transmission);
  }

  return results;
}
