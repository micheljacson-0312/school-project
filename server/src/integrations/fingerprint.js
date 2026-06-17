// Fingerprint attendance integration — Phase 5 stub.
//
// Per the brief, build a pluggable interface; only wire to a real device
// once SDK/API access is confirmed. This stub:
//   - Accepts fingerprint "events" from a notional device (POST /event)
//   - Writes them to audit_logs so admins can see what would have happened
//   - Returns the canonical status of the integration
//
// To wire a real device: implement the `processEvent` function to call
// the device SDK and call `markTeacherAttendance` or
// `markStudentAttendance` based on the event payload.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { log } = require('../audit/log');

const router = express.Router();

const STATUS = {
  enabled: false,
  driver: 'stub',
  last_event_at: null,
  total_events: 0,
};

const eventSchema = z.object({
  device_id: z.string().min(1).max(128),
  kind:      z.enum(['teacher','student','unknown']),
  identifier: z.string().min(1).max(128),     // employee_code, admission_no, or user_id
  direction: z.enum(['in','out','unknown']),
  timestamp: z.string().optional(),
});

// Pluggable handler — override in production with a real device SDK.
async function processEvent(evt) {
  // Stub: log only. The real implementation should call the device
  // SDK to verify the fingerprint, then call markTeacherAttendance or
  // markStudentAttendance from the appropriate route module.
  await log({
    actorId: null,
    action:   'fingerprint.event',
    entityType: 'fingerprint_device',
    meta:     { device_id: evt.device_id, kind: evt.kind, identifier: evt.identifier, direction: evt.direction },
  });
  STATUS.last_event_at = new Date().toISOString();
  STATUS.total_events++;
}

router.post('/event', async (req, res, next) => {
  try {
    const p = eventSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    await processEvent(p.data);
    res.json({ ok: true, status: 'queued' });
  } catch (e) { next(e); }
});

router.get('/status', (req, res) => {
  res.json(STATUS);
});

module.exports = router;
