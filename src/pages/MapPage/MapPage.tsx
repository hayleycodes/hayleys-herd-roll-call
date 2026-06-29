import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  createSightingEvent,
  getSightingEvents,
} from '../../services/pig-sightings.service';
import { getAllPigs } from '../../services/pigs.service';
import type {
  FriendCategory,
  Pig,
  SightingEvent,
} from '../../services/pigs.types';
import Button from '../../components/ui/Button/Button';
import Loading from '../../components/ui/Loading/Loading';
import PigPicker, { PigThumb } from '../../components/PigPicker/PigPicker';
import './MapPage.css';

const CELL_SIZE = 40; // px per grid cell
const GRID_COLS = 19;
const GRID_ROWS = 23;

const GRID_WIDTH = CELL_SIZE * GRID_COLS;
const GRID_HEIGHT = CELL_SIZE * GRID_ROWS;
const BORDER_WIDTH = 5; // matches --border-width on .mapCanvasWrap

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

// Pigs that don't live in the main pen, so they shouldn't show up when marking
// sightings on this map.
const NON_MAIN_PEN_PIGS = ['spud', 'pie', 'tornado pig'];

// Objects that are scenery, not spaces — greyed out and not markable.
const DISABLED_OBJECT_IDS = new Set(['tree', 'r2d2']);

// Optional behaviour tags for a sighting of 2+ pigs together.
const BEHAVIOURS: { value: FriendCategory; label: string }[] = [
  { value: 'snacking', label: '🍴 Snacking' },
  { value: 'grooming', label: '🧼 Grooming' },
  { value: 'following', label: '🐾 Following' },
  { value: 'sharing_house', label: '🏠 Sharing a house' },
  { value: 'booping_noses', label: '👃 Booping noses' },
  { value: 'resting_together', label: '😴 Resting together' },
];

// Objects that imply a behaviour, pre-selected when marking pigs there.
const DEFAULT_BEHAVIOUR: Record<string, FriendCategory> = {
  'kibble-station': 'snacking',
};

const snap = (value: number) => Math.round(value / CELL_SIZE);

// Whether a cell falls inside one of the greyed-out, non-markable zones.
const isDisabledCell = (col: number, row: number): boolean => {
  const inArea =
    col >= DISABLED_AREA.col &&
    col < DISABLED_AREA.col + DISABLED_AREA.width &&
    row >= DISABLED_AREA.row &&
    row < DISABLED_AREA.row + DISABLED_AREA.height;
  if (inArea) return true;

  // Point-in-triangle for the cut corner (vertices in cell coords).
  const ax = DISABLED_CORNER[0] / CELL_SIZE;
  const ay = DISABLED_CORNER[1] / CELL_SIZE;
  const bx = DISABLED_CORNER[2] / CELL_SIZE;
  const by = DISABLED_CORNER[3] / CELL_SIZE;
  const cx = DISABLED_CORNER[4] / CELL_SIZE;
  const cy = DISABLED_CORNER[5] / CELL_SIZE;
  const px = col + 0.5;
  const py = row + 0.5;
  const sign = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
};

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
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  // The cell a sighting is being recorded for. x/y are grid coords (cell
  // centre); col/row drive the cell highlight; houseId highlights a house
  // instead. level 0 = ground floor, 1 = first floor up, etc.
  const [marking, setMarking] = useState<{
    x: number;
    y: number;
    level: number;
    col: number;
    row: number;
    houseId?: string;
    dropUp: boolean;
    align: 'left' | 'right';
  } | null>(null);
  const [selectedPigs, setSelectedPigs] = useState<Set<number>>(new Set());
  const [behaviour, setBehaviour] = useState<FriendCategory | null>(null);
  const [sightings, setSightings] = useState<SightingEvent[]>([]);
  // First tap "arms" a cell (highlights it); a second tap on the same cell
  // opens the picker. Keeps stray taps while scrolling from marking sightings.
  const [armed, setArmed] = useState<{
    x: number;
    y: number;
    level: number;
    col: number;
    row: number;
    houseId?: string;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Only pigs that live in the main pen can be sighted on this map.
  const mainPenPigs = useMemo(
    () =>
      allPigs.filter(
        (pig) => !NON_MAIN_PEN_PIGS.includes(pig.name.trim().toLowerCase())
      ),
    [allPigs]
  );

  // Load the saved map. On first run (empty table) seed it from the static
  // layout so there's always something to show.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [saved, pigs, sightingData] = await Promise.all([
        getPenObjects(),
        getAllPigs(),
        getSightingEvents(),
      ]);
      if (saved.length) {
        setHouses(saved);
      } else {
        await savePenObjects(penObjects);
        setHouses(penObjects);
      }
      setAllPigs(pigs);
      setSightings(sightingData);
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

  // Decide which way the dropdown should open so it stays inside the visible
  // (scrolled) viewport rather than clipping at an edge. Takes the cell centre
  // in grid coords.
  const placementFor = (
    x: number,
    y: number
  ): { dropUp: boolean; align: 'left' | 'right' } => {
    const wrap = wrapRef.current;
    if (!wrap) return { dropUp: false, align: 'right' };
    const viewX = x * CELL_SIZE - wrap.scrollLeft;
    const viewY = y * CELL_SIZE - wrap.scrollTop;
    return {
      dropUp: viewY > wrap.clientHeight * 0.55,
      align: viewX < wrap.clientWidth * 0.5 ? 'left' : 'right',
    };
  };

  type TapTarget = {
    x: number;
    y: number;
    level: number;
    col: number;
    row: number;
    houseId?: string;
  };

  // First tap arms (highlights) a target; tapping the same target again opens
  // the picker. Ignored in edit mode (taps there are for arranging objects).
  const tapTarget = (t: TapTarget) => {
    if (editMode) return;
    const sameAsArmed =
      armed &&
      armed.col === t.col &&
      armed.row === t.row &&
      armed.level === t.level &&
      armed.houseId === t.houseId;
    if (sameAsArmed) {
      setSelectedPigs(new Set());
      setBehaviour(t.houseId ? (DEFAULT_BEHAVIOUR[t.houseId] ?? null) : null);
      setMarking({ ...t, ...placementFor(t.x, t.y) });
    } else {
      setMarking(null);
      setArmed(t);
    }
  };

  const handleCellClick = (stage: any, houseId?: string) => {
    const p = stage.getPointerPosition();
    if (!p) return;
    const col = Math.floor(p.x / CELL_SIZE);
    const row = Math.floor(p.y / CELL_SIZE);
    // Bare cells inside a greyed-out zone aren't markable.
    if (!houseId && isDisabledCell(col, row)) return;
    tapTarget({ x: col + 0.5, y: row + 0.5, level: 0, col, row, houseId });
  };

  // First tap arms a specific floor of a house; second opens the picker.
  // Use the house's rotation-aware visual centre so the sighting (and the pig
  // photo) lands on the house even when it's rotated.
  const openFloor = (house: PenObject, level: number) => {
    const rad = (house.rotation * Math.PI) / 180;
    const cx = house.width / 2;
    const cy = house.length / 2;
    const x = house.col + (cx * Math.cos(rad) - cy * Math.sin(rad));
    const y = house.row + (cx * Math.sin(rad) + cy * Math.cos(rad));
    tapTarget({
      x,
      y,
      level,
      col: Math.floor(x),
      row: Math.floor(y),
      houseId: house.id,
    });
  };

  // Heading for the picker: house + floor, or bare cell coordinates.
  const markingTitle = (m: NonNullable<typeof marking>): string => {
    if (m.houseId) {
      const house = houses.find((h) => h.id === m.houseId);
      const label = house?.label ?? 'House';
      if ((house?.levels ?? 1) >= 2) {
        return `${label} · ${m.level === 0 ? 'Ground' : `Floor ${m.level}`}`;
      }
      return label;
    }
    return `(${m.col}, ${m.row})`;
  };

  const togglePig = (pigId: number) => {
    setSelectedPigs((prev) => {
      const next = new Set(prev);
      if (next.has(pigId)) next.delete(pigId);
      else next.add(pigId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!marking || selectedPigs.size === 0) return;
    const { x, y, level } = marking;
    const ids = [...selectedPigs];
    // Behaviour only applies to a group; a lone pig is just a location.
    const tag = ids.length >= 2 ? behaviour : null;
    setMarking(null);
    setArmed(null);
    setSelectedPigs(new Set());
    setBehaviour(null);
    try {
      await createSightingEvent(ids, x, y, level, tag);
      setSightings(await getSightingEvents());
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

  // Each pig's most recent sighting, grouped by cell, so we can show their
  // photo where they were last seen.
  const sightingCells = useMemo(() => {
    const pigById = new Map(allPigs.map((p) => [Number(p.id), p]));
    const tsOf = (s: SightingEvent) => s.observed_at ?? s.created_at ?? '';

    // Latest event seen for each pig.
    const latest = new Map<number, SightingEvent>();
    for (const s of sightings) {
      for (const pigId of s.pig_ids) {
        const current = latest.get(pigId);
        if (!current || tsOf(s) > tsOf(current)) latest.set(pigId, s);
      }
    }

    const cells = new Map<string, { x: number; y: number; pigs: Pig[] }>();
    for (const [pigId, s] of latest) {
      const pig = pigById.get(pigId);
      if (!pig) continue;
      const key = `${s.x},${s.y}`;
      const cell = cells.get(key) ?? { x: s.x, y: s.y, pigs: [] };
      cell.pigs.push(pig);
      cells.set(key, cell);
    }
    return [...cells.values()];
  }, [sightings, allPigs]);

  if (loading) return <Loading />;

  return (
    <div className="mapPage">
      <div
        className="mapHeader"
        style={{ maxWidth: GRID_WIDTH + 2 * BORDER_WIDTH }}
      >
        <h2>🗺️ Pig Pen Map</h2>
      </div>

      <div
        className="mapCanvasContainer"
        style={{ maxWidth: GRID_WIDTH + 2 * BORDER_WIDTH }}
      >
        <div className="mapEditButton">
          <Button
            variant={editMode ? 'success' : 'default'}
            onClick={() => setEditMode((e) => !e)}
          >
            {editMode ? '✓ Done' : '✏️ Edit'}
          </Button>
        </div>
        <div className="mapCanvasWrap" ref={wrapRef}>
          <Stage
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            className="mapStage"
            onClick={(e) => {
              if (e.target === e.target.getStage())
                handleCellClick(e.target.getStage());
            }}
            onTap={(e) => {
              if (e.target === e.target.getStage())
                handleCellClick(e.target.getStage());
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
              {armed && !armed.houseId && (
                <Rect
                  x={armed.col * CELL_SIZE}
                  y={armed.row * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(124, 92, 255, 0.25)"
                  stroke="#7c5cff"
                  strokeWidth={2}
                  listening={false}
                />
              )}
              {houses.map((house) => {
                const disabled = DISABLED_OBJECT_IDS.has(house.id);
                const selected = armed?.houseId === house.id;
                const shapeFill = disabled
                  ? '#b8b8c0'
                  : selected
                    ? SHAPE_STYLE.stroke
                    : '#beadff';
                const labelFill = selected ? '#ffffff' : LABEL_STYLE.fill;
                return (
                  <Group
                    key={house.id}
                    x={house.col * CELL_SIZE}
                    y={house.row * CELL_SIZE}
                    rotation={house.rotation}
                    draggable={editMode}
                    onClick={(e) => {
                      if (!disabled || editMode)
                        handleCellClick(e.target.getStage(), house.id);
                    }}
                    onTap={(e) => {
                      if (!disabled || editMode)
                        handleCellClick(e.target.getStage(), house.id);
                    }}
                    onMouseEnter={(e) => {
                      if (editMode || disabled) return;
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
                        fill={shapeFill}
                        lineJoin="round"
                        {...SHAPE_STYLE}
                      />
                    ) : house.shape === 'circle' ? (
                      <Ellipse
                        x={(house.width * CELL_SIZE) / 2}
                        y={(house.length * CELL_SIZE) / 2}
                        radiusX={(house.width * CELL_SIZE) / 2}
                        radiusY={(house.length * CELL_SIZE) / 2}
                        fill={shapeFill}
                        {...SHAPE_STYLE}
                      />
                    ) : (
                      <Rect
                        width={house.width * CELL_SIZE}
                        height={house.length * CELL_SIZE}
                        fill={shapeFill}
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
                      fill={labelFill}
                    />
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

          {/* Pig photos shown where each pig was last sighted. */}
          {sightingCells.map((cell) => (
            <div
              key={`${cell.x},${cell.y}`}
              className="sightingCell"
              style={{ left: cell.x * CELL_SIZE, top: cell.y * CELL_SIZE }}
            >
              {cell.pigs.map((pig) => (
                <PigThumb
                  key={pig.id}
                  imagePath={pig.image_paths?.[0] ?? null}
                />
              ))}
            </div>
          ))}

          {/* Upper-floor buttons for multi-storey houses — rendered above the
              pig photos and anchored to the top-left of the house's (rotated)
              bounding box. The house body itself records the ground floor. */}
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
                return (
                  <div
                    key={`floors-${house.id}`}
                    className="floorButtons"
                    style={{ left: minX + 5, top: minY + 5 }}
                  >
                    {upper.map((level) => {
                      const floorArmed =
                        armed?.houseId === house.id && armed.level === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          className={`floorButton${floorArmed ? ' armed' : ''}`}
                          onClick={() => openFloor(house, level)}
                        >
                          🪜{level}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

          {marking && (
            <div
              className="cellPicker"
              style={{
                left: marking.x * CELL_SIZE,
                top: marking.y * CELL_SIZE,
              }}
            >
              <PigPicker
                pigs={mainPenPigs}
                selectedPigId=""
                onSelect={() => {}}
                multiSelect
                selectedPigIds={[...selectedPigs]}
                onToggle={togglePig}
                onSave={handleSave}
                onClose={() => {
                  setMarking(null);
                  setArmed(null);
                }}
                defaultOpen
                theme="purple"
                title={markingTitle(marking)}
                dropUp={marking.dropUp}
                align={marking.align}
                footer={
                  selectedPigs.size >= 2 ? (
                    <div className="behaviourChips">
                      {BEHAVIOURS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          className={`behaviourChip${behaviour === b.value ? ' active' : ''}`}
                          onClick={() =>
                            setBehaviour((cur) =>
                              cur === b.value ? null : b.value
                            )
                          }
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
