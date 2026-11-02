/** Vite's CSS-module import contract; the panel compiler inlines these styles at build time. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
