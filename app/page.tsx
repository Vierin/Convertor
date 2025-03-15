'use client';

import { useState } from 'react';
import * as path from 'path';
import axios from 'axios';

type FileStatus = {
  file: File;
  progress: number;  // Прогресс загрузки
  isConverting: boolean;  // Статус конвертации
  isConverted: boolean;   // Статус завершенной конвертации
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);  // Статус каждого файла
  const [isLoading, setIsLoading] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    
    setFiles(droppedFiles);
    setFileStatuses(droppedFiles.map(file => ({
      file,
      progress: 0,
      isConverting: false,
      isConverted: false,
    })));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setIsLoading(true);

    // Обновляем статус загрузки файлов
    setFileStatuses(prevStatuses =>
      prevStatuses.map(status => ({
        ...status,
        progress: 0,
        isConverting: false,
        isConverted: false,
      }))
    );

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      // Используем axios для отправки формы и отслеживания прогресса
      const response = await axios.post('/api/converter', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: import('axios').AxiosProgressEvent) => {
          if (progressEvent.total) {
            setFileStatuses(prevStatuses =>
              prevStatuses.map(status =>
                status.progress < 100
                  ? { ...status, progress: (progressEvent.loaded / (progressEvent.total)) * 100 }
                  : status
              )
            );
          }
        }
      });

      if (response.status === 200) {
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        if (files.length === 1) {
          a.download = `${path.parse(files[0].name).name}.webp`;
        } else {
          a.download = 'converted.zip';
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error during conversion', error);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div
        className="w-96 h-48 border-2 border-dashed border-gray-400 flex items-center justify-center mb-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p>Перетащи сюда изображения (JPG/PNG)</p>
      </div>

      {/* Список файлов с прогрессом */}
      <div className="w-96 mb-4">
        {fileStatuses.map((status, index) => (
          <div key={index} className="mb-2">
            <div className="flex justify-between">
              <span>{status.file.name}</span>
              {status.isConverting && <span>Конвертируется...</span>}
            </div>
            <div className="w-full bg-gray-200 h-2">
              <div
                className="bg-blue-500 h-2"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleConvert}
        disabled={isLoading || !files.length}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {isLoading ? 'Конвертация...' : 'Конвертировать в WebP'}
      </button>
    </div>
  );
}
