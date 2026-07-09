import { useState, useEffect, useRef } from 'react'
import { db } from '../db/index'

const PHOTO_TYPES = [
  { id: 'stripped',   label: 'Stripped',    desc: 'Wall cleared of all holds',   emoji: '🧹' },
  { id: 'with-holds', label: 'With holds',  desc: 'Wall with holds set',          emoji: '🤜' },
  { id: 'partial',    label: 'Partial',     desc: 'Partial / in-progress state',  emoji: '🔧' },
]

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current, total }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-colors ${i < current ? 'bg-indigo-500' : i === current ? 'bg-indigo-400' : 'bg-slate-700'}`}
        />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MobileUpload() {
  const [step, setStep] = useState(0) // 0: gym, 1: wall, 2: type, 3: photo, 4: done
  const [gyms, setGyms] = useState([])
  const [walls, setWalls] = useState([])
  const [selectedGym, setSelectedGym] = useState(null)
  const [selectedWall, setSelectedWall] = useState(null)
  const [photoType, setPhotoType] = useState(null)
  const [preview, setPreview] = useState(null)
  const [photoData, setPhotoData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    db.gyms.toArray().then(setGyms)
  }, [])

  async function selectGym(gym) {
    setSelectedGym(gym)
    const wallData = await db.walls.where('gymId').equals(gym.id).toArray()
    setWalls(wallData)
    setStep(1)
  }

  function selectWall(wall) {
    setSelectedWall(wall)
    setStep(2)
  }

  function selectType(type) {
    setPhotoType(type)
    setStep(3)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoData(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if (!photoData || !selectedWall) return
    setUploading(true)

    // Store the photo on the wall record under the appropriate key
    const key = photoType === 'stripped' ? 'photoStripped'
              : photoType === 'with-holds' ? 'photoWithHolds'
              : 'photoPartial'

    await db.walls.update(selectedWall.id, { [key]: photoData, photo: photoData })
    setUploading(false)
    setStep(4)
  }

  function reset() {
    setStep(0)
    setSelectedGym(null)
    setSelectedWall(null)
    setPhotoType(null)
    setPreview(null)
    setPhotoData(null)
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const cardClass = "w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-left active:scale-95 transition-transform"
  const titleClass = "text-base font-semibold text-white"
  const subtitleClass = "text-sm text-slate-400 mt-0.5"

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-safe pt-6 pb-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">SetterCanvas</h1>
            <p className="text-xs text-slate-400">Wall photo upload</p>
          </div>
          {step > 0 && step < 4 && (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-slate-800">
              ← Back
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <Steps current={step} total={5} />

        {/* Step 0: Select gym */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Select gym</h2>
            <p className="text-slate-400 text-sm mb-6">Which gym are you at?</p>
            {gyms.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No gyms found. Add gyms on desktop first.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {gyms.map(gym => (
                  <button key={gym.id} onClick={() => selectGym(gym)} className={cardClass}>
                    <p className={titleClass}>{gym.name}</p>
                    {gym.location && <p className={subtitleClass}>{gym.location}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Select wall */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Select wall</h2>
            <p className="text-slate-400 text-sm mb-6">Which wall at {selectedGym?.name}?</p>
            {walls.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No walls at this gym yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {walls.map(wall => (
                  <button key={wall.id} onClick={() => selectWall(wall)} className={cardClass}>
                    <p className={titleClass}>{wall.name}</p>
                    <p className={subtitleClass}>{wall.type} · {wall.angle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Photo type */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Photo type</h2>
            <p className="text-slate-400 text-sm mb-6">What does this photo show?</p>
            <div className="flex flex-col gap-3">
              {PHOTO_TYPES.map(type => (
                <button key={type.id} onClick={() => selectType(type.id)} className={cardClass}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.emoji}</span>
                    <div>
                      <p className={titleClass}>{type.label}</p>
                      <p className={subtitleClass}>{type.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Take / choose photo */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Take photo</h2>
            <p className="text-slate-400 text-sm mb-6">
              {selectedWall?.name} · {PHOTO_TYPES.find(t => t.id === photoType)?.label}
            </p>

            {/* Preview */}
            {preview ? (
              <div className="relative mb-4 rounded-2xl overflow-hidden">
                <img src={preview} alt="Preview" className="w-full object-cover rounded-2xl" />
                <button
                  onClick={() => { setPreview(null); setPhotoData(null) }}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1 rounded-full"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video bg-slate-800 border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-3 mb-4 cursor-pointer active:bg-slate-700 transition-colors"
              >
                <span className="text-4xl">📸</span>
                <p className="text-slate-400 text-sm">Tap to open camera or gallery</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {!preview && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-4 rounded-2xl text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors mb-3"
                >
                  📷 Open Camera
                </button>
                <button
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.removeAttribute('capture')
                      fileRef.current.click()
                      setTimeout(() => fileRef.current?.setAttribute('capture', 'environment'), 500)
                    }
                  }}
                  className="w-full py-4 rounded-2xl text-base font-semibold bg-slate-800 text-slate-300 transition-colors"
                >
                  🖼️ Choose from Gallery
                </button>
              </>
            )}

            {preview && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-4 rounded-2xl text-base font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
              >
                {uploading ? 'Saving…' : '✓ Save photo'}
              </button>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center py-8 gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-900/40 border border-emerald-700 flex items-center justify-center text-4xl">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Photo saved!</h2>
              <p className="text-slate-400 text-sm mt-2">
                The photo for <strong className="text-white">{selectedWall?.name}</strong> has been saved locally.
                It will appear in the desktop app.
              </p>
            </div>
            <button
              onClick={reset}
              className="mt-4 w-full py-4 rounded-2xl text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Upload another photo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
