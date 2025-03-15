import { NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Для работы с потоками
import fsPromises from 'fs/promises'; // Для асинхронных операций
import archiver from 'archiver';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const upload = multer({ dest: 'uploads/' });

export const POST = async (req: Request) => {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    const outputDir = 'output';
    await fsPromises.mkdir(outputDir, { recursive: true });

    // Сохранение и конвертация файлов
    for (const file of files) {
        const buffer = await file.arrayBuffer();
        const filePath = `uploads/${file.name}`;
        await fsPromises.writeFile(filePath, Buffer.from(buffer));

        const outputFilePath = `output/${path.parse(file.name).name}.webp`;
        await execPromise(`npx cwebp ${filePath} -o ${outputFilePath}`);
    }

    // Если только один файл, отправляем его напрямую
    if (files.length === 1) {
        const singleFileName = `output/${path.parse(files[0].name).name}.webp`;
        const singleFileBuffer = await fsPromises.readFile(singleFileName);
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
        zlib: { level: 9 }, // Sets the compression level.
    });

    // Пишем данные архива в поток
    const zipStream = fs.createWriteStream(zipPath); // Используем обычный fs для потоков
    archive.pipe(zipStream);

    // Добавляем файлы в архив
    for (const file of files) {
        const webpFilePath = `output/${path.parse(file.name).name}.webp`;
        // Добавляем каждый файл поочередно
        archive.file(webpFilePath, { name: path.basename(webpFilePath) });
    }

    // Финализируем архив
    await new Promise<void>((resolve, reject) => {
        archive.on('end', resolve);
        archive.on('error', reject);
        archive.finalize();
    });

    // Чтение созданного архива
    const zipBuffer = await fsPromises.readFile(zipPath);

    // Отправка архива клиенту
    return new NextResponse(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="converted.zip"',
        },
    });
};
