import { NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const upload = multer({ dest: 'uploads/' });

export const POST = async (req: Request) => {

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    const outputDir = 'output';
    await fs.mkdir(outputDir, { recursive: true });

    // Сохранение и конвертация файлов
    for (const file of files) {
        const buffer = await file.arrayBuffer();
        const filePath = `uploads/${file.name}`;
        await fs.writeFile(filePath, Buffer.from(buffer));

        const outputFilePath = `output/${path.parse(file.name).name}.webp`;
        await execPromise(`npx cwebp ${filePath} -o ${outputFilePath}`);
    }
 
    
    // Если только один файл, отправляем его напрямую
    if (files.length === 1) {
        const singleFileName = `output/${path.parse(files[0].name).name}.webp`;
        const singleFileBuffer = await fs.readFile(singleFileName);
        return new NextResponse(singleFileBuffer, {
            headers: {
                'Content-Type': 'image/webp',
                'Content-Disposition': `attachment; filename="${path.parse(files[0].name).name}.webp"`,
            },
        });
    }

    // Создание ZIP-архива
    const zipPath = 'output/converted.zip';
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });
    const output = await fs.open(zipPath, 'w');

    const outputStream = output.createWriteStream();
    archive.pipe(outputStream);
    archive.directory(outputDir, false);

    await archive.finalize();
    await new Promise((resolve, reject) => {
        // outputStream.on('close', resolve);
        outputStream.on('end', resolve);
        outputStream.on('error', reject);
    });

    // Отправка архива клиенту
    const zipBuffer = await fs.readFile(zipPath);
    return new NextResponse(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="converted.zip"',
        },
    });
};
