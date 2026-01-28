// src/modules/Owner/Listing/components/PhotosGridEdit.jsx
import { useState } from "react";
import { ImageOff, Upload, X, Star } from "lucide-react";
import api from "@/services/api";

export default function PhotosGridEdit({ item, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  const photos = Array.isArray(item?.photosMeta) ? item.photosMeta : [];
  const coverIndex = item?.coverIndex ?? 0;

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));

      const { data } = await api.post(`/owner/listings/${item.id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onUpdate({ photosMeta: data.photosMeta, coverIndex: data.coverIndex });
    } catch (err) {
      console.error(err);
      setUploadError(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index) => {
    if (!confirm("Remove this photo?")) return;

    try {
      const { data } = await api.delete(`/owner/listings/${item.id}/photos/${index}`);
      onUpdate({ photosMeta: data.photosMeta, coverIndex: data.coverIndex });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to remove photo");
    }
  };

  const handleSetCover = async (index) => {
    try {
      const { data } = await api.patch(`/owner/listings/${item.id}/photos/cover`, { coverIndex: index });
      onUpdate({ coverIndex: data.coverIndex });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to set cover");
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <label className="flex items-center justify-center h-24 rounded-md border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100">
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Click to upload photos (JPG/PNG)"}
        </div>
      </label>

      {uploadError && (
        <div className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded">
          {uploadError}
        </div>
      )}

      {/* Photos grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-video bg-slate-100 rounded overflow-hidden">
              <img
                src={photo.path || photo.url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Cover badge */}
              {idx === coverIndex && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 ring-1 ring-amber-200 rounded-full px-2 py-0.5 text-[11px]">
                    <Star className="w-3 h-3 fill-current" />
                    Cover
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1">
                {idx !== coverIndex && (
                  <button
                    type="button"
                    onClick={() => handleSetCover(idx)}
                    className="bg-white/90 hover:bg-white text-slate-700 ring-1 ring-slate-200 rounded px-2 py-1 text-[11px]"
                    title="Set as cover"
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="bg-white/90 hover:bg-white text-rose-600 ring-1 ring-slate-200 rounded p-1"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video bg-slate-50 ring-1 ring-slate-200 rounded grid place-items-center text-slate">
          <div className="text-center">
            <ImageOff className="h-5 w-5 mx-auto mb-2" />
            <p className="text-xs">No photos yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
