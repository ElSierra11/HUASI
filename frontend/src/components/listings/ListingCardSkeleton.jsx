/**
 * ListingCardSkeleton — Esqueleto de carga para PropertyCard
 *
 * Replica exactamente la estructura visual de PropertyCard:
 *  - Área de imagen con aspect-ratio [16/10] y badges de tipo/verificación
 *  - Bloque de título con icono pequeño
 *  - Línea de ubicación con icono de mapa
 *  - Pie de tarjeta con rating y capacidad
 *
 * Usa animación de pulso (@keyframes pulse de Tailwind) para evitar CLS.
 */
export function ListingCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando alojamiento…"
      className="bg-white dark:bg-slate-800/90 rounded-xl border border-ucc-border/50
                 dark:border-slate-700/60 shadow-sm overflow-hidden flex flex-col h-full
                 animate-pulse"
    >
      {/* ── Área de imagen (aspect-ratio 16/10 igual que PropertyCard) ─────── */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-300
                      dark:from-slate-700/70 dark:to-slate-700/40">
        {/* Badge: tipo de alojamiento (top-left) */}
        <div className="absolute top-3 left-3 h-6 w-24 rounded-full
                        bg-white/80 dark:bg-slate-900/80" />
        {/* Badge: verificado (top-right) */}
        <div className="absolute top-3 right-3 h-6 w-16 rounded-full
                        bg-emerald-200/60 dark:bg-emerald-800/30" />
        {/* Icono central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/5" />
        </div>
      </div>

      {/* ── Detalles ─────────────────────────────────────────────────────────── */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Título con icono pequeño */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex-shrink-0
                          bg-slate-200 dark:bg-slate-700" />
          <div className="h-[18px] w-3/4 rounded-md
                          bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Ubicación */}
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0
                          bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded-md
                          bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Pie: rating | capacidad */}
        <div className="mt-auto pt-3.5 border-t border-ucc-border/40
                        dark:border-slate-700/40 flex items-center justify-between">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-300/80 dark:bg-amber-500/40 flex-shrink-0" />
            <div className="h-3.5 w-12 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
          {/* Capacidad */}
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="h-3.5 w-16 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ListingGridSkeleton — Grid de esqueletos (para la página Home)
 *
 * @param {number} count  Número de tarjetas fantasma (default: 6)
 */
export function ListingGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ListingCardSkeleton key={idx} />
      ))}
    </div>
  );
}
