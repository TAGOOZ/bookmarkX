import { execFile } from 'child_process';

function runCurl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('curl', args, (error, stdout, _stderr) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

export async function callGemini(
  prompt: string,
  options: { apiKey: string; model: string },
): Promise<string> {
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;

  const stdout = await runCurl([
    '-s',
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', payload,
    url,
  ]);

  const response = JSON.parse(stdout);

  if (response.error) {
    throw new Error(response.error.message || 'Gemini API error');
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid Gemini API response');
  }

  return text.replace(/```json\n?|\n?```/g, '').trim();
}
