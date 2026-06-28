import { useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Group, Text } from 'react-konva';
import './MapPage.css';

const CELL_SIZE = 40; // px per grid cell
const GRID_COLS = 24;
const GRID_ROWS = 16;

const GRID_WIDTH = CELL_SIZE * GRID_COLS;
const GRID_HEIGHT = CELL_SIZE * GRID_ROWS;

// A single house, positioned + sized in grid cells (not pixels) so it
// survives resizing / different screens.
type House = {
  id: string;
  col: number;
  row: number;
  w: number; // width in cells
  h: number; // height in cells
  label: string;
};

const snap = (value: number) => Math.round(value / CELL_SIZE);

const MapPage = () => {
  const [house, setHouse] = useState<House>({
    id: 'house-1',
    col: 4,
    row: 3,
    w: 4,
    h: 3,
    label: '🏠 Big House',
  });

  // Resolve the CSS variable to a real colour for the canvas (Konva can't
  // read CSS vars). Falls back to a sensible pink.
  const [fill, setFill] = useState('#ffc1c8');
  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-pink')
      .trim();
    if (resolved) setFill(resolved);
  }, []);

  // Build the grid lines once.
  const gridLines: number[][] = [];
  for (let i = 0; i <= GRID_COLS; i++) {
    gridLines.push([i * CELL_SIZE, 0, i * CELL_SIZE, GRID_HEIGHT]);
  }
  for (let j = 0; j <= GRID_ROWS; j++) {
    gridLines.push([0, j * CELL_SIZE, GRID_WIDTH, j * CELL_SIZE]);
  }

  return (
    <div className="mapPage">
      <div className="mapHeader">
        <h2>🗺️ Pig Pen Map</h2>
        <p className="mapHint">
          Drag the house to reposition it. It snaps to the grid.
        </p>
      </div>

      <div className="mapCanvasWrap">
        <Stage width={GRID_WIDTH} height={GRID_HEIGHT} className="mapStage">
          {/* Grid layer */}
          <Layer listening={false}>
            <Rect
              x={0}
              y={0}
              width={GRID_WIDTH}
              height={GRID_HEIGHT}
              fill="#f3f8ff"
            />
            {gridLines.map((pts, i) => (
              <Line key={i} points={pts} stroke="#d8d0ec" strokeWidth={1} />
            ))}
          </Layer>

          {/* Houses layer */}
          <Layer>
            <Group
              x={house.col * CELL_SIZE}
              y={house.row * CELL_SIZE}
              draggable
              dragBoundFunc={(pos) => ({
                x: Math.max(
                  0,
                  Math.min(pos.x, GRID_WIDTH - house.w * CELL_SIZE)
                ),
                y: Math.max(
                  0,
                  Math.min(pos.y, GRID_HEIGHT - house.h * CELL_SIZE)
                ),
              })}
              onDragEnd={(e) => {
                const node = e.target;
                const col = snap(node.x());
                const row = snap(node.y());
                node.position({ x: col * CELL_SIZE, y: row * CELL_SIZE });
                setHouse((h) => ({ ...h, col, row }));
              }}
            >
              <Rect
                width={house.w * CELL_SIZE}
                height={house.h * CELL_SIZE}
                fill={fill}
                stroke="#7c5cff"
                strokeWidth={3}
                cornerRadius={10}
                shadowColor="#4a2d8a"
                shadowBlur={8}
                shadowOpacity={0.25}
                shadowOffsetY={3}
              />
              <Text
                text={house.label}
                width={house.w * CELL_SIZE}
                height={house.h * CELL_SIZE}
                align="center"
                verticalAlign="middle"
                fontSize={16}
                fontFamily="Fuzzy Bubbles, system-ui"
                fill="#2b2d42"
              />
            </Group>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default MapPage;
