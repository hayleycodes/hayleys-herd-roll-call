import { useEffect, useState } from 'react';
import {
  Stage,
  Layer,
  Line,
  Rect,
  Ellipse,
  Circle,
  Group,
  Text,
} from 'react-konva';
import { penObjects, type PenObject } from './objects';
import {
  getPenObjects,
  savePenObjects,
} from '../../services/pen-objects.service';
import { createSighting } from '../../services/pig-sightings.service';
import { getAllPigs } from '../../services/pigs.service';
import type { Pig } from '../../services/pigs.types';
import Button from '../../components/ui/Button/Button';
import Loading from '../../components/ui/Loading/Loading';
import Modal from '../../components/ui/Modal/Modal';
import PigPicker from '../../components/PigPicker/PigPicker';
import './MapPage.css';

const CELL_SIZE = 40; // px per grid cell
const GRID_COLS = 19;
const GRID_ROWS = 23;

const GRID_WIDTH = CELL_SIZE * GRID_COLS;
const GRID_HEIGHT = CELL_SIZE * GRID_ROWS;

// Disabled / out-of-bounds region of the pen, in grid cells: top-left (4,0)
// to bottom-right (18,4).
const DISABLED_AREA = { col: 4, row: 0, width: 17, height: 4 };

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

const ROTATE_STEP = 45; // degrees per click of the rotate handle

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
  const [houses, setHouses] = useState<PenObject[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [fill, setFill] = useState('#dcb5ff');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  // The space a sighting is being recorded for. level 0 = ground floor,
  // 1 = first floor up, etc.
  const [markingSpace, setMarkingSpace] = useState<{
    house: PenObject;
    level: number;
  } | null>(null);

  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
      .trim();
    if (resolved) setFill(resolved);
  }, []);

  // Load the saved map. On first run (empty table) seed it from the static
  // layout so there's always something to show.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [saved, pigs] = await Promise.all([getPenObjects(), getAllPigs()]);
      if (saved.length) {
        setHouses(saved);
      } else {
        await savePenObjects(penObjects);
        setHouses(penObjects);
      }
      setAllPigs(pigs);
      setLoading(false);
    };
    load();
  }, []);

  const handleDragEnd = (id: string, col: number, row: number) => {
    setHouses((prev) => {
      const next = prev.map((h) => (h.id === id ? { ...h, col, row } : h));
      savePenObjects(next).catch((e) => console.error('Failed to save map', e));
      return next;
    });
  };

  const handleRotate = (id: string) => {
    setHouses((prev) => {
      const next = prev.map((h) =>
        h.id === id ? { ...h, rotation: (h.rotation + ROTATE_STEP) % 360 } : h
      );
      savePenObjects(next).catch((e) => console.error('Failed to save map', e));
      return next;
    });
  };

  // Clicking a house (or one of its floor buttons) records a sighting on that
  // floor. Ignored in edit mode (clicks there are for arranging objects).
  const handleSpaceClick = (house: PenObject, level: number) => {
    if (editMode) return;
    setMarkingSpace({ house, level });
  };

  const handleMarkPig = async (pigId: number | '') => {
    if (!pigId || !markingSpace) return;
    const { house, level } = markingSpace;
    // Record the sighting at the footprint centre, in grid coords.
    const x = house.col + house.width / 2;
    const y = house.row + house.length / 2;
    setMarkingSpace(null);
    try {
      await createSighting(pigId, x, y, level);
    } catch (e) {
      console.error('Failed to record sighting', e);
    }
  };

  // Build the grid lines once.
  const gridLines: number[][] = [];
  for (let i = 0; i <= GRID_COLS; i++) {
    gridLines.push([i * CELL_SIZE, 0, i * CELL_SIZE, GRID_HEIGHT]);
  }
  for (let j = 0; j <= GRID_ROWS; j++) {
    gridLines.push([0, j * CELL_SIZE, GRID_WIDTH, j * CELL_SIZE]);
  }

  if (loading) return <Loading />;

  return (
    <div className="mapPage">
      <div className="mapHeader">
        <h2>🗺️ Pig Pen Map</h2>
      </div>

      <div className="mapCanvasContainer">
        <div className="mapEditButton">
          <Button
            variant={editMode ? 'success' : 'default'}
            onClick={() => setEditMode((e) => !e)}
          >
            {editMode ? '✓ Done' : '✏️ Edit'}
          </Button>
        </div>
        <div className="mapCanvasWrap">
          <Stage
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            className="mapStage"
            onClick={(e) => {
              if (e.target === e.target.getStage()) setMarkingSpace(null);
            }}
            onTap={(e) => {
              if (e.target === e.target.getStage()) setMarkingSpace(null);
            }}
          >
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
                  draggable={editMode}
                  onClick={() => handleSpaceClick(house, 0)}
                  onTap={() => handleSpaceClick(house, 0)}
                  onMouseEnter={(e) => {
                    if (editMode) return;
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    const col = snap(node.x());
                    const row = snap(node.y());
                    node.position({ x: col * CELL_SIZE, y: row * CELL_SIZE });
                    handleDragEnd(house.id, col, row);
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

              {/* Upper-floor buttons for multi-storey houses. Rendered outside
                  the rotating Group, anchored to the top-left of the house's
                  on-screen (rotated) bounding box so they stay upright and in
                  place. The house body itself records the ground floor. */}
              {!editMode &&
                houses
                  .filter((house) => (house.levels ?? 1) >= 2)
                  .map((house) => {
                    const w = house.width * CELL_SIZE;
                    const l = house.length * CELL_SIZE;
                    const rad = (house.rotation * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const px = house.col * CELL_SIZE;
                    const py = house.row * CELL_SIZE;
                    const corners = [
                      [0, 0],
                      [w, 0],
                      [0, l],
                      [w, l],
                    ].map(([x, y]) => ({
                      x: px + x * cos - y * sin,
                      y: py + x * sin + y * cos,
                    }));
                    const minX = Math.min(...corners.map((c) => c.x));
                    const minY = Math.min(...corners.map((c) => c.y));
                    const upper = Array.from(
                      { length: (house.levels ?? 1) - 1 },
                      (_, i) => i + 1
                    );
                    const btnW = 44;
                    const btnH = 29;
                    const gap = 5;
                    const pad = 5;
                    return (
                      <Group key={`floors-${house.id}`} x={minX + pad} y={minY + pad}>
                        {upper.map((level, i) => (
                          <Group
                            key={level}
                            y={i * (btnH + gap)}
                            onClick={(e) => {
                              e.cancelBubble = true;
                              setMarkingSpace({ house, level });
                            }}
                            onTap={(e) => {
                              e.cancelBubble = true;
                              setMarkingSpace({ house, level });
                            }}
                          >
                            <Rect
                              width={btnW}
                              height={btnH}
                              fill="#ffffff"
                              stroke="#7c5cff"
                              strokeWidth={2}
                              cornerRadius={8}
                            />
                            <Text
                              text={`🪜${level + 1}`}
                              y={2}
                              width={btnW}
                              height={btnH}
                              align="center"
                              verticalAlign="middle"
                              lineHeight={1}
                              fontSize={17}
                              fontFamily="Fuzzy Bubbles, system-ui"
                            />
                          </Group>
                        ))}
                      </Group>
                    );
                  })}

              {/* Rotate handles — only in edit mode. Placed at each object's
                rotation pivot (top-left), which stays put as it spins, and
                kept outside the rotating Group so the icon stays upright. */}
              {editMode &&
                houses.map((house) => (
                  <Group
                    key={`rotate-${house.id}`}
                    x={house.col * CELL_SIZE}
                    y={house.row * CELL_SIZE}
                    onClick={() => handleRotate(house.id)}
                    onTap={() => handleRotate(house.id)}
                    onMouseEnter={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = 'default';
                    }}
                  >
                    <Circle
                      radius={12}
                      fill="#ffffff"
                      stroke="#7c5cff"
                      strokeWidth={2}
                    />
                    <Text
                      text="⤵️"
                      width={24}
                      height={24}
                      offsetX={10}
                      offsetY={11}
                      align="center"
                      verticalAlign="middle"
                      fontSize={14}
                    />
                  </Group>
                ))}
            </Layer>
          </Stage>
        </div>
      </div>

      <Modal isOpen={!!markingSpace} onClose={() => setMarkingSpace(null)}>
        {markingSpace && (
          <>
            <p>
              {(markingSpace.house.levels ?? 1) >= 2
                ? `Who's on floor ${markingSpace.level + 1} of ${markingSpace.house.label}?`
                : `Who's at ${markingSpace.house.label}?`}
            </p>
            <PigPicker
              pigs={allPigs}
              selectedPigId=""
              onSelect={handleMarkPig}
              theme="purple"
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default MapPage;
