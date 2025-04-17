import { fromMarkdown } from "https://esm.sh/mdast-util-from-markdown@2.0.0?target=deno&no-check";
import { toMarkdown } from "https://esm.sh/mdast-util-to-markdown@2.1.0?target=deno&no-check";
import { toString } from "https://esm.sh/mdast-util-to-string@4.0.0?target=deno&no-check";
import { u } from "https://esm.sh/unist-builder@4.0.0?target=deno&no-check";
import type {
  Root,
  RootContent,
} from "https://esm.sh/@types/mdast@4.0.0/index.d.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?target=deno";
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";
import mammoth from "https://esm.sh/mammoth@1.6.0?target=deno";

export type Section = {
  content: string;
  heading?: string;
  part?: number;
  total?: number;
};

export type ProcessedContent = {
  sections: Section[];
};

/**
 * Splits a `mdast` tree into multiple trees based on
 * a predicate function. Will include the splitting node
 * at the beginning of each tree.
 */
export function splitTreeBy(
  tree: Root,
  predicate: (node: RootContent) => boolean
) {
  return tree.children.reduce<Root[]>((trees, node) => {
    const [lastTree] = trees.slice(-1);

    if (!lastTree || predicate(node)) {
      const tree: Root = u("root", [node]);
      return trees.concat(tree);
    }

    lastTree.children.push(node);
    return trees;
  }, []);
}

/**
 * Process markdown content
 */
export async function processMarkdown(
  content: string,
  maxSectionLength = 2500
): Promise<ProcessedContent> {
  const mdTree = fromMarkdown(content);

  if (!mdTree) {
    return {
      sections: [],
    };
  }

  const sectionTrees = splitTreeBy(mdTree, (node) => node.type === "heading");

  const sections = sectionTrees.flatMap<Section>((tree) => {
    const [firstNode] = tree.children;
    const content = toMarkdown(tree);

    const heading =
      firstNode.type === "heading" ? toString(firstNode) : undefined;

    if (content.length > maxSectionLength) {
      const numberChunks = Math.ceil(content.length / maxSectionLength);
      const chunkSize = Math.ceil(content.length / numberChunks);
      const chunks = [];

      for (let i = 0; i < numberChunks; i++) {
        chunks.push(content.substring(i * chunkSize, (i + 1) * chunkSize));
      }

      return chunks.map((chunk, i) => ({
        content: chunk,
        heading,
        part: i + 1,
        total: numberChunks,
      }));
    }

    return {
      content,
      heading,
    };
  });

  return {
    sections,
  };
}

/**
 * Process PDF content
 */
export async function processPDF(
  buffer: ArrayBuffer,
  maxSectionLength = 2500
): Promise<ProcessedContent> {
  try {
    console.log("Starting PDF processing...");
    const { getDocument } = await resolvePDFJS();
    const data = new Uint8Array(buffer);

    console.log("Loading PDF document...");
    const pdf = await getDocument({
      data,
      useSystemFonts: true,
    }).promise;

    console.log(`Processing ${pdf.numPages} pages...`);
    const sections: Section[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const content = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .trim();

      if (content.length > maxSectionLength) {
        const numberChunks = Math.ceil(content.length / maxSectionLength);
        const chunkSize = Math.ceil(content.length / numberChunks);

        for (let j = 0; j < numberChunks; j++) {
          sections.push({
            content: content.substring(j * chunkSize, (j + 1) * chunkSize),
            heading: `Page ${i} - Part ${j + 1}`,
            part: j + 1,
            total: numberChunks,
          });
        }
      } else {
        sections.push({
          content,
          heading: `Page ${i}`,
        });
      }
    }

    console.log(
      `PDF processing complete. Created ${sections.length} sections.`
    );
    return { sections };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

/**
 * Process DOCX content
 */
export async function processDOCX(
  buffer: ArrayBuffer,
  maxSectionLength = 2500
): Promise<ProcessedContent> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const content = result.value;
  const sections: Section[] = [];

  if (content.length > maxSectionLength) {
    const numberChunks = Math.ceil(content.length / maxSectionLength);
    const chunkSize = Math.ceil(content.length / numberChunks);

    for (let i = 0; i < numberChunks; i++) {
      sections.push({
        content: content.substring(i * chunkSize, (i + 1) * chunkSize),
        part: i + 1,
        total: numberChunks,
      });
    }
  } else {
    sections.push({ content });
  }

  return { sections };
}

/**
 * Process Excel content
 */
export function processExcel(
  buffer: ArrayBuffer,
  maxSectionLength = 2500
): ProcessedContent {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sections: Section[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const content = JSON.stringify(jsonData, null, 2);

    if (content.length > maxSectionLength) {
      const numberChunks = Math.ceil(content.length / maxSectionLength);
      const chunkSize = Math.ceil(content.length / numberChunks);

      for (let i = 0; i < numberChunks; i++) {
        sections.push({
          content: content.substring(i * chunkSize, (i + 1) * chunkSize),
          heading: `Sheet: ${sheetName} - Part ${i + 1}`,
          part: i + 1,
          total: numberChunks,
        });
      }
    } else {
      sections.push({
        content,
        heading: `Sheet: ${sheetName}`,
      });
    }
  });

  return { sections };
}

/**
 * Process CSV content
 */
export function processCSV(
  content: string,
  maxSectionLength = 2500
): ProcessedContent {
  const sections: Section[] = [];

  if (content.length > maxSectionLength) {
    const numberChunks = Math.ceil(content.length / maxSectionLength);
    const chunkSize = Math.ceil(content.length / numberChunks);

    for (let i = 0; i < numberChunks; i++) {
      sections.push({
        content: content.substring(i * chunkSize, (i + 1) * chunkSize),
        part: i + 1,
        total: numberChunks,
      });
    }
  } else {
    sections.push({ content });
  }

  return { sections };
}
