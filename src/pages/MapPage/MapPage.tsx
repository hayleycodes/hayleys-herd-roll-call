import { useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Group, Text } from 'react-konva';
import { penObjects, type PenObject } from './objects';
import './MapPage.css';

const CELL_SIZE = 40; // px per grid cell
const GRID_COLS = 19;
const GRID_ROWS = 23;

const GRID_WIDTH = CELL_SIZE * GRID_COLS;
const GRID_HEIGHT = CELL_SIZE * GRID_ROWS;

// Disabled / out-of-bounds region of the pen, in grid cells: top-left (4,0)
// to bottom-right (18,4).
const DISABLED_AREA = { col: 5, row: 0, width: 16, height: 4 };

// Disabled bottom-right corner, cut at 45°. The hypotenuse runs from (13,26)
// to (18,21); the right-angle corner sits at (18,26).
const DISABLED_CORNER: number[] = [
  12 * CELL_SIZE,
  23 * CELL_SIZE,
  19 * CELL_SIZE,
  20 * CELL_SIZE,
  21 * CELL_SIZE,
  23 * CELL_SIZE,
];

const snap = (value: number) => Math.round(value / CELL_SIZE);

// Shared canvas styling (Konva draws to <canvas>, so these can't live in CSS).
const SHAPE_STYLE = {
  stroke: '#7c5cff',
  strokeWidth: 3,
  shadowColor: '#4a2d8a',
  shadowBlur: 8,
  shadowOpacity: 0.25,
  shadowOffsetY: 3,
};

const LABEL_STYLE = {
  fontSize: 14,
  fontFamily: 'Fuzzy Bubbles, system-ui',
  fill: '#2b2d42',
};

const MapPage = () => {
  const [houses, setHouses] = useState<PenObject[]>(penObjects);
  const [fill, setFill] = useState('#dcb5ff');

  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
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
            <Rect
              x={DISABLED_AREA.col * CELL_SIZE}
              y={DISABLED_AREA.row * CELL_SIZE}
              width={DISABLED_AREA.width * CELL_SIZE}
              height={DISABLED_AREA.height * CELL_SIZE}
              fill="#b8b8c0"
            />
            <Line points={DISABLED_CORNER} closed fill="#b8b8c0" />
            {gridLines.map((pts, i) => (
              <Line key={i} points={pts} stroke="#d8d0ec" strokeWidth={1} />
            ))}
          </Layer>

          {/* Houses layer */}
          <Layer>
            {houses.map((house) => (
              <Group
                key={house.id}
                x={house.col * CELL_SIZE}
                y={house.row * CELL_SIZE}
                rotation={house.rotation}
                draggable
                onDragEnd={(e) => {
                  const node = e.target;
                  const col = snap(node.x());
                  const row = snap(node.y());
                  node.position({ x: col * CELL_SIZE, y: row * CELL_SIZE });
                  setHouses((prev) => {
                    const next = prev.map((h) =>
                      h.id === house.id ? { ...h, col, row } : h
                    );
                    console.log('Pen object positions:', next);
                    return next;
                  });
                }}
              >
                {house.shape === 'triangle' ? (
                  <Line
                    points={[
                      0,
                      0,
                      0,
                      house.length * CELL_SIZE,
                      house.width * CELL_SIZE,
                      house.length * CELL_SIZE,
                    ]}
                    closed
                    fill={fill}
                    lineJoin="round"
                    {...SHAPE_STYLE}
                  />
                ) : house.shape === 'circle' ? (
                  <Ellipse
                    x={(house.width * CELL_SIZE) / 2}
                    y={(house.length * CELL_SIZE) / 2}
                    radiusX={(house.width * CELL_SIZE) / 2}
                    radiusY={(house.length * CELL_SIZE) / 2}
                    fill={fill}
                    {...SHAPE_STYLE}
                  />
                ) : (
                  <Rect
                    width={house.width * CELL_SIZE}
                    height={house.length * CELL_SIZE}
                    fill={fill}
                    cornerRadius={10}
                    {...SHAPE_STYLE}
                  />
                )}
                <Text
                  text={house.label}
                  width={house.width * CELL_SIZE}
                  height={house.length * CELL_SIZE}
                  align="center"
                  verticalAlign="middle"
                  {...LABEL_STYLE}
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default MapPage;
