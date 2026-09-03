import React from 'react';

/**
 * Skeleton Loader para tarjetas de alojamiento en el grid del Explorador
 */
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-ucc-border/40 dark:border-slate-700/60 overflow-hidden shadow-sm animate-pulse">
      {/* Imagen simulada */}
      <div className="h-52 w-full bg-slate-200 dark:bg-slate-700/60 relative">
        <div className="absolute top-3 left-3 w-24 h-6 bg-slate-300 dark:bg-slate-600 rounded-full" />
        <div className="absolute top-3 right-3 w-16 h-6 bg-slate-300 dark:bg-slate-600 rounded-full" />
      </div>
      
      {/* Contenido de la tarjeta */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-md" />
        </div>
        
        <div className="h-5 w-3/4 bg-slate-300 dark:bg-slate-600 rounded-md" />
        
        <div className="flex items-center gap-2 pt-1">
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
          <div className="h-8 w-20 bg-slate-300 dark:bg-slate-600 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid de Skeletons para la página de inicio
 */
export function PropertyGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <PropertyCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/**
 * Skeleton Loader para el Detalle de Alojamiento
 */
export function PropertyDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
        </div>
      </div>

      {/* Galería Fotográfica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-80 md:h-96">
        <div className="md:col-span-2 bg-slate-200 dark:bg-slate-700 rounded-2xl h-full" />
        <div className="hidden md:grid grid-rows-2 gap-4 h-full">
          <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>

      {/* Columnas de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
            <div className="w-14 h-14 bg-slate-300 dark:bg-slate-600 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-slate-300 dark:bg-slate-600 rounded-md" />
              <div className="h-3.5 w-60 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-6 w-32 bg-slate-300 dark:bg-slate-600 rounded-md" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            <div className="h-6 w-3/4 bg-slate-300 dark:bg-slate-600 rounded-md" />
            <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-12 w-full bg-emerald-700/40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Loader para lista de Reservas
 */
export function ReservationCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-ucc-border/40 dark:border-slate-700/60 p-5 space-y-4 animate-pulse shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-300 dark:bg-slate-600 rounded-md" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 dark:border-slate-700/50">
        <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md" />
        <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-8 w-28 bg-slate-300 dark:bg-slate-600 rounded-lg" />
      </div>
    </div>
  );
}
