// Edge Function: friendship-summary
// Holds the Gemini API key (never exposed to the browser), wraps the herd's
// friendship facts in a prompt, and returns a short natural-language digest.
//
// Deploy:   supabase functions deploy friendship-summary
// Secret:   supabase secrets set GEMINI_API_KEY=your-key-here
//
// The client sends { facts: <object>, question?: <string> } and gets back
// { summary: <string> }.

import { GoogleGenAI } from 'npm:@google/genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Browser preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const { facts, question } = await req.json();

    const input = [
      "You are helping summarise friendship data for a guinea pig herd tracker called Hayley's Herd.",
      "Below is the herd's friendship data from roughly the last couple of months, as JSON.",
      '',
      'Write a short summary for the owner — aim for 2 or 3 short paragraphs, not a report.',
      'Lead with the story, not a leaderboard: who the heart of the herd is right now and the standout',
      'friendships. Then the most interesting outlier or two. Pick the few things worth knowing and leave',
      'the rest out — do NOT list every pig with its counts. A running list of names and numbers is the',
      'thing to avoid.',
      '',
      'Choosing what is interesting:',
      '- A pig that is seen constantly but has formed no friendships (high acquaintances, zero friends/close)',
      '  is worth naming with its numbers — that is a genuine anomaly. Otherwise summarise the quieter pigs',
      '  in a single sentence rather than enumerating them.',
      '- Recency: only say a pig has "gone quiet" if it actually has (daysSinceLastInteraction >= 4) AND it',
      '  normally has bonds (at least one friend or close friend). A gap of a day or two is normal for a herd',
      '  seen daily — do not flag it, and do not treat a still-high interaction count as quiet. If nobody',
      '  genuinely fits, skip recency entirely rather than reaching for a weak example.',
      '',
      'Tone: calm and matter-of-fact, like a friend noting what they observed. A little warmth is fine,',
      'but no hype, no exclamation marks, no greeting or sign-off, and do not address "herd lovers" or similar.',
      'Format: plain text only. No markdown — do not use asterisks, bold, headings, or bullet points.',
      'Be specific to the data and do not invent anything that is not present.',
      question ? `The owner specifically asked: ${question}` : '',
      '',
      'DATA:',
      JSON.stringify(facts),
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      // Free-tier model. Check current model IDs at
      // https://ai.google.dev/gemini-api/docs/models if this ever 404s.
      model: 'gemini-3.5-flash',
      input,
    });

    return new Response(JSON.stringify({ summary: interaction.output_text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
