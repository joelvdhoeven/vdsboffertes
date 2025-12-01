interface ProgressBarProps {
  progress: number;
  text?: string;
  show?: boolean;
}

export default function ProgressBar({ progress, text, show = true }: ProgressBarProps) {
  if (!show) return null;

  return (
    <div className="my-6">
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      {text && (
        <p className="text-center mt-2 text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
}

