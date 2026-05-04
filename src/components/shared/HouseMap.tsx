import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useProfileStore, useTaskStore } from '../../store';
import { useAllTasks } from '../../lib/useAllTasks';
import { ROOMS } from '../../data/rooms';
import { ROOM_IMAGES } from '../../data/roomImages';
import { isTaskDue } from '../../lib/taskUtils';
import { shouldShowTask, getRoomDisplayName } from '../../lib/personaUtils';

// Clue board-style room layout
// Grid is 12 cols x 10 rows — rooms are positioned within it
// Each room has a distinct "Clue" color
interface ClueRoom {
  id: string;
  col: number;   // grid col start (1-based)
  row: number;   // grid row start (1-based)
  colSpan: number;
  rowSpan: number;
  color: string;       // rich room fill
  borderColor: string; // room wall color
  floor: 'downstairs' | 'upstairs';
}

const CLUE_ROOMS: ClueRoom[] = [
  // ─── DOWNSTAIRS ───
  { id: 'living_room',      col: 1,  row: 1, colSpan: 4, rowSpan: 4, color: '#8B2252', borderColor: '#C43B6B', floor: 'downstairs' },
  { id: 'foyer',            col: 5,  row: 1, colSpan: 4, rowSpan: 2, color: '#4A4A6A', borderColor: '#7272A0', floor: 'downstairs' },
  { id: 'rumpus_room',      col: 9,  row: 1, colSpan: 4, rowSpan: 4, color: '#1B5E20', borderColor: '#388E3C', floor: 'downstairs' },
  { id: 'mom_office',       col: 5,  row: 3, colSpan: 4, rowSpan: 3, color: '#4A148C', borderColor: '#7B1FA2', floor: 'downstairs' },
  { id: 'kitchen',          col: 1,  row: 5, colSpan: 4, rowSpan: 3, color: '#E65100', borderColor: '#F57C00', floor: 'downstairs' },
  { id: 'gym',              col: 9,  row: 5, colSpan: 4, rowSpan: 3, color: '#0D47A1', borderColor: '#1976D2', floor: 'downstairs' },
  { id: 'laundry_room',     col: 1,  row: 8, colSpan: 4, rowSpan: 3, color: '#37474F', borderColor: '#607D8B', floor: 'downstairs' },
  { id: 'powder_bathroom',  col: 5,  row: 6, colSpan: 4, rowSpan: 2, color: '#006064', borderColor: '#00838F', floor: 'downstairs' },

  // ─── UPSTAIRS ───
  { id: 'primary_bedroom',  col: 1,  row: 1, colSpan: 5, rowSpan: 4, color: '#8B2252', borderColor: '#C43B6B', floor: 'upstairs' },
  { id: 'dad_office',       col: 6,  row: 1, colSpan: 3, rowSpan: 3, color: '#4A148C', borderColor: '#7B1FA2', floor: 'upstairs' },
  { id: 'bash_room',        col: 9,  row: 1, colSpan: 4, rowSpan: 4, color: '#1B5E20', borderColor: '#388E3C', floor: 'upstairs' },
  { id: 'primary_closet',   col: 1,  row: 5, colSpan: 3, rowSpan: 3, color: '#37474F', borderColor: '#607D8B', floor: 'upstairs' },
  { id: 'primary_bathroom', col: 4,  row: 5, colSpan: 3, rowSpan: 3, color: '#006064', borderColor: '#00838F', floor: 'upstairs' },
  { id: 'guest_room',       col: 7,  row: 4, colSpan: 3, rowSpan: 4, color: '#E65100', borderColor: '#F57C00', floor: 'upstairs' },
  { id: 'bash_bathroom',    col: 10, row: 5, colSpan: 3, rowSpan: 3, color: '#0D47A1', borderColor: '#1976D2', floor: 'upstairs' },
  { id: 'playroom',         col: 1,  row: 8, colSpan: 12, rowSpan: 3, color: '#BF360C', borderColor: '#E64A19', floor: 'upstairs' },
];

// Hallway connectors (decorative paths between rooms)
interface Hallway {
  x1: number; y1: number; x2: number; y2: number;
  floor: 'downstairs' | 'upstairs';
}

const HALLWAYS: Hallway[] = [
  // Downstairs corridors
  { x1: 4, y1: 2, x2: 5, y2: 2, floor: 'downstairs' },
  { x1: 8, y1: 2, x2: 9, y2: 2, floor: 'downstairs' },
  { x1: 4, y1: 6, x2: 5, y2: 6, floor: 'downstairs' },
  { x1: 8, y1: 6, x2: 9, y2: 6, floor: 'downstairs' },
  { x1: 6, y1: 5, x2: 6, y2: 6, floor: 'downstairs' },
  // Upstairs corridors
  { x1: 5, y1: 3, x2: 6, y2: 3, floor: 'upstairs' },
  { x1: 8, y1: 3, x2: 9, y2: 3, floor: 'upstairs' },
  { x1: 3, y1: 4, x2: 3, y2: 5, floor: 'upstairs' },
  { x1: 6, y1: 4, x2: 7, y2: 4, floor: 'upstairs' },
  { x1: 9, y1: 4, x2: 10, y2: 4, floor: 'upstairs' },
];

// Evidence marker component (decorative)
function EvidenceMarker({ x, y, number }: { x: number; y: number; number: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="0,-1.8 1.2,1 -1.2,1" fill="#FFD600" stroke="#333" strokeWidth="0.15" />
      <text x="0" y="0.5" textAnchor="middle" fontSize="1.2" fill="#333" fontWeight="bold">{number}</text>
    </g>
  );
}

export default function HouseMap() {
  const navigate = useNavigate();
  const persona = useProfileStore((s) => s.persona);
  const completions = useTaskStore((s) => s.completions);
  const allTasks = useAllTasks();
  const [activeFloor, setActiveFloor] = useState<'downstairs' | 'upstairs'>('downstairs');
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [clickedRoom, setClickedRoom] = useState<string | null>(null);

  const floorRooms = CLUE_ROOMS.filter((r) => r.floor === activeFloor);
  const floorHallways = HALLWAYS.filter((h) => h.floor === activeFloor);

  // Calculate due task count per room
  const roomTaskCounts = new Map<string, { due: number; total: number }>();
  for (const room of ROOMS) {
    const roomTasks = allTasks.filter(
      (t) => t.roomId === room.id && shouldShowTask(t, persona)
    );
    const dueTasks = roomTasks.filter((t) => isTaskDue(t, completions));
    roomTaskCounts.set(room.id, { due: dueTasks.length, total: roomTasks.length });
  }

  const handleRoomClick = (roomId: string) => {
    setClickedRoom(roomId);
    setTimeout(() => {
      navigate(`/rooms/${roomId}`);
    }, 600);
  };

  // Convert grid position to SVG coords (viewBox 0-120 x 0-100)
  const gridToSvg = (col: number, row: number, colSpan: number, rowSpan: number) => {
    const cellW = 120 / 12;
    const cellH = 100 / 10;
    const padding = 0.6;
    return {
      x: (col - 1) * cellW + padding,
      y: (row - 1) * cellH + padding,
      w: colSpan * cellW - padding * 2,
      h: rowSpan * cellH - padding * 2,
    };
  };

  return (
    <div className="w-full mb-6">
      {/* Board title banner */}
      <div className="flex items-center justify-center mb-3">
        <div className="bg-gradient-to-r from-yellow-900/80 via-yellow-700/90 to-yellow-900/80 border-2 border-yellow-600 rounded-lg px-4 py-1.5 shadow-lg">
          <span className="text-xs font-bold text-yellow-100 tracking-widest uppercase">
            🔍 Fairchild Manor
          </span>
        </div>
      </div>

      {/* Floor toggle — styled as board game tabs */}
      <div className="flex gap-1 mb-2 justify-center">
        <button
          onClick={() => setActiveFloor('downstairs')}
          className={clsx(
            'px-5 py-1.5 rounded-t-lg text-xs font-bold uppercase tracking-wider border-2 border-b-0 transition-all',
            activeFloor === 'downstairs'
              ? 'bg-amber-900/80 text-yellow-200 border-yellow-600'
              : 'bg-stone-800/50 text-stone-400 border-stone-600 hover:text-stone-200'
          )}
        >
          Ground Floor
        </button>
        <button
          onClick={() => setActiveFloor('upstairs')}
          className={clsx(
            'px-5 py-1.5 rounded-t-lg text-xs font-bold uppercase tracking-wider border-2 border-b-0 transition-all',
            activeFloor === 'upstairs'
              ? 'bg-amber-900/80 text-yellow-200 border-yellow-600'
              : 'bg-stone-800/50 text-stone-400 border-stone-600 hover:text-stone-200'
          )}
        >
          Upper Floor
        </button>
      </div>

      {/* The Board */}
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #2D1B0E 0%, #1A1A2E 50%, #2D1B0E 100%)',
          border: '3px solid #8B6914',
          boxShadow: '0 0 20px rgba(139, 105, 20, 0.3), inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Ornate border inner */}
        <div
          className="m-1.5 rounded-lg overflow-hidden"
          style={{
            border: '1.5px solid rgba(139, 105, 20, 0.4)',
            background: 'radial-gradient(ellipse at center, #1a2332 0%, #0d1117 100%)',
          }}
        >
          <svg
            viewBox="0 0 120 100"
            className="w-full h-auto"
            style={{ minHeight: '340px' }}
          >
            {/* Background texture */}
            <defs>
              <pattern id="boardGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="none" />
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(139, 105, 20, 0.06)" strokeWidth="0.3" />
              </pattern>
              <filter id="roomGlow">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* ClipPaths for room images */}
              {floorRooms.map((cr) => {
                const { x, y, w, h } = gridToSvg(cr.col, cr.row, cr.colSpan, cr.rowSpan);
                return (
                  <clipPath key={cr.id} id={`clip-${cr.id}`}>
                    <rect x={x} y={y} width={w} height={h} rx="2" />
                  </clipPath>
                );
              })}
            </defs>
            <rect width="120" height="100" fill="url(#boardGrid)" />

            {/* Hallway paths */}
            {floorHallways.map((hw, i) => {
              const cellW = 120 / 12;
              const cellH = 100 / 10;
              const x1 = (hw.x1 - 0.5) * cellW;
              const y1 = (hw.y1 - 0.5) * cellH;
              const x2 = (hw.x2 - 0.5) * cellW;
              const y2 = (hw.y2 - 0.5) * cellH;
              return (
                <line
                  key={`hw-${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(139, 105, 20, 0.25)"
                  strokeWidth="2"
                  strokeDasharray="1.5 1"
                />
              );
            })}

            {/* Room tiles */}
            <AnimatePresence>
              {floorRooms.map((cr) => {
                const room = ROOMS.find((r) => r.id === cr.id);
                if (!room) return null;
                const counts = roomTaskCounts.get(cr.id);
                const { x, y, w, h } = gridToSvg(cr.col, cr.row, cr.colSpan, cr.rowSpan);
                const isHovered = hoveredRoom === cr.id;
                const isClicked = clickedRoom === cr.id;
                const isDone = counts?.due === 0;

                return (
                  <motion.g
                    key={cr.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: isClicked ? 1.05 : 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleRoomClick(cr.id)}
                    onMouseEnter={() => setHoveredRoom(cr.id)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className="cursor-pointer"
                  >
                    {/* Room image background */}
                    <image
                      href={ROOM_IMAGES[cr.id]}
                      x={x} y={y} width={w} height={h}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#clip-${cr.id})`}
                      opacity={isHovered ? 0.85 : 0.6}
                    />

                    {/* Room body overlay */}
                    <rect
                      x={x} y={y} width={w} height={h}
                      rx="2"
                      fill={cr.color}
                      fillOpacity={isHovered ? 0.3 : 0.45}
                      stroke={isHovered ? '#FFD700' : cr.borderColor}
                      strokeWidth={isHovered ? '1.2' : '0.8'}
                      filter={isHovered ? 'url(#roomGlow)' : undefined}
                    />



                    {/* Room icon */}
                    <text
                      x={x + w / 2}
                      y={y + h / 2 - (h > 15 ? 2 : 0.5)}
                      textAnchor="middle"
                      fontSize={h > 15 ? '5.5' : '4'}
                      className="pointer-events-none select-none"
                    >
                      {room.icon}
                    </text>

                    {/* Room name — like Clue room labels */}
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + (h > 15 ? 4 : 3)}
                      textAnchor="middle"
                      fontSize={w > 30 ? '2.8' : '2.2'}
                      fill="#FFFFFF"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                      style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                    >
                      {getRoomDisplayName(room, persona)}
                    </text>

                    {/* Evidence marker — task count */}
                    {counts && counts.due > 0 && (
                      <g>
                        <rect
                          x={x + w - 5.5}
                          y={y + 1}
                          width="5"
                          height="3.5"
                          rx="0.8"
                          fill="#E53935"
                          stroke="#FFD600"
                          strokeWidth="0.3"
                        />
                        <text
                          x={x + w - 3}
                          y={y + 3.2}
                          textAnchor="middle"
                          fontSize="2.2"
                          fill="white"
                          fontWeight="bold"
                          className="pointer-events-none select-none"
                        >
                          {counts.due}
                        </text>
                      </g>
                    )}

                    {/* Cleared badge */}
                    {isDone && (
                      <g>
                        <circle cx={x + w - 3} cy={y + 3.5} r="2.5" fill="#2E7D32" stroke="#66BB6A" strokeWidth="0.3" />
                        <text
                          x={x + w - 3}
                          y={y + 4.3}
                          textAnchor="middle"
                          fontSize="2.5"
                          className="pointer-events-none select-none"
                        >
                          ✓
                        </text>
                      </g>
                    )}

                    {/* Hover magnifying glass */}
                    {isHovered && (
                      <motion.text
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0.8, scale: 1 }}
                        x={x + 2.5} y={y + 4}
                        fontSize="3.5"
                        className="pointer-events-none select-none"
                      >
                        🔍
                      </motion.text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* Decorative evidence markers on the "hallways" */}
            {activeFloor === 'downstairs' && (
              <>
                <EvidenceMarker x={55} y={50} number={1} />
                <EvidenceMarker x={60} y={85} number={2} />
              </>
            )}
            {activeFloor === 'upstairs' && (
              <>
                <EvidenceMarker x={60} y={38} number={3} />
                <EvidenceMarker x={40} y={75} number={4} />
              </>
            )}
          </svg>
        </div>

        {/* Hover info bar at bottom */}
        <AnimatePresence>
          {hoveredRoom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-center pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.85)',
                border: '1px solid rgba(255, 215, 0, 0.5)',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
              }}
            >
              {(() => {
                const room = ROOMS.find((r) => r.id === hoveredRoom);
                const counts = roomTaskCounts.get(hoveredRoom);
                return (
                  <>
                    <p className="text-xs font-bold text-yellow-200">{room?.icon} {room ? getRoomDisplayName(room, persona) : ''}</p>
                    <p className="text-[10px] text-stone-300 mt-0.5">
                      {counts?.due === 0 ? '✨ Scene cleared — no evidence remaining' : `🚨 ${counts?.due} piece${(counts?.due ?? 0) > 1 ? 's' : ''} of evidence to process`}
                    </p>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend strip — styled as case file footer */}
      <div className="flex items-center justify-center gap-5 mt-3 px-3 py-1.5 rounded-b-lg"
        style={{ background: 'rgba(45, 27, 14, 0.5)', border: '1px solid rgba(139, 105, 20, 0.3)', borderTop: 'none' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-yellow-600" style={{ backgroundColor: 'rgba(229, 57, 53, 0.6)' }} />
          <span className="text-[10px] text-yellow-200/80 font-medium">Active Scene</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-yellow-600" style={{ backgroundColor: 'rgba(46, 125, 50, 0.6)' }} />
          <span className="text-[10px] text-yellow-200/80 font-medium">Cleared</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">🔍</span>
          <span className="text-[10px] text-yellow-200/80 font-medium">Click to investigate</span>
        </div>
      </div>
    </div>
  );
}
