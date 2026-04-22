export default function LoadingSpinner({ text = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-950">
      <div className="w-10 h-10 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
      <p className="text-neutral-400 text-sm">{text}</p>
    </div>
  )
}
