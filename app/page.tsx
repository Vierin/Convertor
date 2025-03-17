'use client';

import { useState } from 'react';
import * as path from 'path';
import axios from 'axios';

type FileStatus = {
  file: File;
  difference?: number;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    
    setFiles(droppedFiles);
    setFileStatuses(droppedFiles.map(file => ({
      file,
      difference: 0,
    })));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setIsLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      // Используем axios для отправки формы и отслеживания прогресса
      const response = await axios.post('/api/converter', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
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

        setFileStatuses(prevStatuses =>
          prevStatuses.map(status => ({
            ...status,
            difference: 100
          }))
        );
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
        <p>Drop your images here! (JPG/PNG)</p>
      </div>

      <div className="w-96 mb-4">
        <p className='mb-4'>List of images:</p>
        {fileStatuses.map((status, index) => (
          <div key={index} className="pb-2 border-b border-gray-400 flex justify-between">
              <span>{status.file.name}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleConvert}
        disabled={isLoading || !files.length}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 cursor-pointer"
      >
        {isLoading ? 'Converting...' : 'Convert to WebP'}
      </button>
    </div>
  );
}
