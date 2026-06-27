export function getDocsBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_DOCS_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8080"
  );
}
