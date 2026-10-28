/** Extract a short provider error without returning the request or API key. */
export async function groqErrorMessage(response: Response, model: string) {
  const text = await response.text();
  let detail = "";
  try {
    const body = JSON.parse(text) as { error?: { message?: unknown; code?: unknown } };
    if (typeof body.error?.message === "string") detail = body.error.message;
    else if (typeof body.error?.code === "string") detail = body.error.code;
  } catch {
    // Provider may return plain text or an empty body.
  }
  detail = detail.replace(/\s+/g, " ").slice(0, 320);
  return detail
    ? `Groq (${model}) rejected the request (${response.status}): ${detail}`
    : `Groq (${model}) returned ${response.status} without an error message.`;
}
