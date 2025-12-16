"use client";

import { useState } from "react";
import { Review } from '@/lib/types';

export default function Home() {
  const [gigUrl, setGigUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [progress, setProgress] = useState("");

  const extractReviews = async () => {
    if (!gigUrl) return;
    
    setIsLoading(true);
    setProgress("Extracting reviews from the gig page...");
    setReviews([]);
    
    try {
      const response = await fetch('/api/extract-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: gigUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          // Handle rate limiting
          const retryAfter = data.retryAfter || 60000;
          const minutes = Math.ceil(retryAfter / 60000);
          throw new Error(`Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
        }
        throw new Error(data.error || 'Failed to extract reviews');
      }
      
      setReviews(data.reviews);
      setProgress(`Successfully extracted ${data.reviews.length} reviews!`);
    } catch (error: any) {
      console.error("Error extracting reviews:", error);
      setProgress(error.message || "Error extracting reviews. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reviews.length === 0) return;
    
    // Create CSV content
    const headers = ["Reviewer Name", "Rating", "Review Text", "Review Date", "Country"];
    const csvContent = [
      headers.join(","),
      ...reviews.map(review => 
        `"${review.reviewer.replace(/"/g, '""')}",${review.rating},"${review.text.replace(/"/g, '""')}","${review.date}","${(review as any).country || ''}"`
      )
    ].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "fiverr_reviews.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8">
      <main className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
          Fiverr Gig Review Extractor
        </h1>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="url"
              value={gigUrl}
              onChange={(e) => setGigUrl(e.target.value)}
              placeholder="Enter Fiverr gig URL (e.g., https://www.fiverr.com/user/gig-name)"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-700"
              disabled={isLoading}
            />
            <button
              onClick={extractReviews}
              disabled={isLoading || !gigUrl}
              className={`px-6 py-2 rounded-lg font-medium ${
                isLoading || !gigUrl
                  ? "bg-gray-300 cursor-not-allowed dark:bg-gray-700"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? "Extracting..." : "Extract Reviews"}
            </button>
          </div>
          
          {progress && (
            <div className={`mb-4 p-3 rounded-lg ${
              progress.includes("Error") || progress.includes("exceeded") 
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }`}>
              {progress}
            </div>
          )}
          
          {reviews.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Extracted Reviews ({reviews.length})
                </h2>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Export to CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Reviewer</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Rating</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Review</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reviews.map((review, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{review.reviewer}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {review.rating}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{review.text}</td>
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{review.date}</td>
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{(review as any).country || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Note about implementation limitations */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg dark:bg-yellow-900 dark:border-yellow-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> This tool extracts publicly available review data from Fiverr gig pages. 
                Please ensure your use complies with Fiverr's Terms of Service and applicable laws. 
                The tool implements rate limiting to prevent abuse.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}