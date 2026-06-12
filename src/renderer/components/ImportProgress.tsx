import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Download, Pause, Play, CheckCircle, XCircle } from 'lucide-react';

interface ImportProgressData {
  jobId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  totalFetched: number;
  totalClassified: number;
  currentBatch: number;
  cursor: string | null;
  error?: string;
}

interface ImportProgressProps {
  onRefresh?: () => void;
}

const ImportProgress: React.FC<ImportProgressProps> = ({ onRefresh }) => {
  const intl = useIntl();
  const [progress, setProgress] = useState<ImportProgressData | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const checkActive = async () => {
      try {
        const active = await (window as any).api?.getActiveImport?.();
        if (active) setProgress(active);
      } catch {
        // not available
      }
    };
    checkActive();
  }, []);

  useEffect(() => {
    if (!progress || progress.status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const status = await (window as any).api?.getImportStatus?.(progress.jobId);
        if (status) {
          setProgress(status);
          if (status.status === 'completed' || status.status === 'failed') {
            onRefresh?.();
          }
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [progress?.jobId, progress?.status, onRefresh]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await (window as any).api?.startBatchImport?.();
      if (result?.jobId) {
        setProgress({
          jobId: result.jobId,
          status: 'running',
          totalFetched: 0,
          totalClassified: 0,
          currentBatch: 0,
          cursor: null,
        });
      }
    } catch (err) {
      console.error('Failed to start import:', err);
    } finally {
      setIsStarting(false);
    }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await (window as any).api?.pauseBatchImport?.();
      setProgress((prev) => prev ? { ...prev, status: 'paused' as const } : null);
    } catch (err) {
      console.error('Failed to pause import:', err);
    }
  }, []);

  if (!progress) {
    return (
      <button
        className="nav-panel-tab import-start-btn"
        onClick={handleStart}
        disabled={isStarting}
        title={intl.formatMessage({ id: 'startImport' })}
      >
        <Download size={18} />
      </button>
    );
  }

  const statusIcon = progress.status === 'running' ? (
    <Play size={14} className="import-spinning" />
  ) : progress.status === 'paused' ? (
    <Pause size={14} />
  ) : progress.status === 'completed' ? (
    <CheckCircle size={14} className="import-success" />
  ) : (
    <XCircle size={14} className="import-error" />
  );

  const statusText = progress.status === 'running'
    ? intl.formatMessage({ id: 'importing' })
    : progress.status === 'paused'
    ? intl.formatMessage({ id: 'importPaused' })
    : progress.status === 'completed'
    ? intl.formatMessage({ id: 'importComplete' })
    : intl.formatMessage({ id: 'importFailed' });

  return (
    <div className="import-progress">
      <div className="import-progress-header">
        {statusIcon}
        <span className="import-progress-status">{statusText}</span>
        {progress.status === 'running' && (
          <button
            className="import-control-btn"
            onClick={handlePause}
            title={intl.formatMessage({ id: 'pauseImport' })}
          >
            <Pause size={12} />
          </button>
        )}
        {progress.status === 'paused' && (
          <button
            className="import-control-btn"
            onClick={handleStart}
            title={intl.formatMessage({ id: 'resumeImport' })}
          >
            <Play size={12} />
          </button>
        )}
      </div>
      <div className="import-progress-stats">
        <span>{progress.totalFetched} {intl.formatMessage({ id: 'fetched' })}</span>
        <span>{progress.totalClassified} {intl.formatMessage({ id: 'classified' })}</span>
      </div>
      {progress.status === 'running' && (
        <div className="import-progress-bar">
          <div className="import-progress-bar-fill" />
        </div>
      )}
      {progress.error && (
        <div className="import-progress-error">{progress.error}</div>
      )}
    </div>
  );
};

export default ImportProgress;
