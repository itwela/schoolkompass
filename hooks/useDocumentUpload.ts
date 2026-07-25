import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type ContentType = "guide" | "flashcards" | "quiz";

export const useDocumentUpload = () => {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const processDocuments = useAction(api.documentIngestion.processDocuments);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = async (uri: string, mimeType: string): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const blob = await response.blob();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    if (!result.ok) throw new Error(`Upload failed: ${result.status}`);
    const { storageId } = await result.json();
    return storageId;
  };

  const pickAndUpload = async (
    contentType: ContentType,
    classId: string,
    title?: string
  ): Promise<{ id: string } | null> => {
    setError(null);
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (docResult.canceled || docResult.assets.length === 0) return null;

      setUploading(true);
      setCurrentStep("Uploading document...");
      const storageIds: Id<"_storage">[] = [];
      for (const asset of docResult.assets) {
        const mimeType = asset.mimeType ?? "application/octet-stream";
        storageIds.push(await uploadOne(asset.uri, mimeType));
      }

      setCurrentStep("Reading document...");
      const result = await processDocuments({ classId, storageIds, contentType, title });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
      return null;
    } finally {
      setUploading(false);
      setCurrentStep(null);
    }
  };

  const pickPhotoAndUpload = async (
    contentType: ContentType,
    classId: string,
    title?: string
  ): Promise<{ id: string } | null> => {
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to take a photo");
        return null;
      }
      const photoResult = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (photoResult.canceled || photoResult.assets.length === 0) return null;

      setUploading(true);
      setCurrentStep("Uploading photo...");
      const storageId = await uploadOne(photoResult.assets[0].uri, "image/jpeg");
      setCurrentStep("Reading document...");
      const result = await processDocuments({ classId, storageIds: [storageId], contentType, title });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process photo");
      return null;
    } finally {
      setUploading(false);
      setCurrentStep(null);
    }
  };

  return { pickAndUpload, pickPhotoAndUpload, uploading, currentStep, error };
};
