
import React from 'react';
import { SessionStatus } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import SpinnerIcon from './icons/SpinnerIcon';

interface StatusIndicatorProps {
  status: SessionStatus;
  onClick: () => void;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, onClick }) => {
  const getStatusContent = () => {
    switch (status) {
      case SessionStatus.LISTENING:
        return {
          icon: <MicrophoneIcon className="h-10 w-10 text-white" />,
          text: 'Listening...',
          buttonClass: 'bg-red-500 hover:bg-red-600 animate-pulse-glow',
        };
      case SessionStatus.SPEAKING:
        return {
          icon: <SpeakerIcon className="h-10 w-10 text-white" />,
          text: 'Aura is speaking...',
          buttonClass: 'bg-purple-500 cursor-not-allowed',
        };
      case SessionStatus.THINKING:
        return {
          icon: <SpinnerIcon className="h-10 w-10 text-white animate-spin" />,
          text: 'Thinking...',
          buttonClass: 'bg-yellow-500 cursor-not-allowed',
        };
      case SessionStatus.ERROR:
        return {
          icon: <MicrophoneIcon className="h-10 w-10 text-white" />,
          text: 'Error, Click to Retry',
          buttonClass: 'bg-gray-700 hover:bg-gray-600',
        };
      case SessionStatus.IDLE:
      default:
        return {
          icon: <MicrophoneIcon className="h-10 w-10 text-white" />,
          text: 'Start Session',
          buttonClass: 'bg-brand-secondary hover:bg-blue-500',
        };
    }
  };

  const { icon, text, buttonClass } = getStatusContent();
  const isDisabled = status === SessionStatus.THINKING || status === SessionStatus.SPEAKING;

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`relative flex items-center justify-center h-24 w-24 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-300/50 shadow-lg ${buttonClass}`}
        aria-label={text}
      >
        {icon}
      </button>
      <p className="text-slate-300 font-medium text-lg h-6">{text}</p>
    </div>
  );
};

export default StatusIndicator;