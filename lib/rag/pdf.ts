import { PDFParse } from "pdf-parse";
import path from "path";
import { pathToFileURL } from "url";


const workerPath = path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
PDFParse.setWorker(pathToFileURL(workerPath).toString());



export const extractTextFromPDF = async (buffer: Buffer) => {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text;
};

export const extractTextFromURL = async (url: string) => {
  const parser = new PDFParse({ url });
  const result = await parser.getText();

  return result.text;
};

