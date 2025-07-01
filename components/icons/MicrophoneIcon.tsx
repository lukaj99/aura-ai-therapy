
import React from 'react';

interface IconProps {
  className?: string;
}

const MicrophoneIcon: React.FC<IconProps> = ({ className }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12a7.5 7.5 0 1 1-15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75v6.75m0 0H9m3 0h3" />
    </svg>
  );
};

export default MicrophoneIcon;