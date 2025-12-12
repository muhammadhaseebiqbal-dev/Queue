import mammoth from 'mammoth';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Extracts text content from various file types.
 * @param {Object} file - { buffer, mimetype, originalname }
 * @returns {Promise<string>} - Extracted text content
 */
export async function parseFileContent(file) {
    if (!file || !file.buffer) return null;

    try {
        if (file.mimetype === 'application/pdf') {
            const data = await pdf(file.buffer);
            return data.text;
        }
        else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value;
        }
        else if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            return new Promise((resolve, reject) => {
                const results = [];
                const stream = Readable.from(file.buffer.toString());
                stream
                    .pipe(csv())
                    .on('data', (data) => results.push(JSON.stringify(data)))
                    .on('end', () => resolve(results.join('\n')))
                    .on('error', (err) => reject(err));
            });
        }
        else if (file.buffer) {
            // Default to plain text for other types (js, txt, md, etc.)
            return file.buffer.toString('utf-8');
        }
    } catch (error) {
        console.error(`[FileParser] Error parsing ${file.originalname}:`, error);
        return `Error reading file ${file.originalname}: ${error.message}`;
    }
    return null;
}
