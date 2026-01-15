export function EditorSvgPatterns() {
  return (
    <pattern
      id="hatch"
      viewBox="0,0,128,128"
      width="128"
      height="128"
      patternUnits="userSpaceOnUse"
      patternTransform="scale(3)"
    >
      <g stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M0 0 L128 128" />
        <path d="M0 64 L64 128" />
        <path d="M64 0 L128 64" />

        <path d="M0 128 L128 0" />
        <path d="M0 64 L64 0" />
        <path d="M64 128 L128 64" />
      </g>
    </pattern>
  )
}
