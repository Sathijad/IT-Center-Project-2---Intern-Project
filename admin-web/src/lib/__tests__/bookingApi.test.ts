import { describe, it, expect } from 'vitest'
import * as bookingApi from '../bookingApi'

describe('bookingApi', () => {
  // These tests verify that the API functions are exported and have the correct signatures
  // Full integration testing is done in the page component tests

  describe('Room endpoints', () => {
    it('should export getRooms function', () => {
      expect(typeof bookingApi.getRooms).toBe('function')
    })

    it('should export getRoom function', () => {
      expect(typeof bookingApi.getRoom).toBe('function')
    })

    it('should export createRoom function', () => {
      expect(typeof bookingApi.createRoom).toBe('function')
    })

    it('should export updateRoom function', () => {
      expect(typeof bookingApi.updateRoom).toBe('function')
    })

    it('should export deleteRoom function', () => {
      expect(typeof bookingApi.deleteRoom).toBe('function')
    })

    it('should export getRoomAvailability function', () => {
      expect(typeof bookingApi.getRoomAvailability).toBe('function')
    })
  })

  describe('Booking endpoints', () => {
    it('should export createBooking function', () => {
      expect(typeof bookingApi.createBooking).toBe('function')
    })

    it('should export getBooking function', () => {
      expect(typeof bookingApi.getBooking).toBe('function')
    })

    it('should export listBookings function', () => {
      expect(typeof bookingApi.listBookings).toBe('function')
    })

    it('should export cancelBooking function', () => {
      expect(typeof bookingApi.cancelBooking).toBe('function')
    })
  })

  describe('Blackout endpoints', () => {
    it('should export createBlackout function', () => {
      expect(typeof bookingApi.createBlackout).toBe('function')
    })

    it('should export listBlackouts function', () => {
      expect(typeof bookingApi.listBlackouts).toBe('function')
    })

    it('should export updateBlackout function', () => {
      expect(typeof bookingApi.updateBlackout).toBe('function')
    })

    it('should export deleteBlackout function', () => {
      expect(typeof bookingApi.deleteBlackout).toBe('function')
    })
  })

  describe('ICS Export', () => {
    it('should export exportBookingsICS function', () => {
      expect(typeof bookingApi.exportBookingsICS).toBe('function')
    })
  })
})

