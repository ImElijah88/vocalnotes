import React from 'react';
import { Point } from '../types';

interface SelectionBoxProps {
  start: Point;
  end: Point;
  zoom: number;
  pan: Point;
}

const SelectionBox: React.FC<SelectionBoxProps> = ({ start, end, zoom, pan }) => {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <svg 
      className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none"
      style={{ zIndex: 100 }}
    >
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="rgba(0, 255, 255, 0.05)"
        stroke="#00FFFF"
        strokeWidth={2 / zoom}
        strokeDasharray="10 5"
        className="animate-[marchingAnts_0.5s_linear_infinite]"
      />
      <style>{`
        @keyframes marchingAnts {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 15; }
        }
      `}</style>
    </svg>
  );
};

export default SelectionBox;
