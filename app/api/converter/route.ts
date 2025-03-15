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
    console.log('post');
    
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

    // Создание ZIP-архива
    const zipPath = 'output/converted.zip';
    const archive = archiver('zip');
    const output = await fs.open(zipPath, 'w');

    archive.pipe(output.createWriteStream());
    archive.directory(outputDir, false);
    await archive.finalize();

    // Отправка архива клиенту
    const zipBuffer = await fs.readFile(zipPath);
    return new NextResponse(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="converted.zip"',
        },
    });
};
