import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs'; 
import fsPromises from 'fs/promises';
import archiver from 'archiver';
import { exec } from 'child_process';
import util from 'util';

const cwebp = require('cwebp-bin');
const execPromise = util.promisify(exec);


const isVercel = process.env.VERCEL === '1'

export const POST = async (req: Request) => {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        // Используем временную директорию Vercel (/tmp)
        const baseDir = isVercel ? '/tmp' : path.join(process.cwd(), 'temp');
        const outputDir = path.join(baseDir, 'output');
        const uploadsDir = path.join(baseDir, 'uploads');

        // Создаем директории, если их нет
        await fsPromises.mkdir(outputDir, { recursive: true });
        await fsPromises.mkdir(uploadsDir, { recursive: true });

        // Сохраняем загруженные файлы во временную директорию
        for (const file of files) {
            const buffer = await file.arrayBuffer();
            const filePath = path.join(uploadsDir, file.name);
            await fsPromises.writeFile(filePath, Buffer.from(buffer));

            const outputFilePath = path.join(outputDir, `${path.parse(file.name).name}.webp`);
            await execPromise(`${cwebp} ${filePath} -o ${outputFilePath}`);
        }

        // Если только один файл, возвращаем его как ответ
        if (files.length === 1) {
            const singleFileName = path.join(outputDir, `${path.parse(files[0].name).name}.webp`);
            const singleFileBuffer = await fsPromises.readFile(singleFileName);
            return new NextResponse(singleFileBuffer, {
                headers: {
                    'Content-Type': 'image/webp',
                    'Content-Disposition': `attachment; filename="${path.parse(files[0].name).name}.webp"`,
                },
            });
        }

        // Архивируем файлы в zip
        const zipPath = path.join(outputDir, 'converted.zip');
        const archive = archiver('zip', {
            zlib: { level: 9 },
        });

        const zipStream = fs.createWriteStream(zipPath);
        archive.pipe(zipStream);

        for (const file of files) {
            const webpFilePath = path.join(outputDir, `${path.parse(file.name).name}.webp`);
            archive.file(webpFilePath, { name: path.basename(webpFilePath) });
        }

        await new Promise<void>((resolve, reject) => {
            zipStream.on('close', resolve);
            archive.on('end', resolve);
            archive.on('error', reject);
            archive.finalize();
        });

        // Отправляем архив как ответ
        const zipBuffer = await fsPromises.readFile(zipPath);

        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="converted.zip"',
            },
        });
    } catch (error) {
        console.error('Error during file processing:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
};
