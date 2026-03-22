import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from "docx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function exportChatToDocx(messages: Message[]) {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Repository Explorer — Chat Export",
          bold: true,
          font: "Arial",
          size: 32,
        }),
      ],
    })
  );

  // Date
  children.push(
    new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `Exported on ${new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          font: "Arial",
          size: 20,
          color: "71717A",
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "EdTech Hub Evidence Library — AI-powered synthesis",
          font: "Arial",
          size: 20,
          color: "A1A1AA",
          italics: true,
        }),
      ],
    })
  );

  // Separator
  children.push(
    new Paragraph({
      border: {
        bottom: { style: "single" as any, size: 6, color: "CCCCCC", space: 1 },
      },
      spacing: { after: 300 },
      children: [],
    })
  );

  for (const msg of messages) {
    const isUser = msg.role === "user";

    // Role label
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: isUser ? "You" : "AI Assistant",
            bold: true,
            font: "Arial",
            size: 22,
            color: isUser ? "DC3900" : "11181C",
          }),
        ],
      })
    );

    // Message content — split by lines and handle basic markdown
    const lines = msg.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
        continue;
      }

      // Handle bullet points
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const text = isBullet ? trimmed.slice(2) : trimmed;

      // Parse bold markers
      const runs: TextRun[] = [];
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          runs.push(
            new TextRun({
              text: part.slice(2, -2),
              bold: true,
              font: "Arial",
              size: 22,
            })
          );
        } else if (part) {
          runs.push(
            new TextRun({
              text: part,
              font: "Arial",
              size: 22,
            })
          );
        }
      }

      if (isBullet) {
        // Prefix with bullet character via indent
        runs.unshift(
          new TextRun({
            text: "\u2022  ",
            font: "Arial",
            size: 22,
          })
        );
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            indent: { left: 360 },
            children: runs,
          })
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: runs,
          })
        );
      }
    }

    // Separator between messages
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `EdTech-Hub-Chat-Export-${date}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
