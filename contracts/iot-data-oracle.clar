;; vVolt IoT Data Oracle Contract
;; Clarity v2
;; Integrates real-time energy output from IoT sensors, verifies data authenticity, and updates asset metrics

;; Constants for error codes
(define-constant ERR-NOT-AUTHORIZED u200)
(define-constant ERR-INVALID-SENSOR u201)
(define-constant ERR-INVALID-ASSET u202)
(define-constant ERR-INVALID-DATA u203)
(define-constant ERR-PAUSED u204)
(define-constant ERR-ALREADY-REGISTERED u205)
(define-constant ERR-TIMESTAMP-TOO-OLD u206)
(define-constant ERR-INVALID-ENERGY-TYPE u207)

;; Constants for configuration
(define-constant MAX-SENSOR-DATA-AGE u3600) ;; 1 hour in seconds
(define-constant VALID-ENERGY-TYPES (list "solar" "wind")) ;; Supported energy types

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var oracle-operator principal tx-sender) ;; Authorized operator for IoT data submission

;; Data structures
(define-map sensors
  { sensor-id: (string-ascii 64) }
  { owner: principal, energy-type: (string-ascii 16), is-active: bool }
)

(define-map asset-metrics
  { asset-id: (string-ascii 64) }
  {
    total-energy-output: uint, ;; Total kWh produced
    last-update-timestamp: uint,
    last-energy-output: uint, ;; Last recorded kWh
    energy-type: (string-ascii 16)
  }
)

(define-map sensor-data
  { sensor-id: (string-ascii 64), timestamp: uint }
  {
    energy-output: uint, ;; kWh
    verified: bool,
    reported-by: principal
  }
)

;; Event logging for transparency
(define-data-var event-counter uint u0)

(define-map events
  { event-id: uint }
  {
    event-type: (string-ascii 32),
    sensor-id: (string-ascii 64),
    asset-id: (string-ascii 64),
    timestamp: uint,
    data: (optional uint) ;; Energy output or none for other events
  }
)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: is-oracle-operator
(define-private (is-oracle-operator)
  (is-eq tx-sender (var-get oracle-operator))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate energy type
(define-private (is-valid-energy-type (energy-type (string-ascii 16)))
  (is-some (index-of VALID-ENERGY-TYPES energy-type))
)

;; Log an event
(define-private (log-event (event-type (string-ascii 32)) (sensor-id (string-ascii 64)) (asset-id (string-ascii 64)) (data (optional uint)))
  (let ((event-id (var-get event-counter)))
    (map-set events { event-id: event-id }
      {
        event-type: event-type,
        sensor-id: sensor-id,
        asset-id: asset-id,
        timestamp: block-height,
        data: data
      }
    )
    (var-set event-counter (+ event-id u1))
    (ok event-id)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-ASSET))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set oracle operator
(define-public (set-oracle-operator (new-operator principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-operator 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-ASSET))
    (var-set oracle-operator new-operator)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Register a sensor
(define-public (register-sensor (sensor-id (string-ascii 64)) (owner principal) (energy-type (string-ascii 16)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-valid-energy-type energy-type) (err ERR-INVALID-ENERGY-TYPE))
    (asserts! (is-none (map-get? sensors { sensor-id: sensor-id })) (err ERR-ALREADY-REGISTERED))
    (map-set sensors { sensor-id: sensor-id }
      { owner: owner, energy-type: energy-type, is-active: true }
    )
    (try! (log-event "sensor-registered" sensor-id "" none))
    (ok true)
  )
)

;; Deactivate a sensor
(define-public (deactivate-sensor (sensor-id (string-ascii 64)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? sensors { sensor-id: sensor-id })) (err ERR-INVALID-SENSOR))
    (map-set sensors { sensor-id: sensor-id }
      (merge (unwrap-panic (map-get? sensors { sensor-id: sensor-id })) { is-active: false })
    )
    (try! (log-event "sensor-deactivated" sensor-id "" none))
    (ok true)
  )
)

;; Submit IoT sensor data
(define-public (submit-sensor-data (sensor-id (string-ascii 64)) (asset-id (string-ascii 64)) (energy-output uint) (timestamp uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-oracle-operator) (err ERR-NOT-AUTHORIZED))
    (asserts! (> energy-output u0) (err ERR-INVALID-DATA))
    (asserts! (<= (- block-height timestamp) MAX-SENSOR-DATA-AGE) (err ERR-TIMESTAMP-TOO-OLD))
    (let ((sensor (unwrap-panic (map-get? sensors { sensor-id: sensor-id }))))
      (asserts! (get is-active sensor) (err ERR-INVALID-SENSOR))
      (map-set sensor-data { sensor-id: sensor-id, timestamp: timestamp }
        {
          energy-output: energy-output,
          verified: true,
          reported-by: tx-sender
        }
      )
      (map-set asset-metrics { asset-id: asset-id }
        (merge
          (default-to
            { total-energy-output: u0, last-update-timestamp: u0, last-energy-output: u0, energy-type: (get energy-type sensor) }
            (map-get? asset-metrics { asset-id: asset-id })
          )
          {
            total-energy-output: (+ (default-to u0 (get total-energy-output (map-get? asset-metrics { asset-id: asset-id }))) energy-output),
            last-update-timestamp: timestamp,
            last-energy-output: energy-output
          }
        )
      )
      (try! (log-event "data-submitted" sensor-id asset-id (some energy-output)))
      (ok true)
    )
  )
)

;; Read-only: get sensor details
(define-read-only (get-sensor (sensor-id (string-ascii 64)))
  (ok (default-to { owner: 'SP000000000000000000002Q6VF78, energy-type: "", is-active: false } (map-get? sensors { sensor-id: sensor-id })))
)

;; Read-only: get asset metrics
(define-read-only (get-asset-metrics (asset-id (string-ascii 64)))
  (ok (default-to { total-energy-output: u0, last-update-timestamp: u0, last-energy-output: u0, energy-type: "" } (map-get? asset-metrics { asset-id: asset-id })))
)

;; Read-only: get sensor data
(define-read-only (get-sensor-data (sensor-id (string-ascii 64)) (timestamp uint))
  (ok (default-to { energy-output: u0, verified: false, reported-by: 'SP000000000000000000002Q6VF78 } (map-get? sensor-data { sensor-id: sensor-id, timestamp: timestamp })))
)

;; Read-only: get event
(define-read-only (get-event (event-id uint))
  (ok (default-to { event-type: "", sensor-id: "", asset-id: "", timestamp: u0, data: none } (map-get? events { event-id: event-id })))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: get oracle operator
(define-read-only (get-oracle-operator)
  (ok (var-get oracle-operator))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)