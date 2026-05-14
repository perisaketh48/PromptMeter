import React, { createContext, useContext, useState } from "react";

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const startLoading = () => {
    setRequestCount((prev) => prev + 1);
    setIsLoading(true);
  };

  const stopLoading = () => {
    setRequestCount((prev) => Math.max(0, prev - 1));
  };

  // When request count reaches 0, actually stop showing the loader
  React.useEffect(() => {
    if (requestCount === 0) {
      setIsLoading(false);
    }
  }, [requestCount]);

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
