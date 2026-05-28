# Fitness Class Schedule API

## Project Description

The Fitness Class Schedule API is a Spring Boot REST API used for managing fitness classes, instructors and rooms. The system allows administrators to register rooms and instructors, create fitness classes, schedule classes into weekly time slots, retrieve schedules, generate room usage reports, and soft delete scheduled classes. The API enforces scheduling rules to prevent conflicting room bookings.

---

# Running the Project Locally

Run the application using:

```bash
./mvnw spring-boot:run
```

---

# API Key

Every request must include the following header:

```text
X-API-Key: demo-key-2026
```

---

# Business Invariant

Two fitness classes cannot be scheduled in the same room at the same day and start time.

---

# Example CURL Commands

## 1. Create Room

```bash
curl -X POST http://localhost:8080/rooms \
-H "Content-Type: application/json" \
-H "X-API-Key: demo-key-2026" \
-d '{"name":"Room A"}'
```

---

## 2. Create Instructor

```bash
curl -X POST http://localhost:8080/instructors \
-H "Content-Type: application/json" \
-H "X-API-Key: demo-key-2026" \
-d '{"name":"John Smith"}'
```

---

## 3. Create Fitness Class

```bash
curl -X POST http://localhost:8080/classes \
-H "Content-Type: application/json" \
-H "X-API-Key: demo-key-2026" \
-d '{"name":"Yoga"}'
```

---

## 4. Schedule Fitness Class

```bash
curl -X POST http://localhost:8080/classes/1/schedule \
-H "Content-Type: application/json" \
-H "X-API-Key: demo-key-2026" \
-d '{
  "dayOfWeek":"MONDAY",
  "startTime":"18:00:00",
  "durationMinutes":60,
  "room":{"roomId":1},
  "instructor":{"instructorId":1}
}'
```

---

## 5. Soft Delete Scheduled Class

```bash
curl -X DELETE http://localhost:8080/schedule/1 \
-H "X-API-Key: demo-key-2026"
```

---

## 6. Reporting Endpoint — Busiest Rooms

```bash
curl -X GET http://localhost:8080/reports/busiest-rooms \
-H "X-API-Key: demo-key-2026"
```
