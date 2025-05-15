"use client";

import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Database } from "@/supabase/functions/_lib/database";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

export default function FilesPage() {
  const supabase = createClientComponentClient<Database>();
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const router = useRouter();

  const { data: documents, refetch: refetchDocuments } = useQuery(
    ["files"],
    async () => {
      const { data, error } = await supabase
        .from("documents_with_storage_path")
        .select();

      if (error) {
        toast({
          variant: "destructive",
          description: "Failed to fetch documents",
        });
        throw error;
      }

      return data;
    }
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (
        !file.type.match(
          /^(text\/markdown|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv)$/
        )
      ) {
        toast({
          variant: "destructive",
          description:
            "Please upload a markdown, PDF, DOCX, XLSX, or CSV file.",
        });
        return;
      }

      try {
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(`${crypto.randomUUID()}/${file.name}`, file);

        if (uploadError) {
          throw uploadError;
        }

        toast({
          description: "File uploaded successfully.",
        });

        refetchDocuments();
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          description: "Failed to upload file.",
        });
      }
    },
    [supabase, refetchDocuments]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
  });

  const downloadFile = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(document.storage_object_path, 60);

      if (error) {
        toast({
          variant: "destructive",
          description: "Failed to download file. Please try again.",
        });
        return;
      }

      window.location.href = data.signedUrl;
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to download file.",
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    switch (extension) {
      case "md":
      case "markdown":
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
            <path d="M35.7 42.4v19.8h5.9l8.9-11 8.9 11h5.9V42.4h-5.9v14.3l-8.9-11-8.9 11V42.4z" />
          </svg>
        );
      case "pdf":
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
            <text x="35" y="65" fontSize="20" fill="currentColor">
              PDF
            </text>
          </svg>
        );
      case "docx":
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
            <text x="30" y="65" fontSize="15" fill="currentColor">
              DOCX
            </text>
          </svg>
        );
      case "xlsx":
      case "xls":
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
            <text x="35" y="65" fontSize="15" fill="currentColor">
              XLS
            </text>
          </svg>
        );
      case "csv":
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
            <text x="35" y="65" fontSize="20" fill="currentColor">
              CSV
            </text>
          </svg>
        );
      default:
        return (
          <svg width="50px" height="50px" viewBox="0 0 100 100">
            <path d="M80.2 26.7L62.9 9.4c-.8-.8-1.8-1.2-2.9-1.2H25.7c-2.3 0-4.1 1.9-4.1 4.1v75.3c0 2.3 1.9 4.1 4.1 4.1h48.6c2.3 0 4.1-1.9 4.1-4.1V29.6c0-1.1-.4-2.1-1.2-2.9zM63.1 14l11.3 11.3H63.1V14zM25.7 87.7V12.4h31.3v16.9c0 1.1.9 2 2 2h16.9v56.4H25.7z" />
          </svg>
        );
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>

        <span className="mt-2 block text-sm font-semibold text-gray-900">
          Drop your file here, or click to browse
        </span>
        <span className="mt-2 block text-sm text-gray-500">
          Supports Markdown, PDF, DOCX, XLSX, and CSV files
        </span>
      </div>

      {documents && documents.length > 0 && (
        <div className="mt-8 divide-y divide-gray-200 border-t border-b border-gray-200">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => downloadFile(document)}
            >
              <div className="flex items-center">
                {getFileIcon(document.name)}
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {document.name}
                </span>
              </div>
              <Button variant="ghost" size="sm">
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
