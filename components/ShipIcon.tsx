import React from 'react';
import { shipPaths } from '../data/shipModels';

export const ShipIcon: React.FC<{ shipType: string; className?: string }> = ({ shipType, className }) => {
  const pathData = shipPaths[shipType] || shipPaths['default'];
  
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '1.25rem', height: '1.5rem' }} // Corresponds to w-5 h-6
    >
      <path d={pathData} stroke="white" strokeWidth="0.5" />
    </svg>
  );
};
