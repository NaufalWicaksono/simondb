export function StatusIndicator({ connected, latency, hideText = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`live-dot ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {!hideText && (
        <span className={`text-xs font-medium ${connected ? 'text-emerald-700' : 'text-red-600'}`}>
          {connected ? 'Terhubung' : 'Terputus'}
        </span>
      )}
      {connected && latency !== undefined && !hideText && (
        <span className="text-xs text-gray-400">({latency} ms)</span>
      )}
    </div>
  );
}

export default StatusIndicator;
