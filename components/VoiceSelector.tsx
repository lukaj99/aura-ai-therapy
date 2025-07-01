
import React from 'react';

interface VoiceSelectorProps {
  selectedVoice: 'male' | 'female';
  onVoiceChange: (voice: 'male' | 'female') => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange }) => {
  const getButtonClass = (voice: 'male' | 'female') => {
    const baseClass = "px-6 py-2 rounded-full text-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
    if (selectedVoice === voice) {
      return `${baseClass} bg-brand-secondary text-white shadow-md`;
    }
    return `${baseClass} bg-slate-700 text-slate-300 hover:bg-slate-600`;
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <label className="text-slate-300 font-medium text-lg">Choose Aura's Voice</label>
      <div className="flex items-center space-x-4 bg-slate-800 p-2 rounded-full">
        <button
          onClick={() => onVoiceChange('male')}
          className={getButtonClass('male')}
          aria-pressed={selectedVoice === 'male'}
        >
          Male
        </button>
        <button
          onClick={() => onVoiceChange('female')}
          className={getButtonClass('female')}
          aria-pressed={selectedVoice === 'female'}
        >
          Female
        </button>
      </div>
    </div>
  );
};

export default VoiceSelector;
