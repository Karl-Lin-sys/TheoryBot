import React from 'react';

const PIANO_KEYS = [
  { note: 'C', isBlack: false },
  { note: 'C#', isBlack: true },
  { note: 'D', isBlack: false },
  { note: 'D#', isBlack: true },
  { note: 'E', isBlack: false },
  { note: 'F', isBlack: false },
  { note: 'F#', isBlack: true },
  { note: 'G', isBlack: false },
  { note: 'G#', isBlack: true },
  { note: 'A', isBlack: false },
  { note: 'A#', isBlack: true },
  { note: 'B', isBlack: false },
];

const KEYS = [...PIANO_KEYS, ...PIANO_KEYS].map((k, i) => ({ ...k, id: i }));

const FLAT_TO_SHARP: Record<string, string> = {
  'DB': 'C#',
  'EB': 'D#',
  'GB': 'F#',
  'AB': 'G#',
  'BB': 'A#',
};

export function PianoKeyboard({ activeNotes }: { activeNotes: string[] }) {
  const normalizedActive = activeNotes.map(n => {
    let note = n.replace(/[0-9]/g, '').toUpperCase();
    return FLAT_TO_SHARP[note] || note;
  });
  const numWhiteKeys = KEYS.filter(k => !k.isBlack).length;
  
  let whiteKeyIndex = 0;
  
  return (
    <div className="relative h-48 w-full max-w-2xl mx-auto border-2 border-slate-800 rounded-b-md bg-slate-800 select-none">
      {KEYS.map((key) => {
        const isActive = normalizedActive.includes(key.note);
        
        if (!key.isBlack) {
          const left = `${(whiteKeyIndex / numWhiteKeys) * 100}%`;
          const width = `${(1 / numWhiteKeys) * 100}%`;
          whiteKeyIndex++;
          
          return (
            <div
              key={key.id}
              className={`absolute top-0 bottom-0 border-r border-slate-300 rounded-b-md flex items-end justify-center pb-4 transition-colors ${
                isActive ? 'bg-blue-200' : 'bg-white'
              }`}
              style={{ left, width }}
            >
              <span className={`text-sm font-bold ${isActive ? 'text-blue-800' : 'text-slate-400'}`}>
                {key.note}
              </span>
            </div>
          );
        } else {
          // Black key
          const left = `${(whiteKeyIndex / numWhiteKeys) * 100}%`;
          const width = `${(0.6 / numWhiteKeys) * 100}%`;
          
          return (
            <div
              key={key.id}
              className={`absolute top-0 h-2/3 rounded-b-md border border-slate-900 flex items-end justify-center pb-2 transition-colors z-10 ${
                isActive ? 'bg-blue-600' : 'bg-slate-900'
              }`}
              style={{ 
                left, 
                width,
                transform: 'translateX(-50%)'
              }}
            >
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {key.note}
              </span>
            </div>
          );
        }
      })}
    </div>
  );
}

