import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

/**
 * Parses file buffer into text content based on mime type or extension
 * @param {Buffer} buffer - File buffer
 * @param {String} mimeType - Mime type of the file
 * @param {String} originalName - Original filename
 * @returns {Promise<String>} - Extracted text
 */
export const parseFile = async (buffer, mimeType, originalName) => {
    try {
        console.log(`[FileParser] Parsing ${originalName} (${mimeType})...`);

        if (!buffer || buffer.length === 0) {
            console.warn(`[FileParser] Empty buffer for file: ${originalName}`);
            return "";
        }

        // Handle PDF
        if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
            const data = await pdf(buffer);
            return data.text;
        }

        // Handle DOCX
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalName.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: buffer });
            return result.value;
        }

        // Handle Text Files (txt, md, js, code, etc.)
        if (mimeType.startsWith('text/') || originalName.match(/\.(txt|md|js|py|html|css|json)$/i)) {
            return buffer.toString('utf-8');
        }

        console.warn(`[FileParser] Unsupported file type: ${mimeType}`);
        return ""; // Unsupported type (maybe just store name?)
    } catch (error) {
        console.error(`[FileParser] Error parsing file ${originalName}:`, error);
        throw error;
    }
};
