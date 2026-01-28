// src/components/PhotoUpload.jsx
import { useState, useRef } from "react";
import { Upload, X, AlertCircle, Image as ImageIcon } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function PhotoUpload({ 
  photos = [], 
  onChange, 
  disabled = false,
  maxPhotos = MAX_PHOTOS,
  error 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} exceeds 5MB limit`);
    }
    
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      errors.push(`${file.name} is not a valid image format (JPG, PNG, or WEBP)`);
    }
    
    return errors;
  };

  const processFiles = (files) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    
    if (photos.length + fileArray.length > maxPhotos) {
      onChange(photos, [`Maximum ${maxPhotos} photos allowed`]);
      return;
    }

    const validFiles = [];
    const allErrors = [];

    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        allErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      // Simulate upload progress for each file
      const newPhotos = validFiles.map(file => {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        
        // Simulate upload progress
        setUploadProgress(prev => ({ ...prev, [id]: 0 }));
        
        // Simulate progressive upload
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setUploadProgress(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          } else {
            setUploadProgress(prev => ({ ...prev, [id]: Math.min(progress, 100) }));
          }
        }, 200);

        return {
          file,
          preview,
          id,
        };
      });

      onChange([...photos, ...newPhotos], allErrors.length > 0 ? allErrors : null);
    } else if (allErrors.length > 0) {
      onChange(photos, allErrors);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const handleRemovePhoto = (photoId) => {
    if (disabled) return;
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    onChange(updatedPhotos, null);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => {
            const progress = uploadProgress[photo.id];
            const isUploading = progress !== undefined;
            
            return (
              <div 
                key={photo.id} 
                className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
              >
                <img
                  src={photo.preview}
                  alt="Review photo"
                  className={`w-full h-full object-cover transition-opacity ${
                    isUploading ? 'opacity-50' : 'opacity-100'
                  }`}
                />
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                    <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                    <div className="mt-2 text-xs text-white font-medium">
                      {Math.round(progress)}%
                    </div>
                  </div>
                )}
                
                {/* Remove Button */}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    disabled={disabled}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Area */}
      {photos.length < maxPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all ${
            dragActive
              ? 'border-brand bg-brand/5 scale-[1.02]'
              : 'border-slate-300 bg-slate-50 hover:border-brand hover:bg-slate-100'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
            aria-label="Upload photos"
          />
          
          <div className={`flex items-center gap-2 transition-colors ${
            dragActive ? 'text-brand' : 'text-slate-600'
          }`}>
            {dragActive ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {dragActive ? 'Drop photos here' : 'Click to upload or drag and drop'}
            </span>
          </div>
          
          <p className="text-xs text-slate-500">
            JPG, PNG or WEBP (max 5MB each)
          </p>
          
          {dragActive && (
            <div className="absolute inset-0 rounded-lg bg-brand/5 pointer-events-none" />
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-xs text-rose-600 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            {Array.isArray(error) ? (
              <ul className="space-y-1">
                {error.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            ) : (
              <span>{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
