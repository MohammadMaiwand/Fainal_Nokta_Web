const CODE_39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '*': 'nwnnwnwnn'
};

export function LinearBarcode({ value, className = '' }: { value: string; className?: string }) {
  const encoded = `*${String(value || 'PENDING').toUpperCase().replace(/[^0-9A-Z-]/g, '-')}*`;
  const bars: Array<{ x: number; width: number }> = [];
  let x = 8;
  for (const char of encoded) {
    for (const [index, widthCode] of [...(CODE_39[char] || CODE_39['-'])].entries()) {
      const width = widthCode === 'w' ? 3 : 1;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += 1;
  }
  return (
    <svg className={`academy-linear-barcode ${className}`} viewBox={`0 0 ${x + 8} 38`} role="img" aria-label={`Barcode ${value}`}>
      {bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="1" width={bar.width} height="29" fill="#000" />)}
      <text
        x={(x + 8) / 2}
        y="37"
        textAnchor="middle"
        fontSize="7"
        direction="ltr"
        style={{ fontFamily: 'var(--app-font-family)' }}
      >
        {value}
      </text>
    </svg>
  );
}
