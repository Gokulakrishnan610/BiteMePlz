import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Eye, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImageUpload: (imagePath: string) => void;
  currentImage?: string;
  className?: string;
  accept?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  currentImage,
  className = '',
  accept = 'image/*'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!supportedFormats.includes(file.type.toLowerCase())) {
      return `Unsupported file format. Please upload one of: ${supportedFormats.map(type => type.split('/')[1].toUpperCase()).join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size too large. Maximum allowed size is ${Math.round(maxFileSize / (1024 * 1024))}MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError, {
        duration: 5000,
        style: {
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#DC2626',
        },
        icon: '⚠️',
      });
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append('image', file);

      console.log('Uploading file:', file.name, file.size, file.type);
      console.log('Auth token:', localStorage.getItem('token'));

      // Use the authenticated endpoint
      const { data } = await api.post('/upload/single/', formData, {
        timeout: 30000, // 30 second timeout
      });

      

      onImageUpload(data.filePath);
      toast.success('Image uploaded successfully! 🎉', {
        style: {
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
        },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload image';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#DC2626',
        },
      });
      setPreview(currentImage || '');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview('');
    onImageUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 shadow-lg">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          </div>
          
          {!uploading && (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Remove image"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={handleClick}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                title="Change image"
              >
                <Upload size={16} />
              </button>
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-2"></div>
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-gray-600 font-medium">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-6">
              <div className="p-4 bg-blue-100 rounded-full mb-4">
                <ImageIcon size={32} className="text-blue-500" />
              </div>
              <p className="text-gray-700 text-center font-medium mb-2">
                {dragActive ? 'Drop your image here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-gray-500 text-sm text-center mb-3">
                Supports: JPEG, PNG, GIF, WebP
              </p>
              <p className="text-gray-400 text-xs text-center">
                Maximum file size: 5MB
              </p>
            </div>
          )}
          
          {dragActive && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl border-2 border-blue-500" />
          )}
        </div>
      )}

      {/* File format info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start">
          <AlertTriangle className="text-amber-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm">
            <p className="text-amber-800 font-medium mb-1">Supported formats:</p>
            <p className="text-amber-700">JPEG, PNG, GIF, WebP (max 5MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;