import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group, Rect } from 'react-konva'
import { db, stamp, touch } from '../db/index'
import { usePhoto } from '../lib/usePhoto'
import { planningPhotoId, availablePhotos } from '../lib/wallPhotos'
import { exportRouteCardPdf } from '../lib/exportPdf'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
  Orange: '#f97316', Purple: '#a855f7', Pink: '#ec4899', White: '#f1f5f9',
  Black: '#1e293b', Grey: '#64748b', Brown: '#92400e', Teal: '#14b8a6',
}

const TAPE_COLORS = ['Red','Blue','Green','Yellow','Orange','Purple','Pink','White','Black','Grey','Brown','Teal']
const ROUTE_TYPES = ['Boulder', 'Lead', 'Top-rope']
const STATUSES = ['planned','in progress','set','open','stripped']
const STYLE_TAGS = ['Powerful','Technical','Dynamic','Balance','Coordination','Crimpy','Slopey','Compression','Endurance']

const ABILITY_LEVELS = ['Beginner','Intermediate','Advanced','Elite']
const COMPLETED_OPTIONS = ['Yes','No','Partial']
const FEEDBACK_TAGS = ['Too hard','Too easy','Fun','Scary','Classic','Confusing start']

const FONT_GRADES = ['3','4','5a','5b','5c','6a','6a+','6b','6b+','6c','6c+','7a','7a+','7b','7b+','7c','7c+','8a','8a+','8b','8b+','8c','8c+','9a']
const V_GRADES = Array.from({ length: 18 }, (_, i) => `V${i}`)

const STAGES = [
  { id: 1, label: 'Gear check',        desc: 'Check gear is ready' },
  { id: 2, label: 'Strip & clean',     desc: 'Mark wall as stripped, upload photo' },
  { id: 3, label: 'Holds choice',      desc: 'Select holds from library' },
  { id: 4, label: 'Style provision',   desc: 'Tag style, movement type, feel' },
  { id: 5, label: 'Place volumes',     desc: 'Place volumes on canvas' },
  { id: 6, label: 'Place holds',       desc: 'Drag holds onto bolt grid' },
  { id: 7, label: 'Testing',           desc: 'Log testers and feedback' },
  { id: 8, label: 'Finishing touches', desc: 'Final adjustments notes' },
  { id: 9, label: 'Down climb holds',  desc: 'Place down climb holds (bouldering)' },
]

const defaultMeta = {
  name: '',
  grade: '',
  routeType: 'Boulder',
  tapeColor: 'Red',
  setter: '',
  dateSet: new Date().toISOString().split('T')[0],
  status: 'planned',
  styleTags: [],
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useImage(src) {
  const [image, setImage] = useState(null)
  useEffect(() => {
    if (!src) { setImage(null); return }
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = src
  }, [src])
  return image
}

// ── Grid helpers ──────────────────────────────────────────────────────────────
function computeGridPoints(rows, cols, w, h, padding = 40) {
  const points = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? w / 2 : padding + c * (w - 2 * padding) / (cols - 1)
      const y = rows === 1 ? h / 2 : padding + r * (h - 2 * padding) / (rows - 1)
      points.push({ x, y })
    }
  }
  return points
}

function snapToGrid(x, y, gridPoints) {
  let nearest = gridPoints[0]
  let minDist = Infinity
  for (const pt of gridPoints) {
    const d = Math.hypot(pt.x - x, pt.y - y)
    if (d < minDist) { minDist = d; nearest = pt }
  }
  return nearest
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function Canvas({ wall, grid, placedHolds, holdsLibrary, selectedHoldId, onPlace, selectedPlacedId, setSelectedPlacedId }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  // Which of the wall's photos to draw underneath. Defaults to the stripped
  // wall — that's the planning surface — but you can flip to "with holds" to
  // check what is physically up there without leaving the planner.
  const [baseSlot, setBaseSlot] = useState(null)
  const slots = availablePhotos(wall)
  const activePhotoId = baseSlot
    ? (wall?.[baseSlot] ?? null)
    : planningPhotoId(wall)

  const wallPhotoUrl = usePhoto(activePhotoId)
  const wallImage = useImage(wallPhotoUrl)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const gridPoints = computeGridPoints(grid.rows, grid.cols, size.w, size.h)

  function handleStageClick(e) {
    const isBackground = e.target === e.target.getStage() || e.target.name() === 'background'
    if (isBackground) {
      if (selectedHoldId !== null) {
        const pos = e.target.getStage().getPointerPosition()
        const snapped = snapToGrid(pos.x, pos.y, gridPoints)
        onPlace(snapped.x, snapped.y)
      } else {
        setSelectedPlacedId(null)
      }
    }
  }

  let imgProps = { x: 0, y: 0, width: size.w, height: size.h }
  if (wallImage) {
    const scale = Math.min(size.w / wallImage.width, size.h / wallImage.height)
    const w = wallImage.width * scale
    const h = wallImage.height * scale
    imgProps = { x: (size.w - w) / 2, y: (size.h - h) / 2, width: w, height: h }
  }

  return (
    <div ref={containerRef} className="flex-1 bg-slate-950 rounded-none overflow-hidden relative">
      {selectedHoldId !== null && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-indigo-600/90 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Click on the wall to place — Esc to cancel
        </div>
      )}

      {/* Base photo switcher — only worth showing if there's a choice */}
      {slots.length > 1 && (
        <div className="absolute top-3 left-3 z-10 flex gap-1 bg-slate-900/80 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
          {slots.map(s => {
            const active = activePhotoId === s.photoId
            return (
              <button
                key={s.key}
                onClick={() => setBaseSlot(s.key)}
                title={s.hint}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      )}
      <Stage width={size.w} height={size.h} onClick={handleStageClick}>
        <Layer>
          <Rect name="background" x={0} y={0} width={size.w} height={size.h} fill="#020617" />
          {wallImage ? (
            <KonvaImage image={wallImage} {...imgProps} />
          ) : (
            <Text x={0} y={size.h / 2 - 10} width={size.w} text="Upload a wall photo to use as base layer" align="center" fill="#475569" fontSize={13} />
          )}
        </Layer>

        {grid.visible && (
          <Layer>
            {gridPoints.map((pt, i) => (
              <Circle key={i} x={pt.x} y={pt.y} radius={4} fill="rgba(148,163,184,0.3)" stroke="rgba(148,163,184,0.55)" strokeWidth={1} />
            ))}
          </Layer>
        )}

        <Layer>
          {placedHolds.map(ph => {
            const hold = holdsLibrary.find(h => h.id === ph.holdId)
            const color = COLOR_MAP[hold?.color] ?? '#6366f1'
            const isSelected = ph.id === selectedPlacedId
            return (
              <Group key={ph.id} x={ph.x} y={ph.y} onClick={e => { e.cancelBubble = true; setSelectedPlacedId(isSelected ? null : ph.id) }}>
                <Circle radius={isSelected ? 16 : 13} fill={color} stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} strokeWidth={isSelected ? 2.5 : 1.5} shadowEnabled={isSelected} shadowColor="#fff" shadowBlur={8} />
                {hold && (
                  <Text text={hold.type?.[0]?.toUpperCase() ?? '?'} fontSize={10} fill="white" fontStyle="bold" align="center" verticalAlign="middle" width={26} height={26} x={-13} y={-13} listening={false} />
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}

// ── Sidebar tabs ──────────────────────────────────────────────────────────────

// Tab: Holds
function HoldsTab({ grid, setGrid, holdsLibrary, selectedHoldId, setSelectedHoldId, placedHolds, onDeleteSelected, selectedPlacedId }) {
  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Grid settings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Bolt Grid</h3>
          <button
            onClick={() => setGrid(g => ({ ...g, visible: !g.visible }))}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${grid.visible ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {grid.visible ? 'On' : 'Off'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rows</label>
            <input type="number" min="2" max="30" value={grid.rows}
              onChange={e => setGrid(g => ({ ...g, rows: Math.max(2, Number(e.target.value)) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Columns</label>
            <input type="number" min="2" max="30" value={grid.cols}
              onChange={e => setGrid(g => ({ ...g, cols: Math.max(2, Number(e.target.value)) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      {/* Hold picker */}
      <section>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Place Hold {selectedHoldId !== null && <span className="text-indigo-400 normal-case font-normal">— click wall</span>}
        </h3>
        {holdsLibrary.length === 0 ? (
          <p className="text-slate-500 text-xs">No holds in library. Add holds first.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
            {holdsLibrary.map(hold => {
              const isSelected = hold.id === selectedHoldId
              return (
                <button key={hold.id} onClick={() => setSelectedHoldId(isSelected ? null : hold.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: COLOR_MAP[hold.color] ?? '#6366f1' }} />
                  <span className="truncate">{hold.name}</span>
                  <span className="ml-auto text-slate-500">{hold.type}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Selected placed hold */}
      {selectedPlacedId !== null && (
        <section>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Selected</h3>
          <button onClick={onDeleteSelected} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Remove from canvas
          </button>
        </section>
      )}

      <p className="text-xs text-slate-600">{placedHolds.length} hold{placedHolds.length !== 1 ? 's' : ''} placed</p>
    </div>
  )
}

// Tab: Info (metadata)
function InfoTab({ meta, setMeta, gymGradingSystem }) {
  const grades = gymGradingSystem === 'V-Scale' ? V_GRADES : gymGradingSystem === 'Custom' ? [] : FONT_GRADES

  function toggleTag(tag) {
    setMeta(m => ({
      ...m,
      styleTags: m.styleTags.includes(tag) ? m.styleTags.filter(t => t !== tag) : [...m.styleTags, tag],
    }))
  }

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
  const labelClass = "block text-xs text-slate-400 mb-1"

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Name */}
      <div>
        <label className={labelClass}>Route name</label>
        <input type="text" value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} placeholder="e.g. The Crimson Project" className={inputClass} />
      </div>

      {/* Grade + Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Grade</label>
          {grades.length > 0 ? (
            <select value={meta.grade} onChange={e => setMeta(m => ({ ...m, grade: e.target.value }))} className={inputClass}>
              <option value="">—</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <input type="text" value={meta.grade} onChange={e => setMeta(m => ({ ...m, grade: e.target.value }))} placeholder="Custom grade" className={inputClass} />
          )}
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={meta.routeType} onChange={e => setMeta(m => ({ ...m, routeType: e.target.value }))} className={inputClass}>
            {ROUTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Tape color */}
      <div>
        <label className={labelClass}>Tape color</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TAPE_COLORS.map(c => (
            <button key={c} onClick={() => setMeta(m => ({ ...m, tapeColor: c }))}
              title={c}
              className={`w-6 h-6 rounded-full border-2 transition-all ${meta.tapeColor === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: COLOR_MAP[c] }}
            />
          ))}
        </div>
      </div>

      {/* Setter + Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Setter</label>
          <input type="text" value={meta.setter} onChange={e => setMeta(m => ({ ...m, setter: e.target.value }))} placeholder="Your name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date set</label>
          <input type="date" value={meta.dateSet} onChange={e => setMeta(m => ({ ...m, dateSet: e.target.value }))} className={inputClass} />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className={labelClass}>Status</label>
        <select value={meta.status} onChange={e => setMeta(m => ({ ...m, status: e.target.value }))} className={inputClass}>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Style tags */}
      <div>
        <label className={labelClass}>Style tags</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {STYLE_TAGS.map(tag => {
            const active = meta.styleTags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Tab: Stages
function StagesTab({ stages, setStages, routeType }) {
  const visibleStages = routeType === 'Lead' || routeType === 'Top-rope'
    ? STAGES.filter(s => s.id !== 9)
    : STAGES

  const completed = visibleStages.filter(s => stages[s.id]).length

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Setting progress</span>
          <span>{completed}/{visibleStages.length}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(completed / visibleStages.length) * 100}%` }}
          />
        </div>
      </div>

      {visibleStages.map(stage => {
        const done = !!stages[stage.id]
        return (
          <button
            key={stage.id}
            onClick={() => setStages(s => ({ ...s, [stage.id]: !s[stage.id] }))}
            className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors border ${done ? 'border-indigo-800 bg-indigo-950/50' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
          >
            {/* Checkbox */}
            <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${done ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
              {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div>
              <p className={`text-xs font-medium leading-none ${done ? 'text-indigo-300 line-through' : 'text-slate-200'}`}>
                {stage.id}. {stage.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stage.desc}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Tab: Testing Log
function TestingTab({ routeId }) {
  const [testers, setTesters] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', height: '', ability: 'Intermediate', completed: 'Yes', feedback: '', suggestedChanges: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => { loadTesters() }, [routeId])

  async function loadTesters() {
    const data = await db.testers.where('routeId').equals(routeId).toArray()
    setTesters(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await db.testers.add(stamp({ ...form, routeId }))
    setForm({ name: '', height: '', ability: 'Intermediate', completed: 'Yes', feedback: '', suggestedChanges: '', date: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    loadTesters()
  }

  async function handleDelete(id) {
    await db.testers.delete(id)
    loadTesters()
  }

  const passed = testers.filter(t => t.completed === 'Yes').length
  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary */}
      {testers.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{testers.length}</p>
            <p className="text-xs text-slate-400">Testers</p>
          </div>
          <div className="flex-1 bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{passed}</p>
            <p className="text-xs text-slate-400">Passed</p>
          </div>
          <div className="flex-1 bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-red-400">{testers.length - passed}</p>
            <p className="text-xs text-slate-400">Failed</p>
          </div>
        </div>
      )}

      {/* Tester list */}
      {testers.length === 0 && !showForm && (
        <p className="text-slate-500 text-xs text-center py-4">No testers logged yet.</p>
      )}

      {testers.map(t => (
        <div key={t.id} className="bg-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{t.name}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${t.completed === 'Yes' ? 'bg-emerald-900/50 text-emerald-400' : t.completed === 'Partial' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                {t.completed}
              </span>
              <button onClick={() => handleDelete(t.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span>{t.ability}</span>
            {t.height && <span>· {t.height}cm</span>}
            <span>· {t.date}</span>
          </div>
          {t.feedback && <p className="text-xs text-slate-400 italic">"{t.feedback}"</p>}
          {t.suggestedChanges && <p className="text-xs text-slate-500">→ {t.suggestedChanges}</p>}
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <input type="text" placeholder="Tester name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Height (cm)" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} className={inputClass} />
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.ability} onChange={e => setForm(f => ({ ...f, ability: e.target.value }))} className={inputClass}>
              {ABILITY_LEVELS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.completed} onChange={e => setForm(f => ({ ...f, completed: e.target.value }))} className={inputClass}>
              {COMPLETED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <textarea placeholder="Feedback" value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} rows={2} className={inputClass + ' resize-none'} />
          <textarea placeholder="Suggested changes" value={form.suggestedChanges} onChange={e => setForm(f => ({ ...f, suggestedChanges: e.target.value }))} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Add tester</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
          + Add tester
        </button>
      )}
    </div>
  )
}

// Tab: Customer Feedback
function FeedbackTab({ routeId }) {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customerName: '', date: new Date().toISOString().split('T')[0], rating: 3, feedback: '', tags: [] })

  useEffect(() => { loadFeedback() }, [routeId])

  async function loadFeedback() {
    const data = await db.feedback.where('routeId').equals(routeId).toArray()
    setEntries(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    await db.feedback.add(stamp({ ...form, routeId }))
    setForm({ customerName: '', date: new Date().toISOString().split('T')[0], rating: 3, feedback: '', tags: [] })
    setShowForm(false)
    loadFeedback()
  }

  async function handleDelete(id) {
    await db.feedback.delete(id)
    loadFeedback()
  }

  function toggleTag(tag) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  const avgRating = entries.length ? (entries.reduce((sum, e) => sum + (e.rating ?? 0), 0) / entries.length).toFixed(1) : null
  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"

  function Stars({ rating, interactive, onChange }) {
    return (
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <button key={i} type="button" onClick={() => interactive && onChange(i)} className={interactive ? 'cursor-pointer' : 'cursor-default'}>
            <svg className={`w-4 h-4 ${i <= rating ? 'text-yellow-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary */}
      {entries.length > 0 && (
        <div className="flex gap-3 items-center bg-slate-800 rounded-lg p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{avgRating}</p>
            <p className="text-xs text-slate-400">avg rating</p>
          </div>
          <Stars rating={Math.round(avgRating)} interactive={false} onChange={() => {}} />
          <p className="text-xs text-slate-500 ml-auto">{entries.length} review{entries.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Feedback list */}
      {entries.length === 0 && !showForm && (
        <p className="text-slate-500 text-xs text-center py-4">No customer feedback yet.</p>
      )}

      {entries.map(e => (
        <div key={e.id} className="bg-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{e.customerName || 'Anonymous'}</span>
            <div className="flex items-center gap-2">
              <Stars rating={e.rating} interactive={false} onChange={() => {}} />
              <button onClick={() => handleDelete(e.id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{e.date}</p>
          {e.feedback && <p className="text-xs text-slate-400 italic">"{e.feedback}"</p>}
          {e.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {e.tags.map(tag => <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{tag}</span>)}
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <input type="text" placeholder="Name (optional)" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputClass} />
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
          <div>
            <p className="text-xs text-slate-400 mb-1">Rating</p>
            <Stars rating={form.rating} interactive={true} onChange={r => setForm(f => ({ ...f, rating: r }))} />
          </div>
          <textarea placeholder="Feedback" value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} rows={2} className={inputClass + ' resize-none'} />
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS.map(tag => {
              const active = form.tags.includes(tag)
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${active ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Add feedback</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
          + Add feedback
        </button>
      )}
    </div>
  )
}

// ── Sidebar shell ─────────────────────────────────────────────────────────────
function Sidebar({ routeId, grid, setGrid, holdsLibrary, selectedHoldId, setSelectedHoldId, placedHolds, onDeleteSelected, selectedPlacedId, meta, setMeta, gymGradingSystem, stages, setStages, onSave, saving }) {
  const [activeTab, setActiveTab] = useState('holds')

  const tabs = [
    { id: 'holds',    label: 'Holds'    },
    { id: 'info',     label: 'Info'     },
    { id: 'stages',   label: 'Stages'   },
    { id: 'testing',  label: 'Testing'  },
    { id: 'feedback', label: 'Feedback' },
  ]

  return (
    <div className="w-72 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Tab bar — scrollable so all 5 fit */}
      <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'holds' && (
          <HoldsTab
            grid={grid} setGrid={setGrid}
            holdsLibrary={holdsLibrary}
            selectedHoldId={selectedHoldId} setSelectedHoldId={setSelectedHoldId}
            placedHolds={placedHolds}
            onDeleteSelected={onDeleteSelected}
            selectedPlacedId={selectedPlacedId}
          />
        )}
        {activeTab === 'info' && (
          <InfoTab meta={meta} setMeta={setMeta} gymGradingSystem={gymGradingSystem} />
        )}
        {activeTab === 'stages' && (
          <StagesTab stages={stages} setStages={setStages} routeType={meta.routeType} />
        )}
        {activeTab === 'testing' && (
          <TestingTab routeId={routeId} />
        )}
        {activeTab === 'feedback' && (
          <FeedbackTab routeId={routeId} />
        )}
      </div>

      {/* Save — only relevant for canvas/info/stages tabs */}
      {['holds','info','stages'].includes(activeTab) && (
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? 'Saving…' : 'Save route'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Planner() {
  const { routeId } = useParams()
  const navigate = useNavigate()

  const [route, setRoute] = useState(null)
  const [wall, setWall] = useState(null)
  const [gym, setGym] = useState(null)
  const [holdsLibrary, setHoldsLibrary] = useState([])

  const [grid, setGrid] = useState({ rows: 8, cols: 6, visible: true })
  const [placedHolds, setPlacedHolds] = useState([])
  const [selectedHoldId, setSelectedHoldId] = useState(null)
  const [selectedPlacedId, setSelectedPlacedId] = useState(null)
  const [meta, setMeta] = useState({ ...defaultMeta })
  const [stages, setStages] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadData() }, [routeId])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setSelectedHoldId(null); setSelectedPlacedId(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadData() {
    const r = await db.routes.get(routeId)
    if (!r) { navigate('/gyms'); return }
    setRoute(r)

    // Restore metadata
    setMeta({
      name:      r.name       ?? '',
      grade:     r.grade      ?? '',
      routeType: r.routeType  ?? 'Boulder',
      tapeColor: r.tapeColor  ?? 'Red',
      setter:    r.setter     ?? '',
      dateSet:   r.dateSet    ?? new Date().toISOString().split('T')[0],
      status:    r.status     ?? 'planned',
      styleTags: r.styleTags  ?? [],
    })

    // Restore stages
    setStages(r.stages ?? {})

    const w = await db.walls.get(r.wallId)
    setWall(w ?? null)

    if (w) {
      const g = await db.gyms.get(w.gymId)
      setGym(g ?? null)
      const holds = await db.holds.where('gymId').equals(w.gymId).toArray()
      setHoldsLibrary(holds)
    }

    // Restore canvas state
    if (r.canvasState) {
      const state = typeof r.canvasState === 'string' ? JSON.parse(r.canvasState) : r.canvasState
      if (state.grid) setGrid(state.grid)
      if (state.placedHolds) setPlacedHolds(state.placedHolds)
    }
  }

  function handlePlace(x, y) {
    if (selectedHoldId === null) return
    setPlacedHolds(prev => [...prev, { id: Date.now(), holdId: selectedHoldId, x, y }])
    setSelectedHoldId(null)
  }

  function handleDeleteSelected() {
    setPlacedHolds(prev => prev.filter(p => p.id !== selectedPlacedId))
    setSelectedPlacedId(null)
  }

  async function handleSave() {
    setSaving(true)
    await db.routes.update(routeId, touch({
      // Metadata
      name:      meta.name,
      grade:     meta.grade,
      routeType: meta.routeType,
      tapeColor: meta.tapeColor,
      setter:    meta.setter,
      dateSet:   meta.dateSet,
      status:    meta.status,
      styleTags: meta.styleTags,
      // Stages
      stages,
      // Canvas
      canvasState: { grid, placedHolds },
    }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExportPdf() {
    setExporting(true)
    const testers = await db.testers.where('routeId').equals(routeId).toArray()
    await exportRouteCardPdf({ route: { ...route, ...meta, stages }, wall, gym, testers })
    setExporting(false)
  }

  const backPath = wall ? `/gyms/${wall.gymId}/walls` : '/gyms'

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <button onClick={() => navigate(backPath)} className="text-sm text-slate-400 hover:text-white transition-colors">
          ← {wall?.name ?? 'Back'}
        </button>
        <span className="text-slate-700">|</span>
        <h1 className="text-sm font-semibold text-white truncate">
          {meta.name || route?.name || 'Route Planner'}
        </h1>
        {meta.grade && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{meta.grade}</span>
        )}
        {meta.status && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 capitalize">{meta.status}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Generating…' : '↓ Export PDF'}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Canvas
          wall={wall}
          grid={grid}
          placedHolds={placedHolds}
          holdsLibrary={holdsLibrary}
          selectedHoldId={selectedHoldId}
          onPlace={handlePlace}
          selectedPlacedId={selectedPlacedId}
          setSelectedPlacedId={setSelectedPlacedId}
        />
        <Sidebar
          routeId={routeId}
          grid={grid} setGrid={setGrid}
          holdsLibrary={holdsLibrary}
          selectedHoldId={selectedHoldId} setSelectedHoldId={setSelectedHoldId}
          placedHolds={placedHolds}
          onDeleteSelected={handleDeleteSelected}
          selectedPlacedId={selectedPlacedId}
          meta={meta} setMeta={setMeta}
          gymGradingSystem={gym?.gradingSystem ?? 'Fontainebleau'}
          stages={stages} setStages={setStages}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  )
}
