import React from 'react';

const STRINGS = ['E', 'A', 'D', 'G', 'B', 'E'].reverse(); // High E to Low E
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteAtFret(openString: string, fret: number) {
  const startIndex = NOTES.indexOf(openString);
  return NOTES[(startIndex + fret) % 12];
}

const FLAT_TO_SHARP: Record<string, string> = {
  'DB': 'C#',
  'EB': 'D#',
  'GB': 'F#',
  'AB': 'G#',
  'BB': 'A#',
};

export function GuitarFretboard({ activeNotes }: { activeNotes: string[] }) {
  const normalizedActive = activeNotes.map(n => {
    let note = n.replace(/[0-9]/g, '').toUpperCase();
    return FLAT_TO_SHARP[note] || note;
  });
  const numFrets = 12;

  return (
    <div className="w-full max-w-3xl mx-auto overflow-x-auto">
      <div className="relative min-w-[600px] bg-amber-900 border-4 border-amber-950 rounded-sm p-4">
        {/* Frets */}
        <div className="absolute top-0 bottom-0 left-8 right-4 flex justify-between pointer-events-none">
          {Array.from({ length: numFrets + 1 }).map((_, i) => (
            <div key={i} className="w-1 bg-slate-300 h-full shadow-sm" />
          ))}
        </div>

        {/* Fret markers */}
        <div className="absolute top-1/2 left-8 right-4 flex justify-between pointer-events-none -translate-y-1/2">
          {Array.from({ length: numFrets }).map((_, i) => {
            const fretNum = i + 1;
            const isMarker = [3, 5, 7, 9, 12].includes(fretNum);
            return (
              <div key={i} className="flex-1 flex justify-center items-center">
                {isMarker && (
                  <div className="w-4 h-4 rounded-full bg-slate-200 opacity-50" />
                )}
              </div>
            );
          })}
        </div>

        {/* Strings */}
        <div className="relative flex flex-col justify-between h-48">
          {STRINGS.map((stringNote, stringIndex) => (
            <div key={stringIndex} className="relative flex items-center">
              {/* String line */}
              <div 
                className="absolute left-0 right-0 bg-slate-300 shadow-sm" 
                style={{ height: `${1 + stringIndex * 0.5}px` }} 
              />
              
              {/* Open string note */}
              <div className="w-8 flex justify-center z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  normalizedActive.includes(stringNote) ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {stringNote}
                </div>
              </div>

              {/* Fretted notes */}
              <div className="flex-1 flex justify-between pl-2">
                {Array.from({ length: numFrets }).map((_, fretIndex) => {
                  const note = getNoteAtFret(stringNote, fretIndex + 1);
                  const isActive = normalizedActive.includes(note);
                  
                  return (
                    <div key={fretIndex} className="flex-1 flex justify-center items-center z-10">
                      {isActive && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
                          {note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
