import React, { createContext, useContext, useState, useRef, useEffect } from "react";

const LoadingContext = createContext();
const MIN_LOADER_DURATION = 4000;

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const loaderStartTimeRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const startLoading = () => {
    if (requestCount === 0) {
      setIsLoading(true);
      loaderStartTimeRef.current = Date.now();
    }
    setRequestCount((prev) => prev + 1);
  };

  const stopLoading = () => {
    setRequestCount((prev) => {
      const newCount = Math.max(0, prev - 1);
      if (newCount === 0 && loaderStartTimeRef.current) {
        const elapsed = Date.now() - loaderStartTimeRef.current;
        const remainingTime = Math.max(0, MIN_LOADER_DURATION - elapsed);

        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          loaderStartTimeRef.current = null;
        }, remainingTime);
      }
      return newCount;
    });
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
}
