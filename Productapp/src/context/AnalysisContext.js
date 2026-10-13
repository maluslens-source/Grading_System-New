import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import api from "services/api";
import { DEMO_MODE } from "config/demoMode";
import { calculateLotWeights } from "utils/weights";

const AnalysisContext = createContext(null);

const emptyLot = {
  growerName: "",
  subGrowerName: "",
  lotNumber: "",
  cratesSampled: "",
  averageWeight: "",
};

function mockGrade(photoCount) {
  const n = Math.max(1, photoCount || 1);
  const total = 40 * n;
  const good = Math.round(total * 0.72);
  const bad = total - good;
  return {
    success: true,
    message: "Demo analysis (no API call)",
    image_count: n,
    failed_count: 0,
    max_images: 10,
    a_threshold: 0.45,
    summary: {
      total_apples: total,
      good_apples: good,
      bad_apples: bad,
      pct_A: Math.round((good / total) * 10000) / 100,
      pct_B: Math.round((bad / total) * 10000) / 100,
    },
    results: Array.from({ length: n }).map((_, i) => ({
      success: true,
      image_filename: `demo-tray-${i + 1}.jpg`,
      total_apples: 40,
      good_apples: Math.round(40 * 0.72),
      bad_apples: 40 - Math.round(40 * 0.72),
      pct_A: 72,
      pct_B: 28,
    })),
    errors: [],
  };
}

export function AnalysisProvider({ children }) {
  const [lot, setLot] = useState(emptyLot);
  const [photos, setPhotos] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateLot = useCallback((patch) => {
    setLot((prev) => ({ ...prev, ...patch }));
  }, []);

  const addPhotos = useCallback((fileList, maxCount) => {
    const incoming = Array.from(fileList || []);
    const limit = Math.max(1, Number(maxCount) || 10);
    setPhotos((prev) => {
      const room = Math.max(0, limit - prev.length);
      const slice = incoming.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...slice];
    });
  }, []);

  const removePhoto = useCallback((id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const resetAnalysis = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setLot(emptyLot);
    setResult(null);
    setError(null);
    setSubmitting(false);
  }, []);

  const submitAnalysis = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      let grade;
      if (DEMO_MODE) {
        // Wireframe: fake processing delay, no API
        await new Promise((r) => setTimeout(r, 1200));
        grade = mockGrade(photos.length);
      } else {
        const files = photos.map((p) => p.file);
        grade = await api.gradeImages(files);
      }
      const summary = grade.summary || {};
      const weights = calculateLotWeights({
        cratesSampled: lot.cratesSampled,
        averageWeight: lot.averageWeight,
        goodApples: summary.good_apples,
        badApples: summary.bad_apples,
      });
      const packed = {
        lot: { ...lot },
        grade,
        weights,
        createdAt: new Date().toISOString(),
        demo: DEMO_MODE,
      };
      setResult(packed);
      return packed;
    } catch (err) {
      setError(err.message || "Analysis failed");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [lot, photos]);

  const value = useMemo(
    () => ({
      lot,
      photos,
      result,
      error,
      submitting,
      updateLot,
      addPhotos,
      removePhoto,
      resetAnalysis,
      submitAnalysis,
    }),
    [
      lot,
      photos,
      result,
      error,
      submitting,
      updateLot,
      addPhotos,
      removePhoto,
      resetAnalysis,
      submitAnalysis,
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

AnalysisProvider.propTypes = { children: PropTypes.node.isRequired };

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
