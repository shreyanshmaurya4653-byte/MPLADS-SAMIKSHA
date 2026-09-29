import React, { useState, useEffect } from 'react';
import { Globe, Clock, Eye, Volume2 } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function GovTopStrip() {
  const [currentTime, setCurrentTime] = useState('');
  const { language, toggleLanguage, t } = useLanguage();
  const [fontSize, setFontSize] = useState('normal');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setCurrentTime(now.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', options) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const handleFontSize = (size) => {
    setFontSize(size);
    const root = document.documentElement;
    if (size === 'small') {
      root.style.fontSize = '14px';
    } else if (size === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  };

  return (
    <div className="w-full select-none">
      {/* Indian National Tricolor Ribbon */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* Official Government Utility Bar */}
      <div className="bg-[#1e293b] text-slate-200 text-[11px] px-4 sm:px-6 lg:px-8 py-1.5 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Official Government of India Affiliation */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span className="text-[#FF9933] font-bold">भारत सरकार</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">Government of India</span>
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-300 text-[10.5px]">
              {language === 'hi' 
                ? 'सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय (MoSPI)' 
                : 'Ministry of Statistics and Programme Implementation (MoSPI)'}
            </span>
          </div>

          {/* Right: Accessibility & Language Controls */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Skip to Main Content */}
            <a
              href="#main-content"
              className="hidden lg:inline text-slate-400 hover:text-amber-300 text-[10.5px] transition-colors"
            >
              {t('skipToMain', 'Skip to Main Content')}
            </a>

            <span className="hidden lg:inline text-slate-600">|</span>

            {/* Accessibility Font Resizer */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              <button
                onClick={() => handleFontSize('small')}
                className={`px-1 rounded text-[10px] font-bold hover:bg-slate-700 ${fontSize === 'small' ? 'text-amber-400 font-extrabold' : 'text-slate-300'}`}
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                onClick={() => handleFontSize('normal')}
                className={`px-1 rounded text-[10px] font-bold hover:bg-slate-700 ${fontSize === 'normal' ? 'text-amber-400 font-extrabold' : 'text-slate-300'}`}
                title="Default Font Size"
              >
                A
              </button>
              <button
                onClick={() => handleFontSize('large')}
                className={`px-1 rounded text-[10px] font-bold hover:bg-slate-700 ${fontSize === 'large' ? 'text-amber-400 font-extrabold' : 'text-slate-300'}`}
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            <span className="text-slate-600">|</span>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[10.5px] text-amber-300 font-semibold border border-slate-700 transition-colors shadow-2xs cursor-pointer"
              title={language === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
            >
              <Globe size={11} className="text-amber-400" />
              <span className="tracking-wide">{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            <span className="hidden sm:inline text-slate-600">|</span>

            {/* Real-time Clock (IST) */}
            <div className="hidden sm:flex items-center gap-1 text-slate-300 text-[10.5px]">
              <Clock size={11} className="text-amber-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
