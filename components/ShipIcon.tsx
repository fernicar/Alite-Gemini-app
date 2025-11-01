import React from 'react';
import { shipPaths } from '../data/shipModels';

// FIX: Added `style` prop to allow passing dynamic CSS properties like `transform`.
// The component was being passed a `style` prop for rotation, but its props type
// did not declare it, causing a TypeScript error.
export const ShipIcon: React.FC<{ shipType: string; className?: string; style?: React.CSSProperties }> = ({ shipType, className, style }) => {
  const pathData = shipPaths[shipType] || shipPaths['default'];
  
  // Merge the passed style with the default size to ensure the icon renders correctly.
  // The inline style will take precedence over className, which matches the original behavior.
  const finalStyle: React.CSSProperties = {
    width: '1.25rem',
    height: '1.5rem', // Corresponds to w-5 h-6
    ...style,
  };

  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      style={finalStyle}
    >
      <path d={pathData} stroke="white" strokeWidth="0.5" />
    </svg>
  );
};
