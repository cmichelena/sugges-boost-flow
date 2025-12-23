import { useState, useEffect } from "react";
import { Currency, getCurrencyForCountry, EU_COUNTRIES, UK_COUNTRIES } from "@/lib/pricing-config";

interface GeoLocation {
  countryCode: string | null;
  currency: Currency;
  isEU: boolean;
  isUK: boolean;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = "suggistit_geo_location";

interface StoredLocation {
  countryCode: string;
  timestamp: number;
}

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const useGeoLocation = () => {
  const [location, setLocation] = useState<GeoLocation>({
    countryCode: null,
    currency: "EUR", // Default to EUR
    isEU: true, // Default to EU
    isUK: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const detectLocation = async () => {
      // Check localStorage cache first
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed: StoredLocation = JSON.parse(cached);
          const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
          
          if (!isExpired && parsed.countryCode) {
            const code = parsed.countryCode.toUpperCase();
            setLocation({
              countryCode: code,
              currency: getCurrencyForCountry(code),
              isEU: EU_COUNTRIES.includes(code),
              isUK: UK_COUNTRIES.includes(code),
              loading: false,
              error: null,
            });
            return;
          }
        }
      } catch {
        // Ignore cache errors
      }

      // Use free IP geolocation API
      try {
        const response = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok) {
          throw new Error("Failed to detect location");
        }
        
        const data = await response.json();
        const countryCode = data.country_code?.toUpperCase() || null;
        
        if (countryCode) {
          // Cache the result
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              countryCode,
              timestamp: Date.now(),
            })
          );
          
          setLocation({
            countryCode,
            currency: getCurrencyForCountry(countryCode),
            isEU: EU_COUNTRIES.includes(countryCode),
            isUK: UK_COUNTRIES.includes(countryCode),
            loading: false,
            error: null,
          });
        } else {
          // Default to EUR if detection fails
          setLocation({
            countryCode: null,
            currency: "EUR",
            isEU: true,
            isUK: false,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        console.warn("Geo detection failed, defaulting to EUR:", err);
        // Default to EUR on error (EU-first approach)
        setLocation({
          countryCode: null,
          currency: "EUR",
          isEU: true,
          isUK: false,
          loading: false,
          error: null,
        });
      }
    };

    detectLocation();
  }, []);

  // Allow manual currency override
  const setCurrency = (currency: Currency) => {
    setLocation((prev) => ({
      ...prev,
      currency,
    }));
  };

  return {
    ...location,
    setCurrency,
  };
};
