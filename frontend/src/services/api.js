// Example API service for Poligon
export async function getStatus() {
  const res = await fetch("/api/status");
  return res.json();
}
// Add more API calls as needed
