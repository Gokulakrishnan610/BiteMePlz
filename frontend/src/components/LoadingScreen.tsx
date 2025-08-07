import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [currentLetter, setCurrentLetter] = useState(0);
  const [showWhiteTransition, setShowWhiteTransition] = useState(false);
  const [purpleFalling, setPurpleFalling] = useState(false);
  const [recGrowing, setRecGrowing] = useState(false);
  const letters = ["R", "E", "C"];

  useEffect(() => {
    // Start purple falling effect - reduced delay
    setTimeout(() => setPurpleFalling(true), 200);

    // Start showing letters - faster timing
    const letterTimer = setInterval(() => {
      setCurrentLetter((prev) => {
        if (prev < letters.length - 1) {
          return prev + 1;
        } else {
          // Start REC growing effect - reduced delays
          setTimeout(() => {
            setRecGrowing(true);
            // Start white transition - faster transition
            setTimeout(() => {
              setShowWhiteTransition(true);
              setTimeout(onComplete, 500); // Reduced from 1000ms
            }, 800); // Reduced from 1500ms
          }, 600); // Reduced from 1000ms
          return prev;
        }
      });
    }, 400); // Reduced from 1000ms

    return () => clearInterval(letterTimer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Purple falling background */}
      <div
        className={`absolute inset-0 bg-[#6a1b9a] transition-transform duration-[1000ms] ease-out ${
          purpleFalling ? "transform translate-y-0" : "transform -translate-y-full"
        }`}
      />

      {/* White transition overlay */}
      <div
        className={`absolute inset-0 bg-white transition-opacity duration-500 ${
          showWhiteTransition ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* REC Letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex space-x-4 md:space-x-6">
          {letters.map((letter, index) => (
            <div
              key={index}
              className={`font-bold transition-all duration-800 font-sans ${
                index <= currentLetter ? "opacity-100" : "opacity-0"
              } ${
                recGrowing
                  ? "text-[10rem] md:text-[14rem] lg:text-[18rem] scale-125"
                  : "text-6xl md:text-7xl lg:text-8xl scale-100"
              } ${showWhiteTransition ? "text-[#6a1b9a]" : "text-white"}`}
              style={{
                animationDelay: `${index * 400}ms`,
                transition: "all 0.8s ease-out",
              }}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;