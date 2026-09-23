/**
 * Pure escalation streak rules (no DB).
 * Threshold default = 3 unanswered consecutive incoming messages.
 */

function countUnansweredStreak(messages: Array<{ side: 'incoming' | 'reply' | 'system' }>) {
  let streak = 0;
  for (const message of messages) {
    if (message.side === 'system') continue;
    if (message.side === 'reply') {
      streak = 0;
      continue;
    }
    streak += 1;
  }
  return streak;
}

function shouldEscalate(streak: number, threshold = 3) {
  return streak >= threshold;
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(!shouldEscalate(countUnansweredStreak([{ side: 'incoming' }])), '1 message should not escalate');
assert(!shouldEscalate(countUnansweredStreak([{ side: 'incoming' }, { side: 'incoming' }])), '2 messages should not escalate');
assert(
  shouldEscalate(countUnansweredStreak([{ side: 'incoming' }, { side: 'incoming' }, { side: 'incoming' }])),
  '3 messages should escalate'
);
assert(
  !shouldEscalate(
    countUnansweredStreak([{ side: 'incoming' }, { side: 'incoming' }, { side: 'incoming' }, { side: 'reply' }])
  ),
  'reply should clear escalation streak'
);

const withSystem = countUnansweredStreak([
  { side: 'incoming' },
  { side: 'incoming' },
  { side: 'system' },
  { side: 'incoming' }
]);
assert(withSystem === 3, 'system message ignored in streak count');
assert(shouldEscalate(withSystem), '3 incoming with ignored system should escalate');

console.log('message escalation rule tests passed');
