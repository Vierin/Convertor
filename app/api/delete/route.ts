import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const POST = async () => {
    try {
        const outputDir = 'output';
        const uploadsDir = 'uploads';
        const filesOutput = await fs.readdir(outputDir);
        const filesUploads = await fs.readdir(uploadsDir);

        for (const file of filesOutput) {
            const filePath = path.join(outputDir, file);
            await fs.unlink(filePath);
        }

        for (const file of filesUploads) {
            const filePath = path.join(uploadsDir, file);
            await fs.unlink(filePath);
        }

        return new NextResponse('Files deleted successfully', { status: 200 });
    } catch (error) {
        console.error('Error deleting files:', error);
        return new NextResponse('Error deleting files', { status: 500 });
    }
};
