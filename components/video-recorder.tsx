"use client"

import { useRef, useState, useCallback } from "react"

export function useVideoRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(5)

  const startRecording = useCallback(
    (canvas: HTMLCanvasElement, audioDestination?: MediaStreamAudioDestinationNode, soundEnabled?: boolean) => {
      if (!canvas) return

      recordedChunksRef.current = []
      setVideoBlob(null)

      try {
        // Get canvas stream
        const canvasStream = canvas.captureStream(60)

        // Combine with audio stream if sound is enabled
        let combinedStream = canvasStream

        if (soundEnabled && audioDestination) {
          const audioStream = audioDestination.stream

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
    },
    [recordingDuration],
  )

  const downloadVideo = useCallback(() => {
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
  }, [videoBlob])

  const previewVideo = useCallback(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob)
      window.open(url, "_blank")
    }
  }, [videoBlob])

  const clearVideo = useCallback(() => {
    setVideoBlob(null)
  }, [])

  return {
    isRecording,
    videoBlob,
    recordingDuration,
    setRecordingDuration,
    startRecording,
    downloadVideo,
    previewVideo,
    clearVideo,
  }
}
