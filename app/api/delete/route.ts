import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const POST = async () => {
    try {
        const isVercel = process.env.VERCEL === '1';

        // Use temporary directories based on the environment
        const baseDir = isVercel ? '/tmp' : path.join(process.cwd(), 'temp');
        const outputDir = path.join(baseDir, 'output');
        const uploadsDir = path.join(baseDir, 'uploads');

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
