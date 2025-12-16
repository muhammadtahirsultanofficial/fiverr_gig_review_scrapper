import { deduplicateReviews, reviewsToCSV } from '../lib/scraper';
import { Review } from '../lib/types';

describe('Scraper Utilities', () => {
  describe('deduplicateReviews', () => {
    it('should remove duplicate reviews', () => {
      const reviews: Review[] = [
        {
          reviewer: "John Doe",
          rating: 5,
          text: "Great service!",
          date: "2023-10-15"
        },
        {
          reviewer: "Jane Smith",
          rating: 4,
          text: "Good work",
          date: "2023-10-10"
        },
        {
          reviewer: "John Doe",
          rating: 5,
          text: "Great service!",
          date: "2023-10-15" // Same as first review
        }
      ];

      const uniqueReviews = deduplicateReviews(reviews);
      
      expect(uniqueReviews).toHaveLength(2);
      expect(uniqueReviews[0]).toEqual(reviews[0]);
      expect(uniqueReviews[1]).toEqual(reviews[1]);
    });

    it('should handle empty array', () => {
      const reviews: Review[] = [];
      const uniqueReviews = deduplicateReviews(reviews);
      
      expect(uniqueReviews).toHaveLength(0);
    });
  });

  describe('reviewsToCSV', () => {
    it('should convert reviews to CSV format', () => {
      const reviews: Review[] = [
        {
          reviewer: "John Doe",
          rating: 5,
          text: "Great service!",
          date: "2023-10-15"
        },
        {
          reviewer: "Jane Smith",
          rating: 4,
          text: "Good work",
          date: "2023-10-10"
        }
      ];

      const csv = reviewsToCSV(reviews);
      const expected = `Reviewer Name,Rating,Review Text,Review Date
"John Doe",5,"Great service!","2023-10-15"
"Jane Smith",4,"Good work","2023-10-10"`;

      expect(csv).toBe(expected);
    });

    it('should handle empty array', () => {
      const reviews: Review[] = [];
      const csv = reviewsToCSV(reviews);
      const expected = "Reviewer Name,Rating,Review Text,Review Date";

      expect(csv).toBe(expected);
    });

    it('should escape quotes in review text', () => {
      const reviews: Review[] = [
        {
          reviewer: "John Doe",
          rating: 5,
          text: 'Great service! "Highly recommended"',
          date: "2023-10-15"
        }
      ];

      const csv = reviewsToCSV(reviews);
      const expected = `Reviewer Name,Rating,Review Text,Review Date
"John Doe",5,"Great service! ""Highly recommended""","2023-10-15"`;

      expect(csv).toBe(expected);
    });
  });
});