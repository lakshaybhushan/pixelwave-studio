"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Video,
  Download,
  Eye,
  Volume2,
  VolumeX,
  ImageIcon,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"

type EffectType = "subtle-shimmer" | "wave-flow" | "twinkle" | "ascii" | "crt"

const SAMPLE_IMAGES = [
  {
    id: 1,
    name: "Aesthetic Painting",
    url: "https://images.unsplash.com/photo-1578301996581-bf7caec556c0?w=800&h=600&fit=crop",
    thumb: "https://images.unsplash.com/photo-1578301996581-bf7caec556c0?w=150&h=150&fit=crop",
  },
  {
    id: 2,
    name: "Spooky House",
    url: "https://images.unsplash.com/photo-1481018085669-2bc6e4f00eed?w=800&h=600&fit=crop",
    thumb: "https://images.unsplash.com/photo-1481018085669-2bc6e4f00eed?w=150&h=150&fit=crop",
  },
  {
    id: 3,
    name: "Uncle Reading Newspaper",
    url: "https://images.unsplash.com/photo-1560957123-e8e019c66980?w=800&h=600&fit=crop",
    thumb: "https://images.unsplash.com/photo-1560957123-e8e019c66980?w=150&h=150&fit=crop",
  },
  {
    id: 4,
    name: "Astronaut on Rover",
    url: "https://images.unsplash.com/photo-1614315517650-3771cf72d18a?w=800&h=600&fit=crop&crop=face",
    thumb: "https://images.unsplash.com/photo-1614315517650-3771cf72d18a?w=150&h=150&fit=crop&crop=face",
  },
]

// Preload sample images for better performance
const preloadImages = () => {
  SAMPLE_IMAGES.forEach((sample) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = sample.url

    const thumb = new Image()
    thumb.crossOrigin = "anonymous"
    thumb.src = sample.thumb
  })
}

// macOS-inspired loading spinner component
const MacOSSpinner = ({ size = 24 }: { size?: number }) => {
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-muted-foreground rounded-full animate-macos-spinner"
            style={{
              width: size * 0.08,
              height: size * 0.25,
              left: "50%",
              top: "10%",
              transformOrigin: `0 ${size * 0.4}px`,
              transform: `translateX(-50%) rotate(${i * 30}deg)`,
              animationDelay: `${i * 0.083}s`,
              opacity: 0.3 + (i / 12) * 0.7,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Theme toggle component
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="rounded-full w-10 h-10 bg-transparent">
        <div className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full w-10 h-10 transition-all duration-200 hover:scale-105"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [brightness, setBrightness] = useState(1.0)
  const [effectType, setEffectType] = useState<EffectType>("subtle-shimmer")
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.15)
  const [showSamples, setShowSamples] = useState(false)

  // Video recording states
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(5)

  // Convert UI speed (1-10) to actual animation speed (0.01-0.3)
  const getActualSpeed = useCallback((uiSpeed: number) => {
    return (uiSpeed / 10) * 0.3
  }, [])

  // Initialize audio context with destination for recording
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNodeRef.current = audioContextRef.current.createGain()
      audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination()

      gainNodeRef.current.gain.value = soundVolume
      gainNodeRef.current.connect(audioContextRef.current.destination) // For speakers
      gainNodeRef.current.connect(audioDestinationRef.current) // For recording
    }
  }, [soundVolume])

  // Update volume when slider changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = soundVolume
    }
  }, [soundVolume])

  // Create high-quality looping sound effects for all effects
  const startEffectAudio = useCallback(
    (effectType: EffectType) => {
      if (!soundEnabled || !audioContextRef.current || !gainNodeRef.current) return

      // Stop ALL previous audio completely
      stopEffectAudio()

      const audioContext = audioContextRef.current
      const gainNode = gainNodeRef.current

      switch (effectType) {
        case "subtle-shimmer":
          // Beautiful ambient shimmer with multiple harmonics
          const shimmer1 = audioContext.createOscillator()
          const shimmer2 = audioContext.createOscillator()
          const shimmer3 = audioContext.createOscillator()
          const shimmerGain1 = audioContext.createGain()
          const shimmerGain2 = audioContext.createGain()
          const shimmerGain3 = audioContext.createGain()

          shimmer1.type = "sine"
          shimmer2.type = "sine"
          shimmer3.type = "triangle"
          shimmer1.frequency.value = 220
          shimmer2.frequency.value = 330
          shimmer3.frequency.value = 440

          shimmerGain1.gain.value = 0.2
          shimmerGain2.gain.value = 0.15
          shimmerGain3.gain.value = 0.1

          // Create gentle modulation for shimmer effect
          const shimmerLFO1 = audioContext.createOscillator()
          const shimmerLFO2 = audioContext.createOscillator()
          const shimmerLFOGain1 = audioContext.createGain()
          const shimmerLFOGain2 = audioContext.createGain()

          shimmerLFO1.type = "sine"
          shimmerLFO2.type = "sine"
          shimmerLFO1.frequency.value = 0.3
          shimmerLFO2.frequency.value = 0.7
          shimmerLFOGain1.gain.value = 15
          shimmerLFOGain2.gain.value = 10

          shimmerLFO1.connect(shimmerLFOGain1)
          shimmerLFO2.connect(shimmerLFOGain2)
          shimmerLFOGain1.connect(shimmer1.frequency)
          shimmerLFOGain2.connect(shimmer2.frequency)

          shimmer1.connect(shimmerGain1)
          shimmer2.connect(shimmerGain2)
          shimmer3.connect(shimmerGain3)
          shimmerGain1.connect(gainNode)
          shimmerGain2.connect(gainNode)
          shimmerGain3.connect(gainNode)

          shimmer1.start()
          shimmer2.start()
          shimmer3.start()
          shimmerLFO1.start()
          shimmerLFO2.start()

          oscillatorRef.current = shimmer1
          ;(oscillatorRef.current as any).additionalOscillators = [shimmer2, shimmer3, shimmerLFO1, shimmerLFO2]
          break

        case "wave-flow":
          // Rich ocean wave sounds with multiple layers
          const wave1 = audioContext.createOscillator()
          const wave2 = audioContext.createOscillator()
          const wave3 = audioContext.createOscillator()
          const wave4 = audioContext.createOscillator()
          const waveGain1 = audioContext.createGain()
          const waveGain2 = audioContext.createGain()
          const waveGain3 = audioContext.createGain()
          const waveGain4 = audioContext.createGain()

          wave1.type = "sine"
          wave2.type = "sine"
          wave3.type = "triangle"
          wave4.type = "sawtooth"

          wave1.frequency.value = 60
          wave2.frequency.value = 90
          wave3.frequency.value = 120
          wave4.frequency.value = 40

          waveGain1.gain.value = 0.25
          waveGain2.gain.value = 0.2
          waveGain3.gain.value = 0.15
          waveGain4.gain.value = 0.1

          // Create wave-like modulation with multiple LFOs
          const waveLFO1 = audioContext.createOscillator()
          const waveLFO2 = audioContext.createOscillator()
          const waveLFO3 = audioContext.createOscillator()
          const waveLFOGain1 = audioContext.createGain()
          const waveLFOGain2 = audioContext.createGain()
          const waveLFOGain3 = audioContext.createGain()

          waveLFO1.type = "sine"
          waveLFO2.type = "sine"
          waveLFO3.type = "triangle"
          waveLFO1.frequency.value = 0.2
          waveLFO2.frequency.value = 0.5
          waveLFO3.frequency.value = 0.8
          waveLFOGain1.gain.value = 20
          waveLFOGain2.gain.value = 15
          waveLFOGain3.gain.value = 10

          waveLFO1.connect(waveLFOGain1)
          waveLFO2.connect(waveLFOGain2)
          waveLFO3.connect(waveLFOGain3)
          waveLFOGain1.connect(wave1.frequency)
          waveLFOGain2.connect(wave2.frequency)
          waveLFOGain3.connect(wave3.frequency)

          wave1.connect(waveGain1)
          wave2.connect(waveGain2)
          wave3.connect(waveGain3)
          wave4.connect(waveGain4)
          waveGain1.connect(gainNode)
          waveGain2.connect(gainNode)
          waveGain3.connect(gainNode)
          waveGain4.connect(gainNode)

          wave1.start()
          wave2.start()
          wave3.start()
          wave4.start()
          waveLFO1.start()
          waveLFO2.start()
          waveLFO3.start()

          oscillatorRef.current = wave1
          ;(oscillatorRef.current as any).additionalOscillators = [wave2, wave3, wave4, waveLFO1, waveLFO2, waveLFO3]
          break

        case "twinkle":
          // Magical ambient sparkle with continuous twinkling
          const twinkleBase = audioContext.createOscillator()
          const twinkleBaseGain = audioContext.createGain()

          twinkleBase.type = "sine"
          twinkleBase.frequency.value = 660
          twinkleBaseGain.gain.value = 0.1

          // Create sparkle modulation
          const twinkleLFO = audioContext.createOscillator()
          const twinkleLFOGain = audioContext.createGain()
          twinkleLFO.type = "triangle"
          twinkleLFO.frequency.value = 1.5
          twinkleLFOGain.gain.value = 200

          twinkleLFO.connect(twinkleLFOGain)
          twinkleLFOGain.connect(twinkleBase.frequency)

          // Add high frequency sparkles
          const sparkle1 = audioContext.createOscillator()
          const sparkle2 = audioContext.createOscillator()
          const sparkleGain1 = audioContext.createGain()
          const sparkleGain2 = audioContext.createGain()

          sparkle1.type = "triangle"
          sparkle2.type = "sine"
          sparkle1.frequency.value = 1320
          sparkle2.frequency.value = 1760

          sparkleGain1.gain.value = 0.08
          sparkleGain2.gain.value = 0.06

          // Modulate sparkles
          const sparkleLFO1 = audioContext.createOscillator()
          const sparkleLFO2 = audioContext.createOscillator()
          const sparkleLFOGain1 = audioContext.createGain()
          const sparkleLFOGain2 = audioContext.createGain()

          sparkleLFO1.type = "sine"
          sparkleLFO2.type = "sine"
          sparkleLFO1.frequency.value = 2.3
          sparkleLFO2.frequency.value = 3.1
          sparkleLFOGain1.gain.value = 0.05
          sparkleLFOGain2.gain.value = 0.04

          sparkleLFO1.connect(sparkleLFOGain1)
          sparkleLFO2.connect(sparkleLFOGain2)
          sparkleLFOGain1.connect(sparkleGain1.gain)
          sparkleLFOGain2.connect(sparkleGain2.gain)

          twinkleBase.connect(twinkleBaseGain)
          sparkle1.connect(sparkleGain1)
          sparkle2.connect(sparkleGain2)
          twinkleBaseGain.connect(gainNode)
          sparkleGain1.connect(gainNode)
          sparkleGain2.connect(gainNode)

          twinkleBase.start()
          sparkle1.start()
          sparkle2.start()
          twinkleLFO.start()
          sparkleLFO1.start()
          sparkleLFO2.start()

          oscillatorRef.current = twinkleBase
          ;(oscillatorRef.current as any).additionalOscillators = [
            sparkle1,
            sparkle2,
            twinkleLFO,
            sparkleLFO1,
            sparkleLFO2,
          ]
          break

        case "ascii":
          // Retro computer sounds
          const ascii1 = audioContext.createOscillator()
          const ascii2 = audioContext.createOscillator()
          const asciiGain1 = audioContext.createGain()
          const asciiGain2 = audioContext.createGain()

          ascii1.type = "square"
          ascii2.type = "square"
          ascii1.frequency.value = 220
          ascii2.frequency.value = 110

          asciiGain1.gain.value = 0.15
          asciiGain2.gain.value = 0.1

          // Create digital-style modulation
          const asciiLFO = audioContext.createOscillator()
          const asciiLFOGain = audioContext.createGain()
          asciiLFO.type = "square"
          asciiLFO.frequency.value = 2
          asciiLFOGain.gain.value = 50

          asciiLFO.connect(asciiLFOGain)
          asciiLFOGain.connect(ascii1.frequency)

          ascii1.connect(asciiGain1)
          ascii2.connect(asciiGain2)
          asciiGain1.connect(gainNode)
          asciiGain2.connect(gainNode)

          ascii1.start()
          ascii2.start()
          asciiLFO.start()

          oscillatorRef.current = ascii1
          ;(oscillatorRef.current as any).additionalOscillators = [ascii2, asciiLFO]
          break

        case "crt":
          // CRT monitor hum and buzz
          const crtHum = audioContext.createOscillator()
          const crtBuzz = audioContext.createOscillator()
          const crtHumGain = audioContext.createGain()
          const crtBuzzGain = audioContext.createGain()

          crtHum.type = "sawtooth"
          crtBuzz.type = "square"
          crtHum.frequency.value = 60 // Power line hum
          crtBuzz.frequency.value = 15734 // Horizontal sync frequency

          crtHumGain.gain.value = 0.3
          crtBuzzGain.gain.value = 0.05

          // Add some modulation to the buzz
          const crtLFO = audioContext.createOscillator()
          const crtLFOGain = audioContext.createGain()
          crtLFO.type = "sine"
          crtLFO.frequency.value = 0.1
          crtLFOGain.gain.value = 0.02

          crtLFO.connect(crtLFOGain)
          crtLFOGain.connect(crtBuzzGain.gain)

          crtHum.connect(crtHumGain)
          crtBuzz.connect(crtBuzzGain)
          crtHumGain.connect(gainNode)
          crtBuzzGain.connect(gainNode)

          crtHum.start()
          crtBuzz.start()
          crtLFO.start()

          oscillatorRef.current = crtHum
          ;(oscillatorRef.current as any).additionalOscillators = [crtBuzz, crtLFO]
          break
      }
    },
    [soundEnabled],
  )

  const stopEffectAudio = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        // Stop main oscillator
        oscillatorRef.current.stop()

        // Stop additional oscillators if they exist
        if ((oscillatorRef.current as any).additionalOscillators) {
          ;(oscillatorRef.current as any).additionalOscillators.forEach((osc: OscillatorNode) => {
            try {
              osc.stop()
            } catch (e) {
              // Oscillator might already be stopped
            }
          })
        }

        // Clear sparkle interval if it exists
        if ((oscillatorRef.current as any).sparkleInterval) {
          clearInterval((oscillatorRef.current as any).sparkleInterval)
        }
      } catch (e) {
        // Oscillator might already be stopped
      }

      oscillatorRef.current = null
    }
  }, [])

  const toggleSound = useCallback(() => {
    if (!soundEnabled) {
      initAudio()
      setSoundEnabled(true)
      if (currentImage && isPlaying) {
        startEffectAudio(effectType)
      }
    } else {
      stopEffectAudio()
      setSoundEnabled(false)
    }
  }, [soundEnabled, initAudio, startEffectAudio, stopEffectAudio, currentImage, effectType, isPlaying])

  // Start/stop audio when effect changes or playback state changes
  useEffect(() => {
    if (soundEnabled && currentImage) {
      if (isPlaying) {
        stopEffectAudio()
        startEffectAudio(effectType)
      } else {
        stopEffectAudio()
      }
    }
  }, [effectType, soundEnabled, currentImage, isPlaying, startEffectAudio, stopEffectAudio])

  const loadSampleImage = useCallback((imageUrl: string, imageName: string) => {
    setIsLoadingImage(true)
    setCurrentImage(null)
    setUploadedFileName(null)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setCurrentImage(img)
      setIsLoadingImage(false)
      setUploadedFileName(`${imageName} (Sample)`)
      setShowSamples(false)
    }
    img.onerror = (e) => {
      console.error("Failed to load sample image:", imageUrl, e)
      setCurrentImage(null)
      setIsLoadingImage(false)
    }
    img.src = imageUrl
  }, [])

  const loadImage = useCallback((src: string, fileName?: string) => {
    setIsLoadingImage(true)
    setCurrentImage(null)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setCurrentImage(img)
      setIsLoadingImage(false)
      if (fileName) {
        setUploadedFileName(fileName)
      }
    }
    img.onerror = (e) => {
      console.error("Failed to load image:", src, e)
      setCurrentImage(null)
      setIsLoadingImage(false)
    }
    img.src = src
  }, [])

  const handleFileSelect = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          loadImage(e.target.result as string, file.name)
        }
      }
      reader.onerror = (e) => {
        console.error("FileReader error:", e)
        setIsLoadingImage(false)
      }
      reader.readAsDataURL(file)
    },
    [loadImage],
  )

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))
      if (imageFile) {
        handleFileSelect(imageFile)
      }
    },
    [handleFileSelect],
  )

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Hash function for consistent per-pixel randomness
  const hash = useCallback((x: number, y: number) => {
    let h = x * 374761393 + y * 668265263
    h = (h ^ (h >>> 13)) * 1274126177
    return (h ^ (h >>> 16)) / 4294967296
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!currentImage) {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      return
    }

    const img = currentImage

    // Fixed canvas size - always use the same dimensions
    const canvasWidth = 800
    const canvasHeight = 600

    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    let time = 0
    const asciiChars = " .:-=+*#%@".split("")

    const animate = () => {
      // Fill entire canvas with black first
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Show funny message when paused
      if (!isPlaying) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.font = "24px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const funnyMessages = [
          "🎬 PAUSED 🎬",
          "⏸️ Taking a break...",
          "🍿 Intermission time!",
          "⏯️ Press play when ready",
          "🎭 The show must go on...",
          "⏸️ Pixels are resting",
          "🎪 Halftime show!",
          "⏸️ Buffering... just kidding!",
        ]

        const messageIndex = Math.floor(Date.now() / 2000) % funnyMessages.length
        const message = funnyMessages[messageIndex]

        ctx.fillText(message, canvasWidth / 2, canvasHeight / 2)

        // Add a subtle pulsing effect
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.3})`
        ctx.font = "14px monospace"
        ctx.fillText("Click play to continue the magic ✨", canvasWidth / 2, canvasHeight / 2 + 40)

        return
      }

      // Draw image to fill entire canvas (cover behavior)
      const imgAspect = img.width / img.height
      const canvasAspect = canvasWidth / canvasHeight

      let drawWidth, drawHeight, offsetX, offsetY

      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height
        drawHeight = canvasHeight
        drawWidth = drawHeight * imgAspect
        offsetX = (canvasWidth - drawWidth) / 2
        offsetY = 0
      } else {
        // Image is taller - fit to width
        drawWidth = canvasWidth
        drawHeight = drawWidth / imgAspect
        offsetX = 0
        offsetY = (canvasHeight - drawHeight) / 2
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
      const originalData = new Uint8ClampedArray(imageData.data)

      // Clear canvas again for effect rendering
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      const dotSize = 2
      const spacing = effectType === "ascii" ? 8 : 3

      // Process entire canvas area
      for (let y = 0; y < canvasHeight; y += spacing) {
        for (let x = 0; x < canvasWidth; x += spacing) {
          const i = (y * canvasWidth + x) * 4

          if (i >= originalData.length) continue

          const r = originalData[i]
          const g = originalData[i + 1]
          const b = originalData[i + 2]

          let luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255
          luminance = Math.max(0, Math.min(1, luminance * brightness))

          let animatedSize = dotSize * (luminance * 0.8 + 0.2)
          let shouldDraw = false
          let finalR = r,
            finalG = g,
            finalB = b

          const pixelHash = hash(Math.floor(x / spacing), Math.floor(y / spacing))
          const phase = pixelHash * Math.PI * 2

          switch (effectType) {
            case "subtle-shimmer":
              const shimmerOffset = Math.sin(x * 0.02 + y * 0.02 + time * getActualSpeed(animationSpeed) * 3) * 0.15
              const shimmerOffset2 = Math.cos(x * 0.015 + y * 0.025 + time * getActualSpeed(animationSpeed) * 2) * 0.1
              const threshold = 0.5 + shimmerOffset + shimmerOffset2
              shouldDraw = luminance > threshold
              animatedSize =
                animatedSize + Math.sin(time * getActualSpeed(animationSpeed) * 4 + x * 0.1 + y * 0.1) * 0.4
              const colorShift = Math.sin(time * getActualSpeed(animationSpeed) * 2 + x * 0.01 + y * 0.01) * 15
              finalR = Math.max(0, Math.min(255, r + colorShift))
              finalG = Math.max(0, Math.min(255, g + colorShift * 0.5))
              finalB = Math.max(0, Math.min(255, b + colorShift * 0.8))
              break

            case "wave-flow":
              // Beautiful sine/cosine wave patterns
              const waveSpeed = time * getActualSpeed(animationSpeed)

              // Primary horizontal sine wave
              const horizontalWave = Math.sin(x * 0.01 + waveSpeed * 2) * 0.4

              // Secondary vertical cosine wave
              const verticalWave = Math.cos(y * 0.008 + waveSpeed * 1.5) * 0.3

              // Diagonal interference wave
              const diagonalWave = Math.sin((x + y) * 0.006 + waveSpeed * 2.5) * 0.2

              // Circular wave from center
              const centerX = canvasWidth / 2
              const centerY = canvasHeight / 2
              const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
              const circularWave = Math.cos(distance * 0.02 - waveSpeed * 3) * 0.25

              // Combine all waves
              const combinedWave = horizontalWave + verticalWave + diagonalWave + circularWave
              const waveThreshold = 0.5 + combinedWave * 0.3

              shouldDraw = luminance > waveThreshold

              // Dynamic size based on wave intensity
              const waveIntensity = (combinedWave + 1) / 2 // Normalize to 0-1
              animatedSize = dotSize * (luminance * 0.6 + 0.4) * (0.3 + waveIntensity * 1.2)

              // Color shifting based on wave patterns
              const colorWaveR = Math.sin(x * 0.005 + waveSpeed * 1.8) * 25
              const colorWaveG = Math.cos(y * 0.007 + waveSpeed * 2.2) * 20
              const colorWaveB = Math.sin((x + y) * 0.004 + waveSpeed * 1.6) * 30

              finalR = Math.max(0, Math.min(255, r + colorWaveR))
              finalG = Math.max(0, Math.min(255, g + colorWaveG))
              finalB = Math.max(0, Math.min(255, b + colorWaveB))
              break

            case "twinkle":
              // Use hash for consistent per-pixel phase
              const twinkleWave = Math.sin(phase + time * getActualSpeed(animationSpeed) * 2) * 0.5 + 0.5
              const twinkleThreshold = 0.3 + pixelHash * 0.3 // Vary threshold per pixel
              shouldDraw = luminance > twinkleThreshold && twinkleWave > 0.4
              animatedSize = dotSize * (luminance * 0.8 + 0.2) * (0.5 + twinkleWave * 0.8)
              // Add sparkle effect
              const sparkle = twinkleWave > 0.85 ? 1.5 : 1
              animatedSize *= sparkle
              break

            case "ascii":
              const charIndex = Math.floor(luminance * (asciiChars.length - 1))
              const char = asciiChars[charIndex]

              // More visible animation while keeping image readable
              const baseThreshold = 0.1 // Keep low threshold to show image structure

              // More noticeable flicker with multiple wave patterns
              const primaryFlicker = Math.sin(phase * 0.8 + time * getActualSpeed(animationSpeed) * 2.5) * 0.3 + 0.7
              const secondaryFlicker = Math.cos(phase * 1.3 + time * getActualSpeed(animationSpeed) * 3.2) * 0.2 + 0.8
              const tertiaryFlicker = Math.sin(phase * 0.5 + time * getActualSpeed(animationSpeed) * 1.8) * 0.15 + 0.85

              // Combine for more dynamic brightness variation
              const dynamicBrightness = primaryFlicker * secondaryFlicker * tertiaryFlicker

              // Show characters where there's image content
              const shouldShow = luminance > baseThreshold

              if (shouldShow) {
                // More dynamic alpha with better visibility
                const alpha = Math.max(0.4, Math.min(1, luminance * brightness * dynamicBrightness * 1.5))

                ctx.font = `${spacing}px monospace`
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"

                // More dynamic colors with visible variation
                const colorVariation = 0.8 + dynamicBrightness * 0.4
                const dynamicR = Math.min(255, r * brightness * colorVariation)
                const dynamicG = Math.min(255, g * brightness * colorVariation)
                const dynamicB = Math.min(255, b * brightness * colorVariation)

                ctx.fillStyle = `rgba(${dynamicR}, ${dynamicG}, ${dynamicB}, ${alpha})`

                // More noticeable position animation
                const jitterX = Math.sin(phase * 0.7 + time * getActualSpeed(animationSpeed) * 2.8) * 0.8
                const jitterY = Math.cos(phase * 1.1 + time * getActualSpeed(animationSpeed) * 2.3) * 0.8

                ctx.fillText(char, x + spacing / 2 + jitterX, y + spacing / 2 + jitterY)
              }
              shouldDraw = false
              break

            case "crt":
              const crtThreshold =
                0.5 + Math.sin(x * 0.02 + y * 0.02 + time * getActualSpeed(animationSpeed) * 2) * 0.15
              shouldDraw = luminance > crtThreshold
              animatedSize =
                dotSize * (luminance * 0.8 + 0.2) + Math.sin(time * getActualSpeed(animationSpeed) * 3 + x * 0.1) * 0.3
              break
          }

          if (shouldDraw && effectType !== "ascii") {
            ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`
            ctx.beginPath()
            ctx.arc(
              x + Math.sin(time * getActualSpeed(animationSpeed) * 1.5 + x * 0.05) * 0.8,
              y + Math.cos(time * getActualSpeed(animationSpeed) * 1.2 + y * 0.05) * 0.8,
              Math.max(0.5, animatedSize),
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }
        }
      }

      if (effectType === "crt") {
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.25 + Math.sin(time * getActualSpeed(animationSpeed) * 0.5) * 0.1})`
        ctx.lineWidth = 1
        for (let y = 0; y < canvasHeight; y += 2) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(canvasWidth, y)
          ctx.stroke()
        }

        const gradient = ctx.createRadialGradient(
          canvasWidth / 2,
          canvasHeight / 2,
          Math.min(canvasWidth, canvasHeight) * 0.3,
          canvasWidth / 2,
          canvasHeight / 2,
          Math.min(canvasWidth, canvasHeight) * 0.7,
        )
        gradient.addColorStop(0, "rgba(0,0,0,0)")
        gradient.addColorStop(1, "rgba(0,0,0,0.4)")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      }

      time += 1

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, animationSpeed, brightness, currentImage, effectType, hash, getActualSpeed])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const resetToDefault = () => {
    // Reset all values to default and remove image
    setCurrentImage(null)
    setUploadedFileName(null)
    setIsPlaying(true)
    setAnimationSpeed(1)
    setBrightness(1.0)
    setSoundVolume(0.15)
    setEffectType("subtle-shimmer")
    setVideoBlob(null)
    setRecordingDuration(5)
    setShowSamples(false)

    // Stop audio
    stopEffectAudio()
    setSoundEnabled(true)

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startRecording = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    recordedChunksRef.current = []
    setVideoBlob(null)

    try {
      // Get canvas stream
      const canvasStream = canvas.captureStream(60)

      // Combine with audio stream if sound is enabled
      let combinedStream = canvasStream

      if (soundEnabled && audioDestinationRef.current) {
        const audioStream = audioDestinationRef.current.stream

        // Create a new MediaStream with both video and audio tracks
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()])
      }

      const options = { mimeType: "video/webm; codecs=vp8,opus" }
      const recorder = new MediaRecorder(combinedStream, options)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
        setVideoBlob(blob)
        setIsRecording(false)
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
        }
      }

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        setIsRecording(false)
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
        }
      }

      recorder.start(100)
      setIsRecording(true)
      mediaRecorderRef.current = recorder

      recordingTimeoutRef.current = setTimeout(
        () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop()
          }
        },
        recordingDuration * 1000 + 100,
      )
    } catch (error) {
      console.error("Error starting MediaRecorder:", error)
      setIsRecording(false)
    }
  }

  const downloadVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `animated-dither-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setVideoBlob(null)
    }
  }

  const previewVideo = () => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob)
      window.open(url, "_blank")
    }
  }

  // Initialize audio on mount
  useEffect(() => {
    initAudio()
  }, [initAudio])

  // Preload sample images on mount
  useEffect(() => {
    preloadImages()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-geist transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-4xl md:text-6xl font-instrument-serif text-foreground mb-3">Animated Dither</h1>
            <p className="text-lg text-muted-foreground font-light max-w-2xl">
              Transform images into mesmerizing animated patterns using various dithering algorithms and effects.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Canvas */}
          <div className="lg:col-span-3">
            {currentImage ? (
              <div className="relative bg-black rounded-xl overflow-hidden shadow-lg border border-border">
                <canvas ref={canvasRef} className="w-full h-auto block" />
              </div>
            ) : (
              <div
                className={`relative bg-muted rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? "ring-2 ring-ring ring-offset-4 ring-offset-background scale-[1.01]"
                    : "border-2 border-dashed border-border hover:border-ring hover:bg-accent/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
                style={{ minHeight: "400px" }}
              >
                {/* Loading state */}
                {isLoadingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <MacOSSpinner size={32} />
                    <p className="text-sm mt-4 text-muted-foreground">Loading image...</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Upload className="w-16 h-16 mx-auto mb-6 opacity-60" />
                      <p className="text-xl font-medium mb-2 text-foreground">Drop an image here</p>
                      <p className="text-sm opacity-75">or click to browse</p>
                      <div className="mt-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSamples(!showSamples)
                          }}
                          variant="outline"
                          className="rounded-full text-sm"
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Browse Gallery
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Sample Images Grid */}
            {showSamples && !currentImage && (
              <div className="mt-6 p-4 bg-muted rounded-xl animate-in slide-in-from-top-2 duration-300">
                <h3 className="text-sm font-medium text-foreground mb-4">Image Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SAMPLE_IMAGES.map((sample, index) => (
                    <button
                      key={sample.id}
                      onClick={() => loadSampleImage(sample.url, sample.name)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-accent hover:ring-2 hover:ring-ring transition-all duration-300 hover:rotate-1 hover:scale-105 animate-in fade-in-0 zoom-in-95"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationDuration: "400ms",
                      }}
                      disabled={isLoadingImage}
                    >
                      <img
                        src={sample.thumb || "/placeholder.svg"}
                        alt={sample.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.src = `/placeholder.svg?height=150&width=150&text=${encodeURIComponent(sample.name)}`
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-end">
                        <div className="w-full p-2 text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/60">
                          {sample.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uploadedFileName && (
              <p className="text-sm text-muted-foreground mt-3 font-geist-mono opacity-70">{uploadedFileName}</p>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-8">
            {/* Playback */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wide">Playback</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlayPause}
                  disabled={!currentImage}
                  className="rounded-full w-10 h-10 transition-all duration-150 hover:scale-105 active:scale-95 bg-transparent"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetToDefault}
                  className="rounded-full w-10 h-10 transition-all duration-150 hover:scale-105 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive bg-transparent"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSound}
                  className="rounded-full w-10 h-10 transition-all duration-150 hover:scale-105 active:scale-95 bg-transparent"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wide">Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-foreground mb-2">
                    Speed <span className="text-muted-foreground">{animationSpeed}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number.parseInt(e.target.value))}
                    disabled={!currentImage}
                    className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">
                    Brightness <span className="text-muted-foreground">{brightness.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={brightness}
                    onChange={(e) => setBrightness(Number.parseFloat(e.target.value))}
                    disabled={!currentImage}
                    className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">
                    Volume <span className="text-muted-foreground">{Math.round(soundVolume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(Number.parseFloat(e.target.value))}
                    disabled={!soundEnabled}
                    className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </div>

            {/* Effects */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wide">Effect</h3>
              <div className="space-y-2">
                {[
                  { key: "subtle-shimmer", label: "Shimmer" },
                  { key: "wave-flow", label: "Wave" },
                  { key: "twinkle", label: "Twinkle" },
                  { key: "ascii", label: "ASCII" },
                  { key: "crt", label: "CRT" },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={effectType === key ? "default" : "ghost"}
                    onClick={() => setEffectType(key as EffectType)}
                    disabled={!currentImage}
                    className={`w-full justify-start text-sm h-9 rounded-full transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] hover:shadow-sm ${
                      effectType === key
                        ? "" // Don't add hover styles for active button
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Export */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wide">Export</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-foreground mb-2">
                    Duration <span className="text-muted-foreground">{recordingDuration}s</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={recordingDuration}
                    onChange={(e) => setRecordingDuration(Number.parseInt(e.target.value))}
                    disabled={isRecording || !currentImage}
                    className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer slider"
                  />
                </div>
                {isRecording ? (
                  <Button
                    disabled
                    className="w-full justify-start text-sm h-9 rounded-full transition-all duration-150"
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    Recording...
                  </Button>
                ) : videoBlob ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={previewVideo}
                      variant="outline"
                      className="flex-1 justify-center text-sm h-9 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      onClick={downloadVideo}
                      className="flex-1 justify-center text-sm h-9 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={startRecording}
                    disabled={!currentImage}
                    className="w-full justify-start text-sm h-9 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Record Video
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-geist-mono tracking-wide">
              v0 x {" "}
              <a
                href="https://x.com/blakssh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
              >
                @blakssh
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
