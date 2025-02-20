;; Sensor Data Contract

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))

;; Data Maps
(define-map sensor-readings
  { equipment-id: uint, timestamp: uint }
  {
    temperature: int,
    vibration: uint,
    pressure: uint
  }
)

(define-map equipment-thresholds
  { equipment-id: uint }
  {
    max-temperature: int,
    max-vibration: uint,
    max-pressure: uint
  }
)

;; Public Functions
(define-public (record-sensor-data (equipment-id uint) (temperature int) (vibration uint) (pressure uint))
  (begin
    (map-set sensor-readings
      { equipment-id: equipment-id, timestamp: block-height }
      {
        temperature: temperature,
        vibration: vibration,
        pressure: pressure
      }
    )
    (ok true)
  )
)

(define-public (set-thresholds (equipment-id uint) (max-temperature int) (max-vibration uint) (max-pressure uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (ok (map-set equipment-thresholds
      { equipment-id: equipment-id }
      {
        max-temperature: max-temperature,
        max-vibration: max-vibration,
        max-pressure: max-pressure
      }
    ))
  )
)

;; Read-only Functions
(define-read-only (get-latest-reading (equipment-id uint))
  (map-get? sensor-readings { equipment-id: equipment-id, timestamp: (- block-height u1) })
)

(define-read-only (get-thresholds (equipment-id uint))
  (map-get? equipment-thresholds { equipment-id: equipment-id })
)

(define-read-only (check-thresholds (equipment-id uint))
  (let
    ((reading (unwrap! (get-latest-reading equipment-id) (err false)))
     (thresholds (unwrap! (get-thresholds equipment-id) (err false))))
    (ok {
      temperature-exceeded: (> (get temperature reading) (get max-temperature thresholds)),
      vibration-exceeded: (> (get vibration reading) (get max-vibration thresholds)),
      pressure-exceeded: (> (get pressure reading) (get max-pressure thresholds))
    })
  )
)

