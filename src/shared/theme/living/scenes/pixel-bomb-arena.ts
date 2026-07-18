import type {
  LivingSceneRenderer,
  LivingSceneViewport,
} from '../types'
import {
  clamp,
  getActiveCount,
  lerp,
  smoothstep,
} from './scene-utils'

type GridPoint = { column: number; row: number }

type ArenaRunner = {
  cell: GridPoint
  target: GridPoint
  previous: GridPoint
  moveProgress: number
  moveSpeed: number
  facing: 1 | -1
  color: string
  accent: string
  bombTimer: number
  thinkDelay: number
}

type ArenaBomb = GridPoint & {
  fuse: number
  color: string
  pulse: number
}

type ArenaBlast = GridPoint & {
  age: number
  color: string
  reach: Record<'left' | 'right' | 'up' | 'down', number>
}

type PixelSpark = {
  x: number
  y: number
  speed: number
  drift: number
  color: string
}

const COLUMNS = 15
const ROWS = 11
const keyOf = ({ column, row }: GridPoint) => `${column}:${row}`

export function isPixelBombArenaPillar(point: GridPoint) {
  return point.column % 2 === 1 && point.row % 2 === 1
}

function isInside(point: GridPoint) {
  return point.column >= 0 && point.column < COLUMNS && point.row >= 0 && point.row < ROWS
}

export const PIXEL_BOMB_ARENA_SPAWN_CELLS: readonly GridPoint[] = [
  { column: 0, row: 0 },
  { column: COLUMNS - 1, row: ROWS - 1 },
  { column: COLUMNS - 1, row: 0 },
  { column: 0, row: ROWS - 1 },
]

export const pixelBombArenaRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random }) {
    let viewport = initialViewport
    const spawnCells = PIXEL_BOMB_ARENA_SPAWN_CELLS
    const colors = [
      ['#35f3d0', '#d9fff8'],
      ['#ff5bbd', '#ffe1f3'],
      ['#ffc84b', '#fff4c2'],
      ['#8d7dff', '#e8e3ff'],
    ] as const

    const crates = new Set<string>()
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const point = { column, row }
        const nearSpawn = spawnCells.some((spawn) => Math.abs(spawn.column - column) + Math.abs(spawn.row - row) < 3)
        if (!isPixelBombArenaPillar(point) && !nearSpawn && random() > 0.67) crates.add(keyOf(point))
      }
    }

    const runners: ArenaRunner[] = spawnCells.map((cell, index) => ({
      cell: { ...cell },
      target: { ...cell },
      previous: { ...cell },
      moveProgress: 1,
      moveSpeed: 1.9 + random() * 0.65,
      facing: index % 2 === 0 ? 1 : -1,
      color: colors[index][0],
      accent: colors[index][1],
      bombTimer: 1.1 + random() * 3.6,
      thinkDelay: random() * 0.45,
    }))

    const bombs: ArenaBomb[] = []
    const blasts: ArenaBlast[] = []
    const sparks: PixelSpark[] = Array.from({ length: 34 }, (_, index) => ({
      x: random(),
      y: random(),
      speed: 0.015 + random() * 0.035,
      drift: (random() - 0.5) * 0.04,
      color: index % 3 === 0 ? '#ff4fa9' : index % 3 === 1 ? '#43f6dc' : '#ffd45c',
    }))

    function chooseTarget(runner: ArenaRunner) {
      const directions: GridPoint[] = [
        { column: 1, row: 0 },
        { column: -1, row: 0 },
        { column: 0, row: 1 },
        { column: 0, row: -1 },
      ]
      const offset = Math.floor(random() * directions.length)
      for (let attempt = 0; attempt < directions.length; attempt += 1) {
        const direction = directions[(offset + attempt) % directions.length]
        const candidate = {
          column: runner.cell.column + direction.column,
          row: runner.cell.row + direction.row,
        }
        if (!isInside(candidate) || isPixelBombArenaPillar(candidate) || crates.has(keyOf(candidate))) continue
        if (bombs.some((bomb) => bomb.column === candidate.column && bomb.row === candidate.row)) continue
        runner.previous = { ...runner.cell }
        runner.target = candidate
        runner.moveProgress = 0
        if (direction.column !== 0) runner.facing = direction.column > 0 ? 1 : -1
        return
      }
      runner.thinkDelay = 0.18
    }

    function detonate(bomb: ArenaBomb) {
      const blast: ArenaBlast = {
        column: bomb.column,
        row: bomb.row,
        age: 0,
        color: bomb.color,
        reach: { left: 0, right: 0, up: 0, down: 0 },
      }
      const power = random() > 0.7 ? 3 : 2

      const directions = [
        ['right', 1, 0],
        ['left', -1, 0],
        ['down', 0, 1],
        ['up', 0, -1],
      ] as const
      directions.forEach(([direction, columnStep, rowStep]) => {
        for (let distance = 1; distance <= power; distance += 1) {
          const point = {
            column: bomb.column + columnStep * distance,
            row: bomb.row + rowStep * distance,
          }
          if (!isInside(point) || isPixelBombArenaPillar(point)) break
          blast.reach[direction] = distance

          const chainedBomb = bombs.find(
            (candidate) =>
              candidate.column === point.column && candidate.row === point.row,
          )
          if (chainedBomb) chainedBomb.fuse = Math.min(chainedBomb.fuse, 0.04)

          const crateKey = keyOf(point)
          if (crates.has(crateKey)) {
            crates.delete(crateKey)
            break
          }
        }
      })
      blasts.push(blast)
    }

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        const activeRunners = getActiveCount(runners.length, viewport, 2)
        runners.slice(0, activeRunners).forEach((runner) => {
          runner.bombTimer -= delta
          runner.thinkDelay = Math.max(0, runner.thinkDelay - delta)

          if (runner.moveProgress < 1) {
            runner.moveProgress = Math.min(1, runner.moveProgress + delta * runner.moveSpeed)
            if (runner.moveProgress === 1) runner.cell = { ...runner.target }
          } else if (runner.thinkDelay <= 0) {
            chooseTarget(runner)
          }

          if (runner.bombTimer <= 0 && runner.moveProgress > 0.72) {
            const occupied = bombs.some((bomb) => bomb.column === runner.cell.column && bomb.row === runner.cell.row)
            if (!occupied) {
              bombs.push({
                column: runner.cell.column,
                row: runner.cell.row,
                fuse: 1.8 + random() * 0.8,
                color: runner.color,
                pulse: random() * Math.PI * 2,
              })
            }
            runner.bombTimer = 3.2 + random() * 3.8
          }
        })

        for (let index = bombs.length - 1; index >= 0; index -= 1) {
          const bomb = bombs[index]
          bomb.fuse -= delta
          bomb.pulse += delta * 7
          if (bomb.fuse <= 0) {
            detonate(bomb)
            bombs.splice(index, 1)
          }
        }

        for (let index = blasts.length - 1; index >= 0; index -= 1) {
          blasts[index].age += delta
          if (blasts[index].age > 0.62) blasts.splice(index, 1)
        }

        sparks.forEach((spark) => {
          spark.y -= delta * spark.speed
          spark.x += delta * spark.drift
          if (spark.y < -0.04) spark.y = 1.04
          if (spark.x < -0.04) spark.x = 1.04
          if (spark.x > 1.04) spark.x = -0.04
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        const geometry = getArenaGeometry(viewport)
        context.save()
        context.imageSmoothingEnabled = false
        drawPixelAtmosphere(context, viewport, sparks, elapsedSeconds)
        drawArenaFloor(context, geometry, crates, elapsedSeconds)
        blasts.forEach((blast) => drawBlast(context, geometry, blast))
        bombs.forEach((bomb) => drawBomb(context, geometry, bomb))

        const activeRunners = getActiveCount(runners.length, viewport, 2)
        runners
          .slice(0, activeRunners)
          .map((runner) => ({ runner, point: getRunnerPoint(runner) }))
          .sort((left, right) => left.point.row - right.point.row)
          .forEach(({ runner, point }) => drawRunner(context, geometry, runner, point, elapsedSeconds))
        context.restore()
      },
    }
  },
}

type ArenaGeometry = {
  x: number
  y: number
  cell: number
  pixel: number
}

function getArenaGeometry(viewport: LivingSceneViewport): ArenaGeometry {
  const cell = Math.max(16, Math.floor(Math.min(viewport.width * 0.88 / COLUMNS, viewport.height * 0.73 / ROWS)))
  return {
    x: Math.round((viewport.width - cell * COLUMNS) / 2),
    y: Math.round(viewport.height * 0.16),
    cell,
    pixel: Math.max(2, Math.floor(cell / 12)),
  }
}

function getRunnerPoint(runner: ArenaRunner) {
  const amount = smoothstep(runner.moveProgress)
  return {
    column: lerp(runner.previous.column, runner.target.column, amount),
    row: lerp(runner.previous.row, runner.target.row, amount),
  }
}

function cellCenter(geometry: ArenaGeometry, point: GridPoint) {
  return {
    x: geometry.x + (point.column + 0.5) * geometry.cell,
    y: geometry.y + (point.row + 0.5) * geometry.cell,
  }
}

function drawPixelAtmosphere(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  sparks: PixelSpark[],
  elapsedSeconds: number,
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  const active = getActiveCount(sparks.length, viewport, 12)
  sparks.slice(0, active).forEach((spark, index) => {
    const blink = 0.3 + Math.sin(elapsedSeconds * 2 + index) * 0.2
    context.fillStyle = `${spark.color}${Math.round(clamp(blink) * 255).toString(16).padStart(2, '0')}`
    const size = index % 4 === 0 ? 3 : 2
    context.fillRect(Math.round(spark.x * viewport.width), Math.round(spark.y * viewport.height), size, size)
  })
  context.restore()
}

function drawArenaFloor(
  context: CanvasRenderingContext2D,
  geometry: ArenaGeometry,
  crates: Set<string>,
  elapsedSeconds: number,
) {
  const { x, y, cell, pixel } = geometry
  context.fillStyle = 'rgba(5,8,24,0.43)'
  context.fillRect(x - pixel * 2, y - pixel * 2, cell * COLUMNS + pixel * 4, cell * ROWS + pixel * 4)

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const cellX = x + column * cell
      const cellY = y + row * cell
      context.fillStyle = (column + row) % 2 === 0 ? 'rgba(25,35,70,0.44)' : 'rgba(14,24,55,0.42)'
      context.fillRect(cellX, cellY, cell, cell)
      context.fillStyle = 'rgba(88,236,255,0.08)'
      context.fillRect(cellX, cellY, cell, pixel)
      context.fillRect(cellX, cellY, pixel, cell)

      const point = { column, row }
      if (isPixelBombArenaPillar(point)) drawPillar(context, geometry, point, elapsedSeconds)
      else if (crates.has(keyOf(point))) drawCrate(context, geometry, point)
    }
  }
}

function drawPillar(
  context: CanvasRenderingContext2D,
  geometry: ArenaGeometry,
  point: GridPoint,
  elapsedSeconds: number,
) {
  const { x, y } = cellCenter(geometry, point)
  const size = geometry.cell * 0.78
  const pulse = 0.45 + Math.sin(elapsedSeconds * 1.3 + point.column + point.row) * 0.15
  context.fillStyle = 'rgba(4,8,19,0.9)'
  context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size))
  context.fillStyle = `rgba(78,228,255,${pulse * 0.32})`
  context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), geometry.pixel)
  context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), geometry.pixel, Math.round(size))
}

function drawCrate(context: CanvasRenderingContext2D, geometry: ArenaGeometry, point: GridPoint) {
  const { x, y } = cellCenter(geometry, point)
  const size = Math.round(geometry.cell * 0.66)
  const pixel = geometry.pixel
  context.fillStyle = 'rgba(43,17,52,0.92)'
  context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size)
  context.fillStyle = 'rgba(255,83,179,0.58)'
  context.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, pixel * 2)
  context.fillRect(Math.round(x - size / 2), Math.round(y + size / 2 - pixel * 2), size, pixel * 2)
  context.fillStyle = 'rgba(255,205,91,0.52)'
  context.fillRect(Math.round(x - pixel), Math.round(y - size / 2), pixel * 2, size)
}

function drawBomb(context: CanvasRenderingContext2D, geometry: ArenaGeometry, bomb: ArenaBomb) {
  const { x, y } = cellCenter(geometry, bomb)
  const pixel = geometry.pixel
  const pulse = 1 + Math.sin(bomb.pulse) * 0.12
  const size = Math.round(geometry.cell * 0.25 * pulse)
  context.save()
  context.globalCompositeOperation = 'screen'
  context.fillStyle = `${bomb.color}55`
  context.fillRect(Math.round(x - size - pixel), Math.round(y - size - pixel), (size + pixel) * 2, (size + pixel) * 2)
  context.restore()
  context.fillStyle = '#090b16'
  context.fillRect(Math.round(x - size), Math.round(y - size), size * 2, size * 2)
  context.fillStyle = bomb.color
  context.fillRect(Math.round(x - pixel), Math.round(y - size - pixel * 2), pixel * 2, pixel * 2)
  context.fillStyle = '#fff4b5'
  context.fillRect(Math.round(x), Math.round(y - size - pixel * 3), pixel, pixel)
}

function drawBlast(context: CanvasRenderingContext2D, geometry: ArenaGeometry, blast: ArenaBlast) {
  const center = cellCenter(geometry, blast)
  const progress = clamp(blast.age / 0.62)
  const alpha = Math.sin(progress * Math.PI)
  const expansion = smoothstep(Math.min(1, progress * 2.4))
  const left = geometry.cell * blast.reach.left * expansion
  const right = geometry.cell * blast.reach.right * expansion
  const up = geometry.cell * blast.reach.up * expansion
  const down = geometry.cell * blast.reach.down * expansion
  const thickness = geometry.cell * (0.5 - progress * 0.22)

  context.save()
  context.globalCompositeOperation = 'screen'
  context.fillStyle = `${blast.color}${Math.round(alpha * 170).toString(16).padStart(2, '0')}`
  context.fillRect(Math.round(center.x - left), Math.round(center.y - thickness / 2), Math.round(left + right), Math.round(thickness))
  context.fillRect(Math.round(center.x - thickness / 2), Math.round(center.y - up), Math.round(thickness), Math.round(up + down))
  context.fillStyle = `rgba(255,244,177,${alpha * 0.78})`
  const core = Math.max(geometry.pixel * 2, thickness * 0.38)
  context.fillRect(Math.round(center.x - core / 2), Math.round(center.y - core / 2), Math.round(core), Math.round(core))
  context.restore()
}

function drawRunner(
  context: CanvasRenderingContext2D,
  geometry: ArenaGeometry,
  runner: ArenaRunner,
  point: { column: number; row: number },
  elapsedSeconds: number,
) {
  const x = geometry.x + (point.column + 0.5) * geometry.cell
  const y = geometry.y + (point.row + 0.5) * geometry.cell
  const pixel = geometry.pixel
  const bob = Math.round(Math.sin(elapsedSeconds * 9 + point.column) * pixel)
  const bodyWidth = pixel * 6
  const bodyHeight = pixel * 8
  context.save()
  context.translate(Math.round(x), Math.round(y + bob))
  context.scale(runner.facing, 1)
  context.fillStyle = 'rgba(0,0,0,0.42)'
  context.fillRect(-bodyWidth / 2 - pixel, bodyHeight / 2, bodyWidth + pixel * 2, pixel * 2)
  context.fillStyle = runner.color
  context.fillRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight)
  context.fillStyle = runner.accent
  context.fillRect(-bodyWidth / 2 + pixel, -bodyHeight / 2 + pixel, bodyWidth - pixel * 2, pixel * 2)
  context.fillStyle = '#12172b'
  context.fillRect(-bodyWidth / 2 + pixel, -pixel, bodyWidth - pixel * 2, pixel * 2)
  context.fillStyle = runner.color
  context.fillRect(-bodyWidth / 2 - pixel, 0, pixel * 2, pixel * 4)
  context.fillRect(bodyWidth / 2 - pixel, -pixel, pixel * 3, pixel * 2)
  context.fillStyle = '#080b16'
  context.fillRect(-bodyWidth / 2 + pixel, bodyHeight / 2, pixel * 2, pixel * 2)
  context.fillRect(bodyWidth / 2 - pixel * 3, bodyHeight / 2, pixel * 2, pixel * 2)
  context.restore()
}
