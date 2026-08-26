"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import imageCompression from "browser-image-compression";

interface ExtractionResult {
  document: {
    id: string;
    [key: string]: unknown;
  };
  extraction: {
    structuredData: unknown;
  };
}

interface DocumentUploaderProps {
  entityId: string;
  documentType: "LOAN" | "EXPENSE" | "INCOME" | "PURCHASE" | "VEHICLE" | "DOCUMENT";
  token: string;
  onExtractionComplete: (result: ExtractionResult) => void;
}

export function DocumentUploader({
  entityId,
  documentType,
  token,
  onExtractionComplete,
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      let fileToUpload = file;
      
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (error) {
          console.warn("Image compression failed, using original file", error);
        }
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("documentType", documentType);
      formData.append("entityId", entityId);

      const uploadRes = await fetch(`${apiBase}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed.");
      }
      const uploadedDoc = await uploadRes.json();

      setIsUploading(false);
      setIsExtracting(true);

      const extractRes = await fetch(`${apiBase}/documents/${uploadedDoc.id}/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!extractRes.ok) {
        const data = await extractRes.json().catch(() => ({}));
        throw new Error(data.error || "Extraction failed.");
      }
      const extractionResult = await extractRes.json();

      onExtractionComplete(extractionResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-medium text-white">
        Upload {documentType === "LOAN" ? "Loan Document" : "Receipt"}
      </h3>

      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/30"
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <Button
        onClick={handleUploadAndExtract}
        disabled={!file || isUploading || isExtracting}
        loading={isUploading || isExtracting}
      >
        {isUploading
          ? "Uploading..."
          : isExtracting
            ? "Extracting Data (AI)..."
            : "Upload & Extract"}
      </Button>
    </div>
  );
}
