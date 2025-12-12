import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function test() {
    console.log("--- Testing Standard pdf-parse@1.1.1 ---");
    const minimalPdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 21>>stream
BT /F1 12 Tf (Hello) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
0000000173 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
243
%%EOF`;

    try {
        console.log("Parsing buffer...");
        const data = await pdf(Buffer.from(minimalPdf));
        console.log("Text:", data.text); // Should be "Hello"
        console.log("Info:", data.info);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
