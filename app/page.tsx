'use client';

import { useState } from 'react';
import * as path from 'path';

export default function Home() {
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.items)
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      
      setFiles(droppedFiles);
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
        
        const response = await fetch('/api/converter', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Check if only one file was uploaded
            if (files.length === 1) {
                a.download = `${path.parse(files[0].name).name}.webp`;
            } else {
                a.download = 'converted.zip';
            }

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            await fetch('/api/delete', {
                method: 'POST',
            });
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
