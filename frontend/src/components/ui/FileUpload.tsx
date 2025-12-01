import { Upload, File, Check } from 'lucide-react';
import { useRef, useState, DragEvent } from 'react';

interface FileUploadProps {
  accept?: string;
  onFileSelect: (file: File) => void;
  label?: string;
  hint?: string;
}

export default function FileUpload({
  accept = '.docx,.txt',
  onFileSelect,
  label = 'Upload Bestand',
  hint = '.docx of .txt bestanden',
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onFileSelect(selectedFile);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
        </label>
      )}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'}
          ${file ? 'border-green-500 bg-green-50' : 'hover:border-orange-500 hover:bg-orange-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
          }}
        />
        <div className="flex flex-col items-center">
          {file ? (
            <>
              <Check className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">Bestand geselecteerd</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="font-semibold text-gray-900">Klik om bestand te selecteren</p>
              <p className="text-xs text-gray-500 mt-1">{hint}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

