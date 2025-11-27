import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  SectionType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  TableOfContents,
  StyleLevel,
  NumberFormat,
} from "docx";
import { ProcessedFile } from "../types";

export const generateWordDocument = async (files: ProcessedFile[]): Promise<Blob> => {
  // Filter only completed files with content
  const validFiles = files.filter(f => f.processedContent);

  if (validFiles.length === 0) {
    throw new Error("No processed content to generate Word document");
  }

  const doc = new Document({
    features: {
      updateFields: true, // CRITICAL: Forces Word to update the TOC (page numbers and links) upon opening
    },
    sections: [
      // --- Section 1: Cover Page ---
      {
        properties: {
          type: SectionType.NEXT_PAGE,
        },
        children: [
          new Paragraph({
            text: "",
            spacing: { before: 4000 }, // Push down
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "新伟哥说国史频道",
                bold: true,
                size: 72, // 36pt
                font: "Microsoft YaHei",
              }),
            ],
          }),
          new Paragraph({
             text: "",
             spacing: { before: 4000 },
             children: [
                new TextRun({
                   text: new Date().toLocaleDateString('zh-CN'),
                   size: 24,
                   font: "Microsoft YaHei",
                })
             ],
             alignment: AlignmentType.CENTER
          }),
        ],
      },

      // --- Section 2: Table of Contents ---
      {
        properties: {
          type: SectionType.NEXT_PAGE,
        },
        children: [
          new Paragraph({
            text: "目录",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-5", // Capture levels 1-5 for robustness
          }),
          // Page Break ensures content starts on the next fresh page
          new Paragraph({
            children: [new PageBreak()],
          }),
        ],
      },

      // --- Section 3: Content (Starts Page 1) ---
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            pageNumbers: {
              start: 1, // Restart numbering at 1
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                ],
              }),
            ],
          }),
        },
        children: validFiles.flatMap((file, index) => {
          const paragraphs = [];

          // 1. Chapter Title (Heading 1 for TOC)
          paragraphs.push(
            new Paragraph({
              text: file.originalName.replace('.txt', ''),
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER, // Center chapter titles
              spacing: { before: 200, after: 300 },
            })
          );

          // 2. Content Paragraphs
          if (file.processedContent) {
            const lines = file.processedContent.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: line.trim(),
                        font: "SimSun", // Songti is standard for Chinese body text
                        size: 24, // 12pt
                      }),
                    ],
                    spacing: { line: 360, after: 200 }, // 1.5 spacing, space after para
                    indent: { firstLine: 480 }, // Indent first line ~2 chars
                  })
                );
              }
            });
          }

          // 3. Page Break after chapter (unless it's the very last file)
          // This ensures each chapter starts on a new page as requested.
          if (index < validFiles.length - 1) {
            paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
          }

          return paragraphs;
        }),
      },
    ],
  });

  return Packer.toBlob(doc);
};
