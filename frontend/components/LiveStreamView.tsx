import { useState, useEffect, useRef } from 'react'
import Cookies from 'js-cookie'
import { Camera, VideoOff, Users } from 'lucide-react'
import { FaceDetection } from '@mediapipe/face_detection'
import { Pose } from '@mediapipe/pose'
import { useLanguage } from '@/contexts/LanguageContext'

interface StreamProps {
  students: any[];
  isActive: boolean;
  lessonId: number;
  isGroupWork?: boolean;
  browserCameraEnabled?: boolean;
}

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${protocol}//${window.location.host}`;
    }
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';
}

const WS_URL = getWsUrl();

export default function LiveStreamView({ students, isActive, lessonId, isGroupWork, browserCameraEnabled = true }: StreamProps) {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)
  const faceDetectionRef = useRef<FaceDetection | null>(null)
  const requestRef = useRef<number>()
  const wsRef = useRef<WebSocket | null>(null)
  const lastWsSendTime = useRef<number>(0)
  const [localFaces, setLocalFaces] = useState<any[]>([])
  const [manualTeacherId, setManualTeacherId] = useState<number | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('closed')
  const [authError, setAuthError] = useState(false)
  const [isEfficiencyMode, setIsEfficiencyMode] = useState(false)
  const poseRef = useRef<any>(null)
  const engagementEmaRef = useRef<Record<string, number>>({})
  const emaAlpha = 0.35
  // useRef instead of useState to avoid stale closure inside faceDetection.onResults
  const latestPoseLandmarksRef = useRef<any>(null)

  const handleResetSession = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    window.location.href = '/login'
  }
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [streamActive, setStreamActive] = useState(false)

  // Get available cameras
  useEffect(() => {
    if (!browserCameraEnabled) return

    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error("Kameraga ruxsat olinmadi:", err)
      }
    }
    getDevices()

    // Initialize FaceDetection
    if (typeof window !== 'undefined') {
      const faceDetection = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      })
      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      })

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      })
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      faceDetection.onResults((results) => {
        if (!results.detections) {
          setLocalFaces([]);
          return;
        }
        
        const detections = results.detections;
        const faces: any[] = detections.map((det: any, i) => {
          const bbox = det.boundingBox;
          const kp = det.keypoints || [];
          
          // === BEHAVIOR DETECTION ===
          let behavior = 'attentive';
          // Use Pose data if available (MediaPipe Pose is single-person, so we match with the first face for simplicity)
          if (i === 0 && latestPoseLandmarksRef.current) {
             const leftEar = latestPoseLandmarksRef.current[7];
             const rightEar = latestPoseLandmarksRef.current[8];
             const leftWrist = latestPoseLandmarksRef.current[15];
             const rightWrist = latestPoseLandmarksRef.current[16];

             if ((leftWrist?.visibility > 0.5 && leftWrist.y < leftEar.y - 0.05) || 
                 (rightWrist?.visibility > 0.5 && rightWrist.y < rightEar.y - 0.05)) {
               behavior = 'raising_hand';
             }
          }

          // === ENGAGEMENT SCORING (1-variant, pose heuristics bilan mosroq) ===
          const tempId = `browser_face_${i}`
          const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

          let engagementRaw = 60
          let poseHeadAttentionScore = 0.5
          let poseWritingScore = 0.2

          if (i === 0 && latestPoseLandmarksRef.current) {
            // PoseLandmarks indices (MediaPipe): nose=0, L/R ear=7/8, L/R shoulder=11/12, L/R wrist=15/16, L/R hip=23/24
            const nose = latestPoseLandmarksRef.current[0]
            const leftEar = latestPoseLandmarksRef.current[7]
            const rightEar = latestPoseLandmarksRef.current[8]
            const leftShoulder = latestPoseLandmarksRef.current[11]
            const rightShoulder = latestPoseLandmarksRef.current[12]
            const leftWrist = latestPoseLandmarksRef.current[15]
            const rightWrist = latestPoseLandmarksRef.current[16]
            const leftHip = latestPoseLandmarksRef.current[23]
            const rightHip = latestPoseLandmarksRef.current[24]

            const avgEarY = (((leftEar?.y ?? 0) + (rightEar?.y ?? 0)) / 2)
            const isLookingDown = (nose?.y ?? 0) > avgEarY + 0.01

            const visibility = (nose && typeof nose.visibility === 'number') ? nose.visibility : 0.8

            // head_attention_score
            if (!isLookingDown) {
              const ear_symmetry = 1.0 - Math.abs((leftEar?.x ?? 0) - (1 - (rightEar?.x ?? 0)))
              poseHeadAttentionScore = clamp01(0.6 * ear_symmetry + 0.4 * visibility)
            } else {
              poseHeadAttentionScore = 0.4
            }

            // posture_score
            const shoulder_level = clamp01(1.0 - Math.abs((leftShoulder?.y ?? 0) - (rightShoulder?.y ?? 0)) * 5)
            const head_above = ((nose?.y ?? 0) < (leftShoulder?.y ?? 0)) ? 1.0 : 0.3
            const posture_score = clamp01(0.6 * shoulder_level + 0.4 * head_above)

            // hand_activity_score
            const leftRaised = (leftWrist?.y ?? 1e9) < (leftShoulder?.y ?? 0)
            const rightRaised = (rightWrist?.y ?? 1e9) < (rightShoulder?.y ?? 0)

            let hand_activity_score = 0.3
            if (leftRaised || rightRaised) {
              hand_activity_score = 1.0
            } else {
              const hand_forward = (Math.abs(leftWrist?.z ?? 0) + Math.abs(rightWrist?.z ?? 0)) / 2
              hand_activity_score = clamp01(Math.min(1.0, hand_forward * 2))
            }

            // writing_score
            const left_near_desk = Math.abs((leftWrist?.y ?? 0) - (leftHip?.y ?? 0)) < 0.2
            const right_near_desk = Math.abs((rightWrist?.y ?? 0) - (rightHip?.y ?? 0)) < 0.2

            if (isLookingDown) poseWritingScore = 0.9
            else if (left_near_desk && right_near_desk) poseWritingScore = 0.8
            else if (left_near_desk || right_near_desk) poseWritingScore = 0.5
            else poseWritingScore = 0.2

            // motion_score (browserda real motion hisoblamaymiz; backendda video uchun ~0.5 chiqadi)
            const motion_score = 0.5

            // EngagementScorer formula
            const score01 =
              0.35 * poseHeadAttentionScore +
              0.25 * posture_score +
              0.20 * hand_activity_score +
              0.15 * poseWritingScore +
              0.05 * motion_score

            engagementRaw = Math.max(0, Math.min(100, Math.round(score01 * 10000) / 100))
          } else {
            // Fallback: face keypoints / bbox heuristic (old logic)
            if (kp.length >= 4) {
              const leftEye = kp[0]
              const rightEye = kp[1]
              const nose = kp[2]
              const mouth = kp[3]
              const eyeDist = Math.abs(leftEye.x - rightEye.x) || 0.01
              const eyeCenterX = (leftEye.x + rightEye.x) / 2
              const noseOffsetX = (nose.x - eyeCenterX) / eyeDist
              const yawRaw = Math.max(0, Math.abs(noseOffsetX) - 0.4)
              const yawPenalty = Math.min(50, yawRaw * (isGroupWork ? 45 : 90))

              const eyeTiltRatio = Math.abs(leftEye.y - rightEye.y) / eyeDist
              const rollPenalty = Math.min(20, Math.max(0, eyeTiltRatio - 0.2) * 60)

              const mouthOffsetX = Math.abs(mouth.x - eyeCenterX) / eyeDist
              const profilePenalty = Math.min(30, Math.max(0, mouthOffsetX - 0.5) * (isGroupWork ? 37 : 75))

              engagementRaw = 100 - yawPenalty - rollPenalty - profilePenalty
              engagementRaw = Math.max(isGroupWork ? 60 : 50, Math.min(100, engagementRaw))
            } else {
              const area = bbox.width * bbox.height
              const distFromCenter = Math.sqrt(Math.pow(bbox.xCenter - 0.5, 2) + Math.pow(bbox.yCenter - 0.5, 2))
              if (area > 0.02 && distFromCenter < 0.3) engagementRaw = 85
              else if (area > 0.005 && distFromCenter < 0.4) engagementRaw = isGroupWork ? 80 : 75
              else if (area > 0.002 && distFromCenter < 0.5) engagementRaw = isGroupWork ? 70 : 60
              else engagementRaw = 30
            }

            // head_attention_score fallback
            poseHeadAttentionScore = clamp01(engagementRaw / 100)
          }

          // Behavior => engagement override
          if (behavior === 'raising_hand') engagementRaw = 100
          else if (engagementRaw < 85 && engagementRaw >= 60) behavior = 'reading_writing'

          // EMA smoothing to reduce jitter
          const prev = engagementEmaRef.current[tempId]
          const engagementEma = prev == null ? engagementRaw : emaAlpha * engagementRaw + (1.0 - emaAlpha) * prev
          engagementEmaRef.current[tempId] = engagementEma

          // Label thresholds (backend EngagementScorer classify)
          const isWriting = poseWritingScore > 0.8
          const activeThreshold = isWriting ? 55 : 70
          const moderateThreshold = isWriting ? 30 : 40
          const label = engagementEma >= activeThreshold ? 'active' : engagementEma >= moderateThreshold ? 'moderate' : 'passive'

          return {
            id: i,
            bbox,
            score: Math.round(engagementEma),
            behavior,
            role: 'student',
            temp_student_id: tempId,
            activity_label: label,
            total_engagement_score: Math.round(engagementEma),
            head_attention_score: clamp01(poseHeadAttentionScore)
          }
        });

        if (manualTeacherId !== null && faces[manualTeacherId]) {
          faces[manualTeacherId].role = 'teacher';
        }
        setLocalFaces(faces);

        // Send to backend
        if (!browserCameraEnabled) return;

        const now = Date.now();
        if (now - lastWsSendTime.current > 1000) {
          console.log(`[Sync] Detected ${faces.length} faces. WS status: ${wsRef.current?.readyState === WebSocket.OPEN ? 'OPEN' : 'NOT OPEN'}`);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
             let frame_base64 = undefined;
             try {
               const canvas = document.createElement('canvas');
               canvas.width = 640; canvas.height = 480;
               const ctx = canvas.getContext('2d');
               if (ctx && videoRef.current) {
                  ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                  frame_base64 = canvas.toDataURL('image/jpeg', 0.6);
               }
             } catch(e) {}

             wsRef.current.send(JSON.stringify({ 
               students: faces, 
               total_detected: faces.length,
               frame_base64: frame_base64
             }));
             lastWsSendTime.current = now;
          }
        }
      })

      pose.onResults((results) => {
        if (results.poseLandmarks) {
          latestPoseLandmarksRef.current = results.poseLandmarks
        }
      })

      faceDetectionRef.current = faceDetection
      poseRef.current = pose
    }

    return () => {
      if (faceDetectionRef.current) {
        faceDetectionRef.current.close()
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [browserCameraEnabled])

  // Manage Stream WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isAuthError = false;

    const connect = () => {
      if (isActive && lessonId && !isAuthError) {
        const token = Cookies.get('access_token')
        
        if (!token) {
          console.warn("[Sync] Access token missing from cookies");
          setAuthError(true);
          return;
        }

        console.log(`[Sync] Attempting WebSocket connection to ${WS_URL}/ws/stream/${lessonId}/`);
        const wsUrl = `${WS_URL}/ws/stream/${lessonId}/?token=${token}`
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log("[Sync] WebSocket Stream Connected Successfully")
          setWsStatus('open')
          setAuthError(false)
        }
        
        ws.onclose = (e) => {
          console.warn(`[Sync] WebSocket Stream Closed: Code=${e.code}, Reason=${e.reason}`);
          if (e.code === 4001) {
             console.error("[Sync] Auth Error (401) - Stopping reconnect");
             setAuthError(true)
             setWsStatus('closed')
             return;
          }
          setWsStatus('closed')
          if (isActive && lessonId) {
            console.log("[Sync] Scheduling reconnect in 3s...");
            reconnectTimeout = setTimeout(connect, 3000)
          }
        }
        
        ws.onerror = (err) => {
          console.error("[Sync] WebSocket Stream Error:", err)
          setWsStatus('closed')
          ws?.close()
        }
        
        wsRef.current = ws
      }
    }

    connect()
    
    return () => {
      clearTimeout(reconnectTimeout)
      ws?.close()
      wsRef.current = null
      setWsStatus('closed')
    }
  }, [isActive, lessonId])

  // Start stream when device or active state changes
  useEffect(() => {
    let currentStream: MediaStream | null = null

    const startStream = async () => {
      if (browserCameraEnabled && isActive && selectedDevice) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDevice } }
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            setStreamActive(true)
            currentStream = stream

            // Start native Camera loop
            const detectFrame = async () => {
               if (videoRef.current && videoRef.current.readyState >= 2 && faceDetectionRef.current) {
                 try {
                   // Run models sequentially for stability
                   await faceDetectionRef.current.send({ image: videoRef.current })
                   if (!isEfficiencyMode && poseRef.current) {
                     await poseRef.current.send({ image: videoRef.current })
                   }
                 } catch (e) {
                   // Ignore minor frame errors
                 }
               }
               requestRef.current = requestAnimationFrame(detectFrame)
            }
            detectFrame()
          }
        } catch (err) {
          console.error("Kamera oqimini o'qib bo'lmadi:", err)
          setStreamActive(false)
        }
      } else {
        setStreamActive(false)
        if (requestRef.current) cancelAnimationFrame(requestRef.current)
        if (videoRef.current) videoRef.current.srcObject = null
      }
    }

    startStream()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isActive, selectedDevice, browserCameraEnabled])

  return (
    <div className="flex flex-col h-full w-full">
      {/* Settings bar */}
      <div className="flex items-center justify-between bg-black/40 backdrop-blur-md p-4 rounded-t-xl border-b border-white/10">
         <div className="flex items-center gap-2 text-sm text-slate-300">
           <Camera className="w-4 h-4 text-emerald-400" />
           <span className="font-semibold text-white tracking-wide">{t('select_camera')}</span>
         </div>
         <div className="flex items-center gap-4">
           {/* Efficiency Mode Toggle */}
           <button 
             onClick={() => setIsEfficiencyMode(!isEfficiencyMode)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
               isEfficiencyMode 
                 ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' 
                 : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
             }`}
             title={isEfficiencyMode ? t('efficiency_mode_on') : t('efficiency_mode_off')}
           >
             <Users className="w-3.5 h-3.5" />
             {isEfficiencyMode ? 'TEJAMKOR REJIM' : 'YUQORI SIFAT'}
           </button>

           <select 
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={!isActive}
              className="bg-black/50 border border-white/20 rounded-lg text-slate-200 outline-none w-48 md:w-64 px-3 py-1.5 text-sm appearance-none focus:border-brand-500 transition-colors shadow-inner"
           >
             <option value="" disabled>{t('scanning_devices')}</option>
             {devices.map(device => (
               <option key={device.deviceId} value={device.deviceId} className="bg-slate-900 text-slate-200">
                 {device.label || `${t('camera')} ${device.deviceId.substring(0,5)}...`}
               </option>
             ))}
           </select>
         </div>
      </div>

      <div className="relative overflow-hidden w-full h-[500px] flex items-center justify-center bg-black rounded-b-xl border border-white/10 shadow-lg">
        {!isActive ? (
          <div className="flex flex-col items-center text-slate-500 z-10 p-8 text-center animate-fade-in-up">
            <VideoOff className="w-12 h-12 mb-4 opacity-50 text-slate-600" />
            <p className="text-lg font-medium text-slate-300 mb-1">{t('session_not_active')}</p>
            <p className="text-sm">{t('start_lesson_to_view')}</p>
          </div>
        ) : (
          <>
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg backdrop-blur-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('live').toUpperCase()}
            </div>
            {wsStatus === 'open' ? (
              <div className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {t('sync_active').toUpperCase()}
              </div>
            ) : wsStatus === 'connecting' ? (
              <div className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
                {t('connecting').toUpperCase()}
              </div>
            ) : (
              <div className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 bg-white rounded-full" />
                {t('sync_offline').toUpperCase()}
              </div>
            )}
          </div>
          {isGroupWork && (
            <div className="bg-blue-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg backdrop-blur-sm animate-bounce-subtle">
              <Users className="w-3 h-3" />
              {t('group_work_active').toUpperCase()}
            </div>
          )}
        </div>

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-30">
              <div className={`flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border shadow-lg ${
                authError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                  authError ? 'bg-red-500 animate-pulse' :
                  wsStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 
                  wsStatus === 'connecting' ? 'bg-amber-500 animate-bounce' : 
                  'bg-red-500'
                }`} />
                <span className="text-[11px] font-extrabold text-white uppercase tracking-[0.1em]">
                  {authError ? 'SESSYA TUGADI' :
                   wsStatus === 'open' ? t('sync_active') : 
                   wsStatus === 'connecting' ? t('connecting') : 
                   t('sync_offline')}
                </span>
              </div>
              
              {authError && (
                <button 
                  onClick={handleResetSession}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] font-bold transition-all shadow-lg border border-red-400/50 animate-bounce"
                >
                  LOGOUT VA QAYTA KIRISH
                </button>
              )}
            </div>

            {/* Local Video Element */}
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover transition-opacity duration-700 ${streamActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {!streamActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 bg-black/80">
                 <Camera className="w-10 h-10 mb-4 opacity-70 animate-pulse text-slate-500" />
                 <p className="text-sm font-medium tracking-wide">{t('waiting_for_camera')}</p>
               </div>
            )}
            
            {/* Render Bounding Boxes abstraction */}
            <div className="absolute inset-0 z-20 pointer-events-auto p-4 w-full h-full">
              {localFaces.map((face, index) => {
                const { xCenter, yCenter, width: w, height: h } = face.bbox
                // MediaPipe gives normalized coordinates [0.0, 1.0]. Center x, y and w, h
                const left = `${(xCenter - w / 2) * 100}%`
                const top = `${(yCenter - h / 2) * 100}%`
                const width = `${w * 100}%`
                const height = `${h * 100}%`
                
                const isTeacher = face.role === 'teacher'
                // Color based on engagement level
                let color = '#a855f7' // purple for teacher
                if (!isTeacher) {
                  if (face.score >= 80) color = '#10b981'      // green = active
                  else if (face.score >= 50) color = '#f59e0b' // amber = moderate
                  else color = '#ef4444'                        // red = passive/distracted
                }

                let displayName = isTeacher ? 'O\'QITUVCHI' : `Yuz #${face.id + 1}`
                if (!isTeacher && students.length > 0) {
                  const backendStudent = students.find((s: any) => s.temp_student_id === face.temp_student_id || s.id === face.id || (face.id === 0 && students.length === 1))
                  if (backendStudent) {
                     displayName = backendStudent.fullname || backendStudent.name || `ST #${backendStudent.temp_student_id}`
                  }
                }

                const stateEmoji = isTeacher ? '👨‍🏫' : face.score >= 80 ? '✅' : face.score >= 50 ? '⚠️' : '🔴'

                return (
                  <div 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualTeacherId(face.id === manualTeacherId ? null : face.id);
                    }}
                    className={`absolute border-[3px] transition-all duration-150 rounded-sm cursor-pointer group`}
                    style={{ left, top, width, height, borderColor: color, boxShadow: `0 0 12px ${color}66` }}
                  >
                    <div 
                      className="absolute -top-[26px] left-[-3px] px-2 py-1 text-[11px] text-white font-bold whitespace-nowrap rounded-sm shadow-md"
                      style={{ backgroundColor: `${color}dd`, borderColor: color }}
                    >
                      {stateEmoji} {isTeacher ? `${displayName}` : `${displayName}${face.behavior !== 'attentive' ? ` [${face.behavior.replace('_', ' ').toUpperCase()}]` : ''} • ${Math.round(face.score)}%`}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
