import "server-only";

export async function generateOpenAIText({ systemPrompt, userContent, maxTokens, responseFormat }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { error: "La clé OpenAI n’est pas configurée sur le serveur.", status: 503 };
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0.4,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { error: "La génération a pris trop de temps. Réessayez.", status: 504 };
    }
    return { error: "Impossible de joindre OpenAI pour générer le contenu.", status: 502 };
  }

  let result;
  try {
    result = await response.json();
  } catch {
    return { error: "OpenAI a renvoyé une réponse illisible.", status: 502 };
  }

  if (!response.ok) {
    if (response.status === 429) {
      return { error: "La limite de requêtes OpenAI est atteinte. Réessayez dans quelques instants.", status: 429 };
    }
    return { error: "OpenAI n’a pas pu générer le contenu. Vérifiez la configuration du service puis réessayez.", status: 502 };
  }

  const generatedContent = result?.choices?.[0]?.message?.content;
  const text = typeof generatedContent === "string" ? generatedContent.trim() : "";
  if (!text) {
    return { error: "OpenAI n’a pas renvoyé de contenu exploitable.", status: 502 };
  }

  return { text };
}

export async function generateOpenAISummary(options) {
  const result = await generateOpenAIText(options);
  if (result.error) return result;
  return { summary: result.text };
}
