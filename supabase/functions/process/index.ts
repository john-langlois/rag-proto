import { createClient } from "@supabase/supabase-js";
import {
  processMarkdown,
  processPDF,
  processDOCX,
  processExcel,
  processCSV,
} from "../_lib/file-processors.ts";

// These are automatically injected
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

Deno.serve(async (req) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({
        error: "Missing environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: `No authorization header passed` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  const { document_id } = await req.json();

  const { data: document } = await supabase
    .from("documents_with_storage_path")
    .select()
    .eq("id", document_id)
    .single();

  if (!document?.storage_object_path) {
    return new Response(
      JSON.stringify({ error: "Failed to find uploaded document" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data: file } = await supabase.storage
    .from("files")
    .download(document.storage_object_path);

  if (!file) {
    return new Response(
      JSON.stringify({ error: "Failed to download storage object" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let processedContent;
  const fileExtension = document.name.split(".").pop()?.toLowerCase();
  const fileSize = file.size;

  try {
    switch (fileExtension) {
      case "md":
      case "markdown":
        const markdownContent = await file.text();
        console.log(
          "Processing markdown content:",
          markdownContent.substring(0, 100) + "..."
        );
        processedContent = await processMarkdown(markdownContent);
        console.log(
          "Processed markdown sections:",
          processedContent.sections.length
        );
        await supabase
          .from("documents")
          .update({
            file_type: "markdown",
            file_size: fileSize,
            total_sections: processedContent.sections.length,
          })
          .eq("id", document_id);
        break;
      case "pdf":
        const pdfBuffer = await file.arrayBuffer();
        processedContent = await processPDF(pdfBuffer);
        await supabase
          .from("documents")
          .update({
            file_type: "pdf",
            file_size: fileSize,
            total_pages: processedContent.sections.length,
            total_sections: processedContent.sections.length,
          })
          .eq("id", document_id);
        break;
      case "docx":
        const docxBuffer = await file.arrayBuffer();
        processedContent = await processDOCX(docxBuffer);
        await supabase
          .from("documents")
          .update({
            file_type: "docx",
            file_size: fileSize,
            total_sections: processedContent.sections.length,
          })
          .eq("id", document_id);
        break;
      case "xlsx":
      case "xls":
        const excelBuffer = await file.arrayBuffer();
        processedContent = processExcel(excelBuffer);
        await supabase
          .from("documents")
          .update({
            file_type: "excel",
            file_size: fileSize,
            total_sections: processedContent.sections.length,
          })
          .eq("id", document_id);
        break;
      case "csv":
        const csvContent = await file.text();
        processedContent = processCSV(csvContent);
        await supabase
          .from("documents")
          .update({
            file_type: "csv",
            file_size: fileSize,
            total_sections: processedContent.sections.length,
          })
          .eq("id", document_id);
        break;
      default:
        // For unsupported file types, try to process as plain text
        const textContent = await file.text();
        processedContent = {
          sections: [
            {
              content: textContent,
            },
          ],
        };
        await supabase
          .from("documents")
          .update({
            file_type: fileExtension || "unknown",
            file_size: fileSize,
            total_sections: 1,
          })
          .eq("id", document_id);
    }

    const { error } = await supabase.from("document_sections").insert(
      processedContent.sections.map(({ content, heading, part, total }) => ({
        document_id,
        content,
        heading,
        part,
        total,
        page_number: heading?.match(/Page (\d+)/)?.[1],
      }))
    );

    if (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: "Failed to save document sections" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Saved ${processedContent.sections.length} sections for file '${document.name}'`
    );

    return new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing file:", {
      error: error.message,
      stack: error.stack,
      fileExtension,
      documentId: document_id,
      fileName: document.name,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to process document",
        details: error.message,
        fileType: fileExtension,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
