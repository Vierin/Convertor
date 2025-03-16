import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs'; 
import fsPromises from 'fs/promises';
import archiver from 'archiver';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const POST = async (req: Request) => {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    const outputDir = 'output';
    await fsPromises.mkdir(outputDir, { recursive: true });

    for (const file of files) {
        const buffer = await file.arrayBuffer();
        const filePath = `uploads/${file.name}`;
        await fsPromises.writeFile(filePath, Buffer.from(buffer));

        const outputFilePath = `output/${path.parse(file.name).name}.webp`;
        await execPromise(`npx cwebp ${filePath} -o ${outputFilePath}`);
    }

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

    const zipPath = 'output/converted.zip';
    const archive = archiver('zip', {
        zlib: { level: 9 }, // Sets the compression level.
    });

    const zipStream = fs.createWriteStream(zipPath);
    archive.pipe(zipStream);

    for (const file of files) {
        const webpFilePath = `output/${path.parse(file.name).name}.webp`;
        archive.file(webpFilePath, { name: path.basename(webpFilePath) });
    }

    await new Promise<void>((resolve, reject) => {
        archive.on('end', resolve);
        archive.on('error', reject);
        archive.finalize();
    });

    const zipBuffer = await fsPromises.readFile(zipPath);

    return new NextResponse(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="converted.zip"',
        },
    });
};
