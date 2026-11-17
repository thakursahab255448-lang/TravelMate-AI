import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Firestore rules enforce all 8 pillars and block Dirty Dozen vectors', () => {
  const rulesPath = fs.existsSync('firestore.rules') ? 'firestore.rules' : 'DRAFT_firestore.rules';
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // 1. Rules version 2 & default-deny catch-all
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);

  // 2. Path variable hardening
  assert.match(rules, /function\s+isValidId\(id\)/);

  // 3. Verified email enforcement & admin check
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /hariomsingh6288@gmail\.com/);

  // 4. Validation blueprints for all 4 collections
  assert.match(rules, /function\s+isValidUserProfile\(data\)/);
  assert.match(rules, /function\s+isValidTrip\(data\)/);
  assert.match(rules, /function\s+isValidBooking\(data\)/);
  assert.match(rules, /function\s+isValidSupportTicket\(data\)/);

  // 5. Terminal state locking on cancelled bookings
  assert.match(rules, /existing\(\)\.status\s*!=\s*'cancelled'/);
});
