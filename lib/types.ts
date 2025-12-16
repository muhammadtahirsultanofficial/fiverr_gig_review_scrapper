export interface Review {
  reviewer: string;
  rating: number;
  text: string;
  date: string;
  country?: string; // Optional country field
}