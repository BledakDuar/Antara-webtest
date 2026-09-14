import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerBannerProps {
  totalMinutes: number;
  onExpire: () => void;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({
  totalMinutes,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(totalMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 180; // less than 3 minutes

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={`sticky top-16 z-30 transition-colors border-b px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between ${
        isUrgent
          ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
          : 'bg-purple-50 text-purple-900 border-purple-200/80'
      }`}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          ) : (
            <Clock className="w-4 h-4 text-purple-600" />
          )}
          <span>
            {isUrgent
              ? 'Waktu pengerjaan hampir habis. Mohon segera selesaikan jawaban Anda.'
              : 'Sisa waktu pengerjaan tes:'}
          </span>
        </div>
        <div className="font-mono text-sm sm:text-base font-bold tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current shadow-xs">
          {formatNumber(minutes)}:{formatNumber(seconds)}
        </div>
      </div>
    </div>
  );
};
